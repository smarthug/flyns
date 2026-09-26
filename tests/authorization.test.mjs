import test from 'node:test';
import assert from 'node:assert/strict';
import {permissionDenial} from '../src/ens/authorization.mjs';
import {callData} from '../src/ens/abi.mjs';
import {setterResource, RESOLVER_ROLE} from '../src/ens/protocol.mjs';
import {LiveENS} from '../src/ens/live.mjs';

const account = '0x' + '12'.repeat(20);
const expected = {resource: setterResource('flyns.model.sha256'), role: RESOLVER_ROLE.TEXT, account};
const errorData = ({resource, role, account}) => callData('EACUnauthorizedAccountRoles(uint256,uint256,address)', ['uint256','uint256','address'], [resource,role,account]);
test('Protected-write proof accepts the matching official EAC error inside wallet wrappers', () => {
  const proof = permissionDenial({data:{originalError:{data:errorData(expected)}}}, expected);
  assert.equal(proof.errorName, 'EACUnauthorizedAccountRoles');
  assert.equal(proof.account, account);
});
test('Generic reverts, code 3, network errors and malformed data are not permission evidence', () => {
  for (const error of [new Error('execution reverted'), {code:3}, {message:'network error'}, {data:'0x1234'}, {data:'0x'}, {data:{error:'execution reverted'}}]) {
    assert.equal(permissionDenial(error, expected), null);
  }
});
test('EAC errors for another key, role or account are not proof for this probe', () => {
  for (const wrong of [{resource:setterResource('flyns.checkpoint')}, {role:1n}, {account:'0x'+'34'.repeat(20)}]) {
    assert.equal(permissionDenial({data:errorData({...expected,...wrong})}, expected), null);
  }
});
test('Revocation checks effective rights and refuses to claim success when root authority remains (mock transport)', async () => {
  const rpc = {send:async()=>{}, read:async()=>[true]}, ens = new LiveENS(rpc, {});
  await assert.rejects(ens.revoke({resolver:'0x'+'56'.repeat(20)},account), /resolver-wide TEXT/);
});
