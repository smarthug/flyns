import {keccak256} from '../../vendor/web3/viem.mjs';
export const utf8 = value => new TextEncoder().encode(value);
export const toHex = bytes => '0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export function fromHex(value) {
  if (typeof value !== 'string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(value)) throw new Error('Invalid hex bytes');
  return Uint8Array.from(value.slice(2).match(/../g) || [], x => parseInt(x, 16));
}
export function keccak(bytes) {
  if (typeof bytes === 'string') bytes = utf8(bytes);
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected bytes or UTF-8 string');
  return keccak256(bytes);
}
export const selector = signature => keccak(signature).slice(0, 10);
