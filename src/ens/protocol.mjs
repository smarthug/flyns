import {keccak,fromHex,toHex,utf8} from './keccak.mjs';
import {tuple,array} from './abi.mjs';
export const ZERO='0x'+'0'.repeat(40);
export const CHECKPOINT_KEY='flyns.checkpoint';
export const ROLE={REGISTRAR:1n,SET_PARENT:1n<<8n,RENEW:1n<<16n,SET_SUBREGISTRY:1n<<20n,SET_RESOLVER:1n<<24n,CAN_TRANSFER_ADMIN:1n<<156n};
export const RESOLVER_ROLE={ADDRESS:1n,TEXT:1n<<4n,LINK:1n<<28n};
export const admin = bits => bits << 128n;
// No dangerous registry root roles, and no upgrade capability in our instances.
export const REGISTRY_ROOT=ROLE.REGISTRAR|ROLE.SET_PARENT|ROLE.RENEW|admin(ROLE.REGISTRAR|ROLE.SET_PARENT|ROLE.RENEW);
export const OWNER_NAME_ROLES=ROLE.SET_SUBREGISTRY|ROLE.SET_RESOLVER|admin(ROLE.SET_SUBREGISTRY|ROLE.SET_RESOLVER);
// Names are intentionally non-transferable in the MVP. Never confuse registry token transfer with resolver-admin transfer.
export const RESOLVER_OWNER=RESOLVER_ROLE.ADDRESS|RESOLVER_ROLE.TEXT|RESOLVER_ROLE.LINK|admin(RESOLVER_ROLE.ADDRESS|RESOLVER_ROLE.TEXT|RESOLVER_ROLE.LINK);
/** Deliberately restrict names to a safe lowercase ASCII ENS subset.
 * This is NOT a full ENSIP-15 implementation; non-ASCII labels are rejected, not approximated.
 */
export function normalizeName(s){
  if(typeof s!=='string'||s!==s.trim())throw new Error('Enter a name without surrounding whitespace');
  const n=s.toLowerCase();if(n.length>253||!n||!n.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw new Error('Use ASCII labels: letters, numbers and interior hyphens');
  return n;
}
export function dnsName(s){return toHex(Uint8Array.from([...normalizeName(s).split('.').flatMap(l=>[utf8(l).length,...utf8(l)]),0]));}
export function namehash(s){let node=new Uint8Array(32);if(!s)return toHex(node);for(const l of normalizeName(s).split('.').reverse())node=fromHex(keccak(Uint8Array.from([...node,...fromHex(keccak(l))])));return toHex(node);}
export const labelId=label=>BigInt(keccak(normalizeName(label)));
export const setterResource=key=>BigInt(keccak(key));
const GRANT=tuple('address','uint256');
export const ABI={
  deploy:{sig:'deployProxy(address,uint256,bytes)',in:['address','uint256','bytes'],out:['address']},
  verify:{sig:'verifyContract(address)',in:['address'],out:['address']},
  initRegistry:{sig:'initialize((address,uint256)[])',in:[array(GRANT)],out:[]},
  initResolver:{sig:'initialize((address,uint256)[],bytes[])',in:[array(GRANT),array('bytes')],out:[]},
  register:{sig:'register(string,address,address,address,uint256,uint64)',in:['string','address','address','address','uint256','uint64'],out:['uint256']},
  setParent:{sig:'setParent(address,string)',in:['address','string'],out:[]},
  setSubregistry:{sig:'setSubregistry(uint256,address)',in:['uint256','address'],out:[]},
  state:{sig:'getState(uint256)',in:['uint256'],out:[tuple('uint8','uint64','address','uint256','uint256')]},
  subregistry:{sig:'getSubregistry(string)',in:['string'],out:['address']},
  resolver:{sig:'getResolver(string)',in:['string'],out:['address']},
  hasRoles:{sig:'hasRoles(uint256,uint256,address)',in:['uint256','uint256','address'],out:['bool']},
  hasRootRoles:{sig:'hasRootRoles(uint256,address)',in:['uint256','address'],out:['bool']},
  setText:{sig:'setText(bytes,string,string)',in:['bytes','string','string'],out:[]},
  setAddress:{sig:'setAddress(bytes,uint256,bytes)',in:['bytes','uint256','bytes'],out:[]},
  grantSetter:{sig:'grantSetterRoles(bytes,address)',in:['bytes','address'],out:['bool']},
  revoke:{sig:'revokeRoles(uint256,uint256,address)',in:['uint256','uint256','address'],out:['bool']},
  link:{sig:'linkToNode(bytes,bytes32)',in:['bytes','bytes32'],out:[]},
  resolve:{sig:'resolve(bytes,bytes)',in:['bytes','bytes'],out:['bytes','address']},
  textProfile:{sig:'text(bytes32,string)',in:['bytes32','string'],out:['string']},
  addrProfile:{sig:'addr(bytes32)',in:['bytes32'],out:['address']},
};
