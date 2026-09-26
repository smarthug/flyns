import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {HTTPRPC} from '../src/ens/rpc.mjs';
import {ABI, labelId, setterResource, RESOLVER_ROLE, CHECKPOINT_KEY} from '../src/ens/protocol.mjs';
import {contractCall, decode} from '../src/ens/abi.mjs';

if (!process.env.SEPOLIA_RPC_URL) throw new Error('Set SEPOLIA_RPC_URL. This verifier never signs or sends transactions.');
const config = JSON.parse(await readFile('public/config.json', 'utf8'));
const rpc = new HTTPRPC(process.env.SEPOLIA_RPC_URL);
const chainId = Number(BigInt(await rpc.request('eth_chainId')));
assert.equal(chainId, 11155111, 'RPC must be Sepolia');
const block = await rpc.request('eth_blockNumber'), checks = [];
async function read(label, to, fn, args = []) {
  const data = contractCall(fn, args), raw = await rpc.request('eth_call', [{to, data}, block]);
  const decoded = decode(fn.out, raw);
  checks.push({label, to, data, raw, decoded});
  return decoded;
}
const [state] = await read('ETHRegistry.getState (unregistered probe label)', config.ethRegistry, ABI.state, [labelId('flyns-readonly-probe-20260927')]);
assert.equal(state[0], 0n, 'Probe label unexpectedly registered; choose a new unused label');
const [arg, resource, role] = await read('PermissionedResolverImpl.decodeSetter (checkpoint capability)', config.resolverImplementation, ABI.decodeSetter, [contractCall(ABI.setText, ['0x', CHECKPOINT_KEY, ''])]);
assert.equal(resource, setterResource(CHECKPOINT_KEY));
assert.equal(role, RESOLVER_ROLE.TEXT);
assert.equal(Buffer.from(arg.slice(2),'hex').toString('utf8'), CHECKPOINT_KEY);
const [root] = await read('UniversalResolver proxy ROOT_REGISTRY', config.universalResolver, ABI.rootRegistry);
assert.notEqual(await rpc.request('eth_getCode', [root, block]), '0x', 'Resolved root registry has no code');
const result = {
  checkedAt:new Date().toISOString(), chainId, blockNumber:Number(BigInt(block)), checks,
  limitations:'Read-only eth_call against deployed contracts. No wallet, transactions, registration, delegation, revocation or name-based checkpoint restoration was performed.',
};
const json = JSON.stringify(result, (_,v)=>typeof v==='bigint'?String(v):v, 2)+'\n';
await mkdir('artifacts', {recursive:true});
await writeFile('artifacts/sepolia-read-check.json', json);
console.log(json);
