import {CHECKPOINT_KEY,normalizeName} from './protocol.mjs';
import {validatePointer} from '../sim/checkpoint.mjs';
export class MemoryStorage{constructor(){this.map=new Map();}getItem(k){return this.map.get(k)||null;}setItem(k,v){this.map.set(k,v);}removeItem(k){this.map.delete(k);}}
/** Explicit local rehearsal model, not an ENS deployment. It never emits transaction hashes. */
export class LocalENS{
  constructor(storage=new MemoryStorage()){this.storage=storage;this.mode='local';this.actor='owner';this.baseName='flyns.demo';this.key='flyns:local-registry:v1';}
  load(){try{return JSON.parse(this.storage.getItem(this.key)||'{"agents":{},"aliases":{}}');}catch{throw new Error('Corrupt local registry. Clear the rehearsal data to reset.');}}
  save(db){this.storage.setItem(this.key,JSON.stringify(db));}
  as(actor){if(!['owner','runtime'].includes(actor))throw new Error('Invalid rehearsal actor');this.actor=actor;return this;}
  requireOwner(){if(this.actor!=='owner')throw new Error('LOCAL DENIAL: only the custodian can manage identities');}
  async hatch(label,{agentId,modelHash}){
    this.requireOwner();label=normalizeName(label);if(label.includes('.'))throw new Error('One agent label required');
    const name=`${label}.${this.baseName}`,db=this.load();if(db.agents[name])throw new Error('Agent name already exists');
    db.agents[name]={name,agentId,modelHash,resolver:`local-resolver:${agentId}`,namespaceRegistry:`local-registry:${agentId}`,mode:'local',writer:false,records:{'flyns.model.sha256':modelHash}};
    this.save(db);return structuredClone(db.agents[name]);
  }
  async list(){return Object.values(this.load().agents);}
  async getAgent(input){const db=this.load(),name=db.aliases[normalizeName(input)]||normalizeName(input),a=db.agents[name];if(!a)throw new Error('Agent not found in local rehearsal registry');return structuredClone(a);}
  async publish(agent,pointer){
    validatePointer(pointer);const db=this.load(),a=db.agents[agent.name];if(!a)throw new Error('Unknown agent');
    if(this.actor!=='owner'&&!a.writer)throw new Error('LOCAL DENIAL: runtime checkpoint capability was not granted or has been revoked');
    a.records[CHECKPOINT_KEY]=JSON.stringify(pointer);this.save(db);return pointer;
  }
  async checkpoint(name){const a=await this.getAgent(name),value=a.records[CHECKPOINT_KEY];if(!value)throw new Error('No checkpoint has been published');return validatePointer(JSON.parse(value));}
  async grant(agent){this.requireOwner();const d=this.load();d.agents[agent.name].writer=true;this.save(d);return true;}
  async revoke(agent){this.requireOwner();const d=this.load();d.agents[agent.name].writer=false;this.save(d);return true;}
  async canWrite(agent){return this.actor==='owner'||(await this.getAgent(agent.name)).writer;}
  async probeForbidden(){if(this.actor==='owner')return true;throw new Error('LOCAL DENIAL: runtime cannot edit the protected model hash');}
  async alias(agent){this.requireOwner();const d=this.load(),name=`live.${agent.name}`;d.aliases[name]=agent.name;this.save(d);return name;}
}
