/** Small, dependency-free ABI codec for the explicit ENSv2 calls in protocol.mjs.
 * A full web3 SDK is preferable for production. No arbitrary ABI parsing or signing.
 */
import {utf8,toHex,fromHex,selector} from './keccak.mjs';
export const tuple = (...fields) => ({tuple:fields});
export const array = item => ({array:item});
const dynamic = t => typeof t === 'object' ? ('array' in t || t.tuple.some(dynamic)) : t==='bytes'||t==='string';
const staticSize = t => dynamic(t)?32:typeof t==='object'?t.tuple.reduce((n,x)=>n+staticSize(x),0):32;
const word = n => {n=BigInt(n);if(n<0n||n>=(1n<<256n))throw new Error('uint256 out of range');return n.toString(16).padStart(64,'0');};
function seq(types,values){
  if(types.length!==values.length)throw new Error('ABI arity mismatch');
  const headSize=types.reduce((s,t)=>s+staticSize(t),0);let tail='',head='';
  types.forEach((t,i)=>{const part=enc(t,values[i]);if(dynamic(t)){head+=word(headSize+tail.length/2);tail+=part;}else head+=part;});
  return head+tail;
}
function enc(t,v){
  if(typeof t==='object'){
    if('tuple' in t)return seq(t.tuple,v);
    if(!Array.isArray(v))throw new Error('Expected ABI array');
    return word(v.length)+seq(v.map(()=>t.array),v);
  }
  if(/^uint(\d*)$/.test(t)){
    const bits=Number(t.slice(4)||256), n=BigInt(v);
    if(bits<8||bits>256||bits%8||n<0n||n>=(1n<<BigInt(bits)))throw new Error(`${t} out of range`);
    return word(n);
  }
  if(t==='address'){
    if(!/^0x[a-fA-F0-9]{40}$/.test(v))throw new Error('Invalid address');
    return v.slice(2).toLowerCase().padStart(64,'0');
  }
  if(t==='bool'){if(typeof v!=='boolean')throw new Error('Invalid bool');return word(v?1n:0n);}
  if(t==='string'||t==='bytes'){
    const b=t==='string'?utf8(v):fromHex(v);return word(b.length)+toHex(b).slice(2).padEnd(Math.ceil(b.length/32)*64,'0');
  }
  if(/^bytes(\d+)$/.test(t)){
    const n=Number(t.slice(5)),b=fromHex(v);if(n<1||n>32||b.length!==n)throw new Error('Invalid fixed bytes');return toHex(b).slice(2).padEnd(64,'0');
  }
  throw new Error(`Unsupported ABI type: ${t}`);
}
export const encode = (types,values) => '0x'+seq(types,values);
export const callData = (signature,types,values) => selector(signature)+seq(types,values);
export function decode(types,hex){
  const b=fromHex(hex);
  const uintAt=p=>{if(!Number.isSafeInteger(p)||p<0||p+32>b.length)throw new Error('Truncated ABI result');return BigInt(toHex(b.slice(p,p+32)));};
  const numberAt=p=>{const n=uintAt(p);if(n>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('ABI offset too large');return Number(n);};
  const readSeq=(ts,base)=>{let p=base;return ts.map(t=>{const at=dynamic(t)?base+numberAt(p):p;p+=staticSize(t);return read(t,at);});};
  const read=(t,p)=>{
    if(typeof t==='object'){
      if('tuple' in t)return readSeq(t.tuple,p);
      const n=numberAt(p);if(n>10000)throw new Error('ABI array too large');return readSeq(Array(n).fill(t.array),p+32);
    }
    if(t.startsWith('uint'))return uintAt(p);
    if(t==='address'){uintAt(p);return toHex(b.slice(p+12,p+32));}
    if(t==='bool'){const n=uintAt(p);if(n!==0n&&n!==1n)throw new Error('Invalid ABI bool');return n===1n;}
    if(t==='string'||t==='bytes'){
      const n=numberAt(p);if(p+32+n>b.length)throw new Error('Truncated ABI bytes');const out=b.slice(p+32,p+32+n);
      return t==='string'?new TextDecoder('utf-8',{fatal:true}).decode(out):toHex(out);
    }
    if(t.startsWith('bytes')){uintAt(p);return toHex(b.slice(p,p+Number(t.slice(5))));}
    throw new Error('Unsupported ABI decode');
  };
  return readSeq(types,0);
}
