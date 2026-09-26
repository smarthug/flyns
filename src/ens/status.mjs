import {ABI, RESOLVER_ROLE, dnsName, namehash, setterResource, admin} from './protocol.mjs';
import {contractCall, decode} from './abi.mjs';
import {permissionDenial} from './authorization.mjs';
import {toHex, utf8} from './keccak.mjs';

export const STATUS_KEY = 'flyns.status';
export const PROTECTED_KEYS = ['flyns.model', 'agent.type', 'flyns.checkpoint', 'flyns.model.sha256'];
const RECORD_KEYS = [STATUS_KEY, ...PROTECTED_KEYS, 'flyns.agentId', 'flyns.name', 'flyns.engine', 'flyns.namespace'];
const same = (a, b) => a?.toLowerCase() === b?.toLowerCase();
const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
export const statusSetter = () => contractCall(ABI.setText, ['0x', STATUS_KEY, '']);

/** An existing Sepolia identity, separate from the checkpoint/engine schema.
 * Public reads and eth_call probes never need a wallet. Writes accept only the
 * configured owner/runtime and always go through the user's wallet confirmation.
 */
export class StatusENS {
  constructor(rpc, config, target) {
    requireThat(config.chainId === 11155111 && target.chainId === 11155111, 'Only Ethereum Sepolia (11155111) is supported');
    for (const key of ['resolver', 'owner', 'runtime']) requireThat(/^0x[0-9a-f]{40}$/i.test(target[key]) && !/^0x0{40}$/i.test(target[key]), `Invalid ${key} address`);
    requireThat(!same(target.owner, target.runtime), 'Owner and runtime must be different accounts');
    dnsName(target.name);
    this.rpc = rpc; this.config = config; this.target = Object.freeze({...target});
  }

  async read(to, fn, args, block) {
    const raw = await this.rpc.request('eth_call', [{to, data: contractCall(fn, args)}, block]);
    return decode(fn.out, raw);
  }

  async snapshot() {
    requireThat(Number(BigInt(await this.rpc.request('eth_chainId'))) === 11155111, 'RPC is not Ethereum Sepolia');
    const block = await this.rpc.request('eth_blockNumber');
    const {resolver, name, owner, runtime} = this.target;
    const code = await this.rpc.request('eth_getCode', [resolver, block]);
    requireThat(code && code !== '0x', 'Ada resolver has no deployed code');
    const [implementation] = await this.read(this.config.factory, ABI.verify, [resolver], block);
    requireThat(same(implementation, this.config.resolverImplementation), 'Unexpected Ada resolver implementation');
    const [argument, resource, role] = await this.read(resolver, ABI.decodeSetter, [statusSetter()], block);
    requireThat(argument === toHex(utf8(STATUS_KEY)) && resource === setterResource(STATUS_KEY) && role === RESOLVER_ROLE.TEXT, 'Unexpected status capability');
    const records = Object.fromEntries(await Promise.all(RECORD_KEYS.map(async key => {
      const [data, actualResolver] = await this.read(this.config.universalResolver, ABI.resolve, [dnsName(name), contractCall(ABI.textProfile, [namehash(name), key])], block);
      requireThat(same(actualResolver, resolver), 'ENS name now points to a different resolver; stop and review');
      return [key, decode(['string'], data)[0]];
    })));
    const permissions = Object.fromEntries(await Promise.all([STATUS_KEY, ...PROTECTED_KEYS].map(async key => {
      const [allowed] = await this.read(resolver, ABI.hasRoles, [setterResource(key), RESOLVER_ROLE.TEXT, runtime], block);
      return [key, allowed];
    })));
    const [[rootRoles], [statusRoles], [ownerHasAdmin]] = await Promise.all([
      this.read(resolver, ABI.roles, [0n, runtime], block),
      this.read(resolver, ABI.roles, [resource, runtime], block),
      this.read(resolver, ABI.hasRoles, [resource, admin(role), owner], block),
    ]);
    return {chainId:11155111, blockNumber:Number(BigInt(block)), block, name, resolver, implementation, owner, runtime, records, permissions, rootRoles, statusRoles, ownerHasAdmin};
  }

  assertRestricted(state) {
    requireThat(state.rootRoles === 0n, 'Runtime has resolver-wide roles; status-only isolation is not established');
    requireThat(state.statusRoles === 0n || state.statusRoles === RESOLVER_ROLE.TEXT, 'Runtime has unexpected status roles, including possible admin rights');
    requireThat(PROTECTED_KEYS.every(key => !state.permissions[key]), 'Runtime can write a protected key; review its permissions first');
  }

  async assertWallet(wallet, expected) {
    requireThat(wallet && same(wallet.account, expected), `Connect the required account: ${expected}`);
    await wallet.guard();
  }

  async grant(wallet) {
    await this.assertWallet(wallet, this.target.owner);
    const before = await this.snapshot(); this.assertRestricted(before);
    requireThat(before.ownerHasAdmin, 'Configured owner cannot delegate the status key');
    if (before.permissions[STATUS_KEY]) return {skipped:true, state:before};
    const receipt = await wallet.send(this.target.resolver, ABI.grantSetter, [statusSetter(), this.target.runtime], 'Delegate Ada status only');
    const state = await this.snapshot(); this.assertRestricted(state);
    requireThat(state.permissions[STATUS_KEY], 'Status grant is not effective');
    return {receipt, state};
  }

  async update(wallet, value) {
    requireThat(typeof value === 'string' && /^[a-z][a-z0-9 ._-]{0,63}$/.test(value), 'Use a short lowercase status (1–64 characters)');
    await this.assertWallet(wallet, this.target.runtime);
    const before = await this.snapshot(); this.assertRestricted(before);
    requireThat(before.permissions[STATUS_KEY], 'Runtime has no status write permission');
    if (before.records[STATUS_KEY] === value) return {skipped:true, state:before};
    const receipt = await wallet.send(this.target.resolver, ABI.setText, [dnsName(this.target.name), STATUS_KEY, value], 'Update Ada status');
    const state = await this.snapshot(); this.assertRestricted(state);
    requireThat(state.records[STATUS_KEY] === value, 'Status readback differs; another writer may have updated it');
    requireThat(PROTECTED_KEYS.every(key => state.records[key] === before.records[key]), 'A protected record changed while the status transaction was pending');
    return {receipt, state};
  }

  async probe(key, value, state) {
    try {
      await this.rpc.request('eth_call', [{from:this.target.runtime, to:this.target.resolver, data:contractCall(ABI.setText, [dnsName(this.target.name), key, value])}, state.block]);
      return {key, allowed:true, kind:'eth_call'};
    } catch (error) {
      const denial = permissionDenial(error, {resource:setterResource(key), role:RESOLVER_ROLE.TEXT, account:this.target.runtime});
      if (!denial) throw new Error(`Permission probe inconclusive for ${key}: ${error.message}`);
      return {key, allowed:false, kind:'eth_call', denial};
    }
  }

  async verify() {
    const state = await this.snapshot(); this.assertRestricted(state);
    const probes = await Promise.all([this.probe(STATUS_KEY, 'exploring', state), this.probe('flyns.model', 'permission-probe', state)]);
    requireThat(probes[0].allowed === state.permissions[STATUS_KEY] && !probes[1].allowed, 'Permission simulation and effective roles disagree');
    return {state, probes};
  }
}
