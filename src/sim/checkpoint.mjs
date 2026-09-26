import {ENGINE_VERSION,ENGINE_CONFIG} from './circuit.mjs';
export function canonical(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Non-finite JSON value');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  throw new Error('Unsupported canonical JSON value');
}
export async function sha256(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');}
export const modelDigest = graph => sha256(canonical({engine:ENGINE_VERSION,config:ENGINE_CONFIG,graph}));
export function makeCheckpoint(state,modelHash,sequence){
  return {schema:'flyns.checkpoint.v1',modelHash,sequence,createdAt:new Date().toISOString(),state:structuredClone(state)};
}
export function validateCheckpoint(cp,{agentId,modelHash,neuronCount,minSequence=0}={}){
  if(!cp||cp.schema!=='flyns.checkpoint.v1'||!Number.isSafeInteger(cp.sequence)||cp.sequence<Math.max(0,minSequence)||cp.sequence>1e12)throw new Error('Unsupported or stale checkpoint');
  if(!/^[0-9a-f]{64}$/.test(cp.modelHash)||modelHash&&cp.modelHash!==modelHash)throw new Error('Model hash mismatch');
  const s=cp.state;
  if(!s||typeof s.agentId!=='string'||s.agentId.length>100||agentId&&s.agentId!==agentId||s.engine!==ENGINE_VERSION)throw new Error('Agent identity / engine mismatch');
  if(!Number.isSafeInteger(s.tick)||s.tick<0||!Number.isInteger(s.rng)||s.rng<1||s.rng>4294967295)throw new Error('Invalid clock / PRNG state');
  if(![s.x,s.y,s.heading,s.energy].every(Number.isFinite)||Math.hypot(s.x,s.y)>1.1||s.energy<0||s.energy>1)throw new Error('Invalid embodied state');
  if(!Array.isArray(s.neural)||s.neural.length<2||s.neural.length>10000||neuronCount&&s.neural.length!==neuronCount||!s.neural.every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw new Error('Invalid neural state');
  if(!s.motor||![s.motor.left,s.motor.right].every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw new Error('Invalid motor state');
  if(!s.environment||!Array.isArray(s.environment.food)||s.environment.food.length!==2||!s.environment.food.every(x=>Number.isFinite(x)&&Math.abs(x)<=1)||!Number.isFinite(s.environment.threat)||s.environment.threat<0||s.environment.threat>1)throw new Error('Invalid environment');
  return cp;
}
export function validatePointer(p){
  if(!p||p.schema!=='flyns.pointer.v1'||typeof p.uri!=='string'||p.uri.length>2048||!/^[0-9a-f]{64}$/.test(p.sha256)||!Number.isSafeInteger(p.sequence)||p.sequence<0)throw new Error('Invalid ENS checkpoint pointer');return p;
}
export async function verifyCheckpoint(raw,pointer,expected){
  validatePointer(pointer);if(new TextEncoder().encode(raw).length>131072)throw new Error('Checkpoint too large');
  if(await sha256(raw)!==pointer.sha256)throw new Error('Checkpoint integrity check failed');
  const cp=validateCheckpoint(JSON.parse(raw),expected);if(cp.sequence!==pointer.sequence)throw new Error('Checkpoint sequence mismatch');return cp;
}
export function safeCheckpointURL(value,base){
  const url=new URL(value,base),origin=new URL(base);
  if(url.username||url.password)throw new Error('Credentials are not allowed in checkpoint URLs');
  if(url.protocol==='https:')return url.href;
  if(url.protocol==='http:'&&url.origin===origin.origin&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))return url.href;
  throw new Error('Checkpoint URL must use HTTPS (same-origin localhost allowed for rehearsal)');
}
