import {callData,decode} from './abi.mjs';
export const shortError=e=>e?.shortMessage||e?.message||String(e);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export class WalletRPC{
  constructor(provider,onEvent=()=>{}){this.provider=provider;this.onEvent=onEvent;this.account=null;this.chainId=11155111;}
  async request(method,params=[]){if(!this.provider)throw new Error('No injected Ethereum wallet. Install a testnet wallet, then reload.');return this.provider.request({method,params});}
  async connect(){
    const accounts=await this.request('eth_requestAccounts');if(!accounts?.[0])throw new Error('No wallet account selected');
    this.account=accounts[0].toLowerCase();
    if(Number(BigInt(await this.request('eth_chainId')))!==this.chainId)await this.request('wallet_switchEthereumChain',[{chainId:'0xaa36a7'}]);
    await this.guard();return this.account;
  }
  async guard(){
    if(Number(BigInt(await this.request('eth_chainId')))!==this.chainId)throw new Error('Wrong chain: only Sepolia is allowed');
    const a=await this.request('eth_accounts');if(!a?.[0]||a[0].toLowerCase()!==this.account)throw new Error('Wallet account changed. Reconnect before continuing.');
  }
  async code(address){return this.request('eth_getCode',[address,'latest']);}
  async read(address,fn,args=[]){
    const result=await this.request('eth_call',[{to:address,data:callData(fn.sig,fn.in,args)},'latest']);return decode(fn.out,result);
  }
  async simulate(address,fn,args=[]){await this.guard();return this.request('eth_call',[{from:this.account,to:address,data:callData(fn.sig,fn.in,args)},'latest']);}
  async send(address,fn,args=[],label=fn.sig){
    await this.guard();const tx={from:this.account,to:address,data:callData(fn.sig,fn.in,args)};
    // eth_call is a preflight, not a submitted transaction and not proof of inclusion.
    await this.request('eth_call',[tx,'latest']);await this.guard();
    const hash=await this.request('eth_sendTransaction',[tx]);
    if(!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error('Wallet did not return a transaction hash');
    this.onEvent({kind:'pending',label,hash});
    const deadline=Date.now()+180000;
    while(Date.now()<deadline){
      const receipt=await this.request('eth_getTransactionReceipt',[hash]);
      if(receipt){if(BigInt(receipt.status)!==1n){this.onEvent({kind:'reverted',label,hash});throw new Error(`Transaction reverted: ${hash}`);}
        this.onEvent({kind:'confirmed',label,hash,block:Number(BigInt(receipt.blockNumber))});return receipt;}
      await pause(1600);
    }
    throw new Error(`Receipt timeout. Transaction may still be pending; inspect ${hash} before retrying.`);
  }
}
export class HTTPRPC extends WalletRPC{
  constructor(url){super(null);this.url=url;this.id=1;}
  async request(method,params=[]){
    if(!['eth_chainId','eth_call','eth_getCode','eth_blockNumber'].includes(method))throw new Error('Read-only verifier');
    const r=await fetch(this.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:this.id++,method,params}),signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw new Error(`RPC HTTP ${r.status}`);const j=await r.json();if(j.error)throw new Error(j.error.message);return j.result;
  }
}
