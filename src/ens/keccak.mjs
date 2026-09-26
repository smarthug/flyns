/** Minimal Keccak-256 for ENS label/name hashing. Not SHA3-256.
 * No signing or private-key operations. Known-answer tests are in tests/crypto.test.mjs.
 */
const MASK = (1n << 64n) - 1n;
const ROT = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const RC = [0x1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,
  0x8000000080008081n,0x8000000000008009n,0x8an,0x88n,0x80008009n,0x8000000an,
  0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,
  0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,
  0x8000000080008081n,0x8000000000008080n,0x80000001n,0x8000000080008008n];
const rol = (a,n) => n === 0 ? a : ((a << BigInt(n)) | (a >> BigInt(64-n))) & MASK;
export const utf8 = s => new TextEncoder().encode(s);
export const toHex = bytes => '0x'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function fromHex(s) {
  if (typeof s !== 'string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(s)) throw new Error('Invalid hex bytes');
  return Uint8Array.from(s.slice(2).match(/../g)||[],x=>parseInt(x,16));
}
export function keccak(bytes) {
  if (typeof bytes === 'string') bytes = utf8(bytes);
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected bytes or UTF-8 string');
  const rate = 136, padded = new Uint8Array(Math.ceil((bytes.length+1)/rate)*rate);
  padded.set(bytes); padded[bytes.length] ^= 0x01; padded[padded.length-1] ^= 0x80;
  const a = Array(25).fill(0n);
  for(let off=0;off<padded.length;off+=rate){
    for(let i=0;i<rate;i++) a[i>>3] ^= BigInt(padded[off+i]) << BigInt((i%8)*8);
    for(const rc of RC){
      const c=Array(5).fill(0n),d=Array(5).fill(0n),b=Array(25).fill(0n);
      for(let x=0;x<5;x++)for(let y=0;y<5;y++)c[x]^=a[x+5*y];
      for(let x=0;x<5;x++)d[x]=c[(x+4)%5]^rol(c[(x+1)%5],1);
      for(let x=0;x<5;x++)for(let y=0;y<5;y++)a[x+5*y]^=d[x];
      for(let x=0;x<5;x++)for(let y=0;y<5;y++)b[y+5*((2*x+3*y)%5)]=rol(a[x+5*y],ROT[x+5*y]);
      for(let x=0;x<5;x++)for(let y=0;y<5;y++)a[x+5*y]=(b[x+5*y]^((~b[(x+1)%5+5*y])&b[(x+2)%5+5*y]))&MASK;
      a[0]^=rc;
    }
  }
  return toHex(Uint8Array.from({length:32},(_,i)=>Number((a[i>>3]>>BigInt((i%8)*8))&255n)));
}
export const selector = signature => keccak(signature).slice(0,10);
