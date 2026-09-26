// Compatibility helpers around maintained viem primitives. Live function ABIs
// are generated from pinned official ENS deployment artifacts.
import {encodeAbiParameters, decodeAbiParameters, encodeFunctionData} from '../../vendor/web3/viem.mjs';
import {selector, fromHex} from './keccak.mjs';
export const tuple = (...fields) => ({tuple: fields});
export const array = item => ({array: item});
const parameter = type => typeof type === 'string' ? {type}
  : type.array ? {...parameter(type.array), type: parameter(type.array).type + '[]'}
  : {type: 'tuple', components: type.tuple.map(parameter)};
const normalize = (type, value) => typeof type === 'object'
  ? type.array ? value.map(v => normalize(type.array, v)) : type.tuple.map((t, i) => normalize(t, value[i]))
  : type.startsWith('uint') ? BigInt(value) : type === 'address' ? value.toLowerCase() : value;
export const encode = (types, values) => encodeAbiParameters(types.map(parameter), values);
export const callData = (signature, types, values) => selector(signature) + encode(types, values).slice(2);
export const contractCall = (fn, args = []) => encodeFunctionData({abi: fn.abi, functionName: fn.abi[0].name, args});
export function decode(types, hex) {
  fromHex(hex);
  const values = decodeAbiParameters(types.map(parameter), hex);
  return types.map((type, i) => normalize(type, values[i]));
}
