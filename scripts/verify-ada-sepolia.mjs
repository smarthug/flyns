import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createPublicClient, http, decodeEventLog} from 'viem';
import {sepolia} from 'viem/chains';
import {HTTPRPC} from '../src/ens/rpc.mjs';
import {StatusENS, statusSetter, STATUS_KEY} from '../src/ens/status.mjs';
import {ABI, dnsName, setterResource, RESOLVER_ROLE} from '../src/ens/protocol.mjs';
import {RESOLVER_EVENTS} from '../src/ens/official-abis.mjs';
import {contractCall} from '../src/ens/abi.mjs';

const config = JSON.parse(await readFile('public/config.json', 'utf8'));
const target = JSON.parse(await readFile('public/ada-sepolia.json', 'utf8'));
const rpcURL = process.env.SEPOLIA_RPC_URL || target.rpcUrl;
const ens = new StatusENS(new HTTPRPC(rpcURL), config, target);
const client = createPublicClient({chain:sepolia, transport:http(rpcURL)});
assert.equal(await client.getChainId(), 11155111);
async function transaction(hash, from, input, eventName) {
  const [tx, receipt] = await Promise.all([client.getTransaction({hash}), client.getTransactionReceipt({hash})]);
  assert.equal(tx.chainId, 11155111);
  assert.equal(tx.from.toLowerCase(), from.toLowerCase());
  assert.equal(tx.to.toLowerCase(), target.resolver.toLowerCase());
  assert.equal(tx.value, 0n);
  assert.equal(tx.input, input);
  assert.equal(receipt.status, 'success');
  const events = receipt.logs.filter(log => log.address.toLowerCase() === target.resolver.toLowerCase()).flatMap(log => {
    try { const decoded = decodeEventLog({abi:RESOLVER_EVENTS, data:log.data, topics:log.topics}); return decoded.eventName === eventName ? [decoded] : []; }
    catch { return []; }
  });
  assert.equal(events.length, 1, `Expected exactly one ${eventName} event`);
  return {hash, chainId:tx.chainId, from:tx.from, to:tx.to, value:tx.value, input:tx.input, receipt, event:events[0]};
}
const grant = await transaction(target.grantTransaction, target.owner, contractCall(ABI.grantSetter, [statusSetter(), target.runtime]), 'EACRolesChanged');
assert.equal(grant.event.args.resource, setterResource(STATUS_KEY));
assert.equal(grant.event.args.account.toLowerCase(), target.runtime.toLowerCase());
assert.equal(grant.event.args.oldRoleBitmap, 0n);
assert.equal(grant.event.args.newRoleBitmap, RESOLVER_ROLE.TEXT);
const statusWrite = await transaction(target.statusTransaction, target.runtime, contractCall(ABI.setText, [dnsName(target.name), STATUS_KEY, 'exploring']), 'TextUpdated');
assert.equal(statusWrite.event.args.key, STATUS_KEY);
assert.equal(statusWrite.event.args.value, 'exploring');
const {state, probes} = await ens.verify();
assert.equal(state.permissions[STATUS_KEY], true);
assert.equal(state.records[STATUS_KEY], 'exploring');
assert.equal(state.records['flyns.model'], 'male-cns-v1');
assert.equal(state.records['agent.type'], 'drosophila');
const report = {
  schema:'flyns.ada-status-evidence.v1', checkedAt:new Date().toISOString(),
  verified:true, sourceWorkflow:'User-approved MetaMask transactions from the temporary Ada delegation page; independently reverified by the integrated repository code.',
  target, grant, statusWrite, state, probes,
  limitations:'Status grant and status write are mined transactions. Model denial is eth_call only. No checkpoint delegation, checkpoint restore, revocation, new identity registration, or public deployment is claimed.',
};
await mkdir('artifacts', {recursive:true});
await writeFile('artifacts/ada-sepolia.json', JSON.stringify(report, (_,v)=>typeof v==='bigint'?String(v):v, 2)+'\n');
console.log(JSON.stringify({verified:report.verified, blockNumber:state.blockNumber, records:state.records, probes, grant:grant.hash, statusWrite:statusWrite.hash}, null, 2));
