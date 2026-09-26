import {readFile,mkdir,writeFile} from 'node:fs/promises';import {HTTPRPC} from '../src/ens/rpc.mjs';
const config=JSON.parse(await readFile(new URL('../public/config.json',import.meta.url),'utf8'));
if(!process.env.SEPOLIA_RPC_URL)throw new Error('Set SEPOLIA_RPC_URL to run read-only verification. No private key is used.');
const rpc=new HTTPRPC(process.env.SEPOLIA_RPC_URL),chainId=Number(BigInt(await rpc.request('eth_chainId')));if(chainId!==11155111)throw new Error('RPC is not Sepolia');
const checks=[];for(const key of ['factory','ethRegistry','resolverImplementation','registryImplementation','universalResolver']){const code=await rpc.code(config[key]);if(!code||code==='0x')throw new Error(`No code for ${key}. Check current ENS deployment docs.`);checks.push({key,address:config[key],runtimeCodeBytes:(code.length-2)/2});}
const result={checkedAt:new Date().toISOString(),chainId,checks,limitations:'Code presence only. Does not prove ABI compatibility, name ownership, transactions, or E2E correctness.'};await mkdir('artifacts',{recursive:true});await writeFile('artifacts/sepolia-code-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
