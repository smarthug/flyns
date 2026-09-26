import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeFunctionData} from 'viem';
import {StatusENS, STATUS_KEY, statusSetter} from '../src/ens/status.mjs';
import {WalletRPC} from '../src/ens/rpc.mjs';
import {ABI, dnsName, setterResource, RESOLVER_ROLE} from '../src/ens/protocol.mjs';
import {encode, decode, callData} from '../src/ens/abi.mjs';

const config = JSON.parse(readFileSync(new URL('../public/config.json', import.meta.url)));
const target = JSON.parse(readFileSync(new URL('../public/ada-sepolia.json', import.meta.url)));
const fullABI = Object.values(ABI).flatMap(fn => fn.abi);
function fixture(options = {}) {
  const state = {granted:true, root:0n, statusRoles:16n, resolver:target.resolver, implementation:config.resolverImplementation, ...options};
  const records = {[STATUS_KEY]:'exploring', 'flyns.model':'male-cns-v1', 'agent.type':'drosophila'};
  const calls = [], sends = [];
  const denial = key => Object.assign(new Error('execution reverted'), {data:callData('EACUnauthorizedAccountRoles(uint256,uint256,address)', ['uint256','uint256','address'], [setterResource(key), RESOLVER_ROLE.TEXT, target.runtime])});
  const rpc = {request:async(method, params = []) => {
    calls.push({method, params});
    if (method === 'eth_chainId') return state.wrongChain ? '0x1' : '0xaa36a7';
    if (method === 'eth_blockNumber') return '0x123';
    if (method === 'eth_getCode') return '0x1234';
    assert.equal(method, 'eth_call'); assert.equal(params[1], '0x123', 'All reads/probes must use the same recorded block');
    const {functionName:name, args} = decodeFunctionData({abi:fullABI, data:params[0].data});
    if (name === 'verifyContract') return encode(['address'], [state.implementation]);
    if (name === 'decodeSetter') return encode(ABI.decodeSetter.out, ['0x666c796e732e737461747573', setterResource(STATUS_KEY), state.wrongRole ? 1n : 16n]);
    if (name === 'resolve') {
      const {args:[,key]} = decodeFunctionData({abi:ABI.textProfile.abi, data:args[1]});
      assert.equal(args[0], dnsName(target.name));
      return encode(ABI.resolve.out, [encode(['string'], [records[key] || '']), state.resolver]);
    }
    if (name === 'roles') return encode(['uint256'], [args[0] === 0n ? state.root : state.statusRoles]);
    if (name === 'hasRoles') return encode(['bool'], [args[2].toLowerCase() === target.owner.toLowerCase() ? state.ownerAdmin !== false : args[0] === setterResource(STATUS_KEY) ? state.granted : args[0] === setterResource(state.extraKey || 'unused')]);
    if (name === 'setText') {
      assert.equal(params[0].from, target.runtime);
      if (state.probeError) throw state.probeError;
      if (args[1] === STATUS_KEY && state.granted) return '0x';
      throw denial(args[1]);
    }
    throw new Error('Unexpected method '+name);
  }};
  const wallet = account => ({account, guard:async()=>{if(state.walletChanged)throw new Error('Wallet account changed');}, send:async(to, fn, args)=>{
    sends.push({to,fn,args});
    if(fn===ABI.grantSetter){state.granted=true;state.statusRoles=16n;}
    else if(fn===ABI.setText){records[args[1]]=args[2];if(state.concurrentModelChange)records['flyns.model']='changed';}
    else throw new Error('Unexpected write');
    return {status:'0x1',transactionHash:'0x'+'aa'.repeat(32)};
  }});
  return {ens:new StatusENS(rpc,config,target),state,records,calls,sends,wallet,denial};
}

test('Existing Ada reads resolve through the verified proxy at a single Sepolia block (mock RPC)', async()=>{
  const {ens}=fixture(); const result=await ens.verify();
  assert.equal(result.state.records[STATUS_KEY],'exploring');
  assert.equal(result.state.records['flyns.model.sha256'],'');
  assert.deepEqual(result.probes.map(p=>p.allowed),[true,false]);
  assert.equal(result.probes[1].denial.errorName,'EACUnauthorizedAccountRoles');
});
test('Wrong chain, redirected name, changed implementation and wrong decoded key role stop reads', async()=>{
  for(const options of [{wrongChain:true},{resolver:target.owner},{implementation:target.owner},{wrongRole:true}]) await assert.rejects(fixture(options).ens.snapshot());
  assert.throws(()=>new StatusENS({},config,{...target,chainId:1}),/Sepolia/);
});
test('Root roles, status admin and protected-key access block status-only claims and writes', async()=>{
  for(const options of [{root:16n},{statusRoles:16n|(16n<<128n)},{extraKey:'flyns.checkpoint'},{extraKey:'flyns.model'},{extraKey:'agent.type'}]) {
    const f=fixture(options); await assert.rejects(f.ens.verify());
    await assert.rejects(f.ens.update(f.wallet(target.runtime),'resting')); assert.equal(f.sends.length,0);
  }
});
test('Permission probes never accept generic network/revert failures as denial', async()=>{
  for(const probeError of [new Error('network unavailable'),Object.assign(new Error('execution reverted'),{code:3,data:'0x1234'})]) await assert.rejects(fixture({probeError}).ens.verify(),/inconclusive/);
});
test('Status grant encodes exactly one text key for the expected runtime; repeat grants skip signing', async()=>{
  const f=fixture({granted:false,statusRoles:0n}); await f.ens.grant(f.wallet(target.owner));
  assert.equal(f.sends.length,1); assert.equal(f.sends[0].to,target.resolver);assert.equal(f.sends[0].fn,ABI.grantSetter);
  assert.equal(f.sends[0].args[1],target.runtime);
  assert.deepEqual(decodeFunctionData({abi:ABI.setText.abi,data:f.sends[0].args[0]}).args,['0x',STATUS_KEY,'']);
  assert.equal(f.sends[0].args[0],statusSetter());
  assert.equal((await f.ens.grant(f.wallet(target.owner))).skipped,true);assert.equal(f.sends.length,1);
});
test('Only the configured owner can grant, and it must retain the admin role', async()=>{
  const f=fixture({granted:false,statusRoles:0n});await assert.rejects(f.ens.grant(f.wallet(target.runtime)),/required account/);
  f.state.ownerAdmin=false;await assert.rejects(f.ens.grant(f.wallet(target.owner)),/cannot delegate/);assert.equal(f.sends.length,0);
});
test('Only the runtime can update status; identical values do not create duplicate transactions', async()=>{
  const f=fixture();await assert.rejects(f.ens.update(f.wallet(target.owner),'resting'),/required account/);
  assert.equal((await f.ens.update(f.wallet(target.runtime),'exploring')).skipped,true);assert.equal(f.sends.length,0);
  await f.ens.update(f.wallet(target.runtime),'resting');assert.equal(f.sends.length,1);
  assert.deepEqual(f.sends[0].args,[dnsName(target.name),STATUS_KEY,'resting']);assert.equal(f.records['flyns.model'],'male-cns-v1');
});
test('Revoked access, wallet changes, invalid status and concurrent model changes are surfaced', async()=>{
  for(const options of [{granted:false,statusRoles:0n},{walletChanged:true}]) {
    const f=fixture(options);await assert.rejects(f.ens.update(f.wallet(target.runtime),'resting'));assert.equal(f.sends.length,0);
  }
  const f=fixture();for(const value of ['', 'x'.repeat(65),'<script>',null])await assert.rejects(f.ens.update(f.wallet(target.runtime),value),/short lowercase status/);
  assert.equal(f.sends.length,0);
  const changed=fixture({concurrentModelChange:true});await assert.rejects(changed.ens.update(changed.wallet(target.runtime),'resting'),/protected record changed/);
});
test('Expected-account connection reopens wallet selection and rejects the wrong account', async()=>{
  let selected=target.owner;const methods=[];
  const rpc=new WalletRPC({request:async({method})=>{
    methods.push(method);if(method==='wallet_requestPermissions'){selected=target.runtime;return [];}
    if(method==='eth_chainId')return '0xaa36a7';return [selected];
  }});
  assert.equal(await rpc.connect({expectedAccount:target.runtime}),target.runtime.toLowerCase());
  assert.ok(methods.includes('wallet_requestPermissions'));
  const wrong=new WalletRPC({request:async()=>[target.owner]});await assert.rejects(wrong.connect({expectedAccount:target.runtime}),/Select only/);
});
