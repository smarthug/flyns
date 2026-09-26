import {ABI,ZERO,ROLE,RESOLVER_ROLE,REGISTRY_ROOT,OWNER_NAME_ROLES,RESOLVER_OWNER,CHECKPOINT_KEY,dnsName,namehash,labelId,setterResource,normalizeName} from './protocol.mjs';
import {contractCall,decode} from './abi.mjs';
import {toHex} from './keccak.mjs';
import {validatePointer} from '../sim/checkpoint.mjs';
/** All live writes go to official ENSv2 contracts, never to a mock look-alike.
 * Tested locally against RPC fixtures; a funded Sepolia wallet is required for E2E verification.
 */
export class LiveENS{
  constructor(rpc,config,{onResource=()=>{},storage=null}={}){this.rpc=rpc;this.config=config;this.onResource=onResource;this.storage=storage;this.mode='sepolia';this.baseName='';this.registry=null;}
  async verifyDeployment(){
    await this.rpc.guard();
    for(const k of ['factory','ethRegistry','resolverImplementation','registryImplementation','universalResolver']){
      if(!/^0x[0-9a-fA-F]{40}$/.test(this.config[k]))throw new Error(`Invalid configured address: ${k}`);
      const code=await this.rpc.code(this.config[k]);if(!code||code==='0x')throw new Error(`${k} has no code on Sepolia; re-check ENS deployment configuration`);
    }
  }
  async verifyProxy(address,implementation){
    const [actual]=await this.rpc.read(this.config.factory,ABI.verify,[address]);
    if(actual.toLowerCase()!==implementation.toLowerCase())throw new Error('Unexpected ENSv2 proxy implementation; do not continue');
  }
  async deploy(implementation,initializer,label){
    const bytes=crypto.getRandomValues(new Uint8Array(32)),salt=BigInt(toHex(bytes));
    const args=[implementation,salt,initializer];
    const [predicted]=decode(['address'],await this.rpc.simulate(this.config.factory,ABI.deploy,args));
    if(predicted===ZERO)throw new Error('Factory returned the zero address');
    await this.rpc.send(this.config.factory,ABI.deploy,args,label);
    await this.verifyProxy(predicted,implementation);this.onResource({label,address:predicted});return predicted;
  }
  async setup(baseName){
    this.baseName=normalizeName(baseName);
    if(!/^[a-z0-9-]+\.eth$/.test(this.baseName))throw new Error('Use an existing ENSv2 second-level .eth name that you control on Sepolia');
    await this.verifyDeployment();const label=this.baseName.split('.')[0];
    const [state]=await this.rpc.read(this.config.ethRegistry,ABI.state,[labelId(label)]);
    if(state[0]!==2n)throw new Error('Parent is not registered in ENSv2 on Sepolia. Register/migrate it in app.ens.dev first.');
    let [registry]=await this.rpc.read(this.config.ethRegistry,ABI.subregistry,[label]);
    if(registry!==ZERO){
      await this.verifyProxy(registry,this.config.registryImplementation);
      const [canRegister]=await this.rpc.read(registry,ABI.hasRootRoles,[ROLE.REGISTRAR,this.rpc.account]);
      if(!canRegister)throw new Error('This parent already has a registry you cannot manage. It will NOT be overwritten.');
    }else{
      const [allowed]=await this.rpc.read(this.config.ethRegistry,ABI.hasRoles,[labelId(label),ROLE.SET_SUBREGISTRY,this.rpc.account]);
      if(!allowed)throw new Error('Connected wallet cannot attach a subregistry to this parent');
      const key=`flyns:pending-root:${this.baseName}:${this.rpc.account}`;
      registry=this.storage?.getItem(key)||ZERO;
      if(registry!==ZERO)await this.verifyProxy(registry,this.config.registryImplementation);
      else{
        registry=await this.deploy(this.config.registryImplementation,contractCall(ABI.initRegistry,[[[this.rpc.account,REGISTRY_ROOT]]]),'Create colony UserRegistry');
        this.storage?.setItem(key,registry);
      }
      await this.rpc.send(registry,ABI.setParent,[this.config.ethRegistry,label],'Set colony canonical parent');
      await this.rpc.send(this.config.ethRegistry,ABI.setSubregistry,[labelId(label),registry],'Attach colony to ENS hierarchy');
      this.storage?.removeItem(key);
    }
    this.registry=registry;return {baseName:this.baseName,registry,parentExpiry:Number(state[1])};
  }
  async hatch(label,{agentId,modelHash}){
    if(!this.registry)throw new Error('Set up the ENSv2 colony first');
    label=normalizeName(label);if(label.includes('.'))throw new Error('Agent label must be one label');
    const name=`${label}.${this.baseName}`, key=`flyns:pending-agent:${name}:${this.rpc.account}`;
    let job;try{job=JSON.parse(this.storage?.getItem(key)||'null');}catch{throw new Error('Invalid pending deployment journal');}
    job=job||{agentId,modelHash};
    if(job.modelHash!==modelHash)throw new Error('A partial deployment exists for a different model. Inspect the journal before retrying.');
    const save=()=>this.storage?.setItem(key,JSON.stringify(job));save();
    const [current]=await this.rpc.read(this.registry,ABI.state,[labelId(label)]);
    if(current[0]===2n){
      const [resolver]=await this.rpc.read(this.registry,ABI.resolver,[label]);
      if(!job.resolver||resolver.toLowerCase()!==job.resolver.toLowerCase())throw new Error('Agent name is already registered');
    }
    if(!job.namespaceRegistry){
      job.namespaceRegistry=await this.deploy(this.config.registryImplementation,contractCall(ABI.initRegistry,[[[this.rpc.account,REGISTRY_ROOT]]]),`Create ${label} agent namespace`);save();
    }else await this.verifyProxy(job.namespaceRegistry,this.config.registryImplementation);
    if(!job.resolver){
      const records={
        'description':'Connectome-structured experimental agent; not a biologically validated whole-brain simulation',
        'flyns.agentId':job.agentId,'flyns.name':name,'flyns.model.sha256':modelHash,
        'flyns.engine':'flyns-rate-v1','flyns.namespace':job.namespaceRegistry,
        'flyns.source':'MaleCNS v1.0 / see application data provenance',
      };
      const calls=Object.entries(records).map(([k,v])=>contractCall(ABI.setText,[dnsName(name),k,v]));
      calls.push(contractCall(ABI.setAddress,[dnsName(name),60n,this.rpc.account]));
      job.resolver=await this.deploy(this.config.resolverImplementation,contractCall(ABI.initResolver,[[[this.rpc.account,RESOLVER_OWNER]],calls]),`Create isolated ${label} Permissioned Resolver`);save();
    }else await this.verifyProxy(job.resolver,this.config.resolverImplementation);
    if(current[0]!==2n){
      const [parent]=await this.rpc.read(this.config.ethRegistry,ABI.state,[labelId(this.baseName.split('.')[0])]);
      const block=await this.rpc.request('eth_getBlockByNumber',['latest',false]);const now=Number(BigInt(block.timestamp));
      const expiry=Math.min(now+86400*30,Number(parent[1]));if(expiry<=now+600)throw new Error('Renew the parent first; it expires too soon');
      await this.rpc.send(this.registry,ABI.register,[label,this.rpc.account,job.namespaceRegistry,job.resolver,OWNER_NAME_ROLES,BigInt(expiry)],`Register ${name}`);
    }
    await this.rpc.send(job.namespaceRegistry,ABI.setParent,[this.registry,label],`Link ${label} namespace parent`);
    const result=await this.getAgent(name);if(result.agentId!==job.agentId)throw new Error('Universal resolution did not return the registered identity');
    this.storage?.removeItem(key);return result;
  }
  async profile(name,key){
    name=normalizeName(name);
    const encoded=contractCall(ABI.textProfile,[namehash(name),key]);
    try{
      const [data,resolver]=await this.rpc.read(this.config.universalResolver,ABI.resolve,[dnsName(name),encoded]);
      return {value:decode(['string'],data)[0],resolver};
    }catch(e){throw new Error(`ENSv2 universal resolution failed: ${e.message}. This client supports onchain FlyNS records, not external CCIP gateways.`);}
  }
  async getAgent(input){
    const given=normalizeName(input), identity=await this.profile(given,'flyns.agentId');
    if(!identity.value)throw new Error('No FlyNS identity record exists for this name');
    const named=await this.profile(given,'flyns.name'),name=normalizeName(named.value);
    const canonical=await this.profile(name,'flyns.agentId');
    if(canonical.value!==identity.value||canonical.resolver.toLowerCase()!==identity.resolver.toLowerCase())throw new Error('Alias does not point to the canonical agent resolver');
    await this.verifyProxy(canonical.resolver,this.config.resolverImplementation);
    const hash=await this.profile(name,'flyns.model.sha256'),ns=await this.profile(name,'flyns.namespace');
    return {name,requestedName:given,agentId:identity.value,modelHash:hash.value,resolver:canonical.resolver,namespaceRegistry:ns.value,mode:this.mode};
  }
  async checkpoint(name){const {value}=await this.profile(name,CHECKPOINT_KEY);if(!value)throw new Error('No checkpoint has been published');return validatePointer(JSON.parse(value));}
  async publish(agent,pointer){
    validatePointer(pointer);
    await this.rpc.send(agent.resolver,ABI.setText,[dnsName(agent.name),CHECKPOINT_KEY,JSON.stringify(pointer)],'Publish checkpoint pointer');
    const confirmed=await this.checkpoint(agent.name);
    if(confirmed.sha256!==pointer.sha256)throw new Error('A concurrent writer replaced the checkpoint. Read the current head before retrying.');
    return confirmed;
  }
  async grant(agent,account){
    const setter=contractCall(ABI.setText,['0x',CHECKPOINT_KEY,'']);
    await this.rpc.send(agent.resolver,ABI.grantSetter,[setter,account],'Delegate checkpoint key only');
    return this.canWrite(agent,account);
  }
  async revoke(agent,account){
    await this.rpc.send(agent.resolver,ABI.revoke,[setterResource(CHECKPOINT_KEY),RESOLVER_ROLE.TEXT,account],'Revoke checkpoint writer');
    const stillAllowed=await this.canWrite(agent,account);
    if(stillAllowed)throw new Error('Key role was revoked, but this account still has a resolver-wide TEXT role. Do not use an owner/admin as the runtime wallet.');
    return true;
  }
  async canWrite(agent,account=this.rpc.account){const [ok]=await this.rpc.read(agent.resolver,ABI.hasRoles,[setterResource(CHECKPOINT_KEY),RESOLVER_ROLE.TEXT,account]);return ok;}
  async probeForbidden(agent){
    // Intentionally eth_call only: never corrupt the model or burn test ETH in a forced revert.
    await this.rpc.simulate(agent.resolver,ABI.setText,[dnsName(agent.name),'flyns.model.sha256','unauthorized-probe']);
    return true; // Allowed means you are still connected as an administrator. Not a security success.
  }
  async alias(agent){
    const name=`live.${agent.name}`;
    await this.rpc.send(agent.resolver,ABI.link,[dnsName(name),namehash(agent.name)],'Create wildcard record alias');
    const canonical=await this.profile(agent.name,'flyns.agentId'),alias=await this.profile(name,'flyns.agentId');
    if(alias.value!==canonical.value||alias.resolver!==canonical.resolver)throw new Error('Alias verification failed');return name;
  }
}
