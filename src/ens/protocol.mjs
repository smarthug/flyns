import {keccak,fromHex,toHex,utf8} from './keccak.mjs';
import {tuple,array} from './abi.mjs';
import {OFFICIAL_FUNCTIONS} from './official-abis.mjs';
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
const typeOf = param => param.type.endsWith('[]') ? array(typeOf({...param, type:param.type.slice(0,-2)}))
  : param.type === 'tuple' ? tuple(...param.components.map(typeOf)) : param.type;
const signatureType = param => param.type.startsWith('tuple')
  ? '(' + param.components.map(signatureType).join(',') + ')' + param.type.slice(5) : param.type;
export const ABI = Object.fromEntries(Object.entries(OFFICIAL_FUNCTIONS).map(([key, fn]) => [key, {
  sig: `${fn.name}(${fn.inputs.map(signatureType).join(',')})`,
  in: fn.inputs.map(typeOf), out: fn.outputs.map(typeOf), abi: [fn],
}]));
