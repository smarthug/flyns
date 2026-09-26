import http from 'node:http';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateCheckpoint} from './src/sim/checkpoint.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
export function createApp({storageDir=process.env.CHECKPOINT_DIR||path.join(ROOT,'.storage/checkpoints'),publicOrigin=process.env.PUBLIC_ORIGIN||null}={}){
  if(publicOrigin){const o=new URL(publicOrigin);if(!['http:','https:'].includes(o.protocol)||o.username||o.password||o.pathname!=='/'||o.search||o.hash)throw new Error('PUBLIC_ORIGIN must be an HTTP(S) origin without path or credentials');publicOrigin=o.origin;}
  const clients=new Map();let uploadQueue=Promise.resolve();
  function reply(res,status,body,type='application/json; charset=utf-8'){
    res.writeHead(status,{'content-type':type,'x-content-type-options':'nosniff','referrer-policy':'no-referrer','cache-control':'no-store'});res.end(typeof body==='string'?body:JSON.stringify(body));
  }
  return http.createServer(async(req,res)=>{
    const base=publicOrigin||`http://${req.headers.host||'localhost:4173'}`;
    try{
      const url=new URL(req.url,base),pathname=decodeURIComponent(url.pathname);
      if(req.method==='POST'&&pathname==='/api/checkpoints'){
        const expected=new URL(base).origin;
        if(req.headers.origin&&req.headers.origin!==expected)return reply(res,403,{error:'Cross-origin uploads are disabled'});
        const ip=req.socket.remoteAddress||'unknown',now=Date.now(),window=clients.get(ip)||{time:now,count:0};
        if(now-window.time>60000){window.time=now;window.count=0;}clients.set(ip,window);if(++window.count>20)return reply(res,429,{error:'Upload limit reached; try again later'});
        for(const [key,v]of clients)if(now-v.time>120000)clients.delete(key);
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>131072){reply(res,413,{error:'Checkpoint exceeds 128 KiB'});req.destroy();return;}chunks.push(chunk);}
        const body=Buffer.concat(chunks),raw=body.toString('utf8');validateCheckpoint(JSON.parse(raw));
        const sha256=createHash('sha256').update(body).digest('hex');
        // Serialize quota checks and writes to prevent concurrent uploads bypassing the quota.
        const operation=uploadQueue.then(async()=>{
          await mkdir(storageDir,{recursive:true});const files=await readdir(storageDir);let total=0;
          for(const f of files)if(/^[a-f0-9]{64}\.json$/.test(f))total+=(await stat(path.join(storageDir,f))).size;
          if(total+size>32*1024*1024)throw new Error('Checkpoint store quota exceeded (32 MiB)');
          await writeFile(path.join(storageDir,sha256+'.json'),body,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
        });uploadQueue=operation.catch(()=>{});await operation;
        return reply(res,201,{uri:new URL(`/checkpoints/${sha256}.json`,base).href,sha256,bytes:size});
      }
      if(!['GET','HEAD'].includes(req.method))return reply(res,405,{error:'Method not allowed'});
      if(pathname==='/api/health')return reply(res,200,{ok:true,version:'0.1.0',storage:'content-addressed-files',publicOrigin:base});
      const cp=/^\/checkpoints\/([a-f0-9]{64})\.json$/.exec(pathname);
      if(cp){const data=await readFile(path.join(storageDir,cp[1]+'.json'));res.writeHead(200,{'content-type':MIME['.json'],'access-control-allow-origin':'*','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'});return res.end(req.method==='HEAD'?undefined:data);}
      const relative=pathname==='/'?'index.html':pathname.slice(1);
      // Only publish application assets. Never serve .env, deployment journals, tests or the storage directory.
      if(!/^(index\.html|style\.css|favicon\.svg|(?:src|data|public|vendor|docs)\/[a-zA-Z0-9_./-]+)$/.test(relative)||relative.split('/').includes('..'))return reply(res,404,{error:'Not found'});
      const target=path.resolve(ROOT,relative);if(!target.startsWith(ROOT+path.sep))return reply(res,403,{error:'Forbidden'});
      const data=await readFile(target);res.writeHead(200,{'content-type':MIME[path.extname(target)]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'no-referrer','cache-control':'no-cache','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:data);
    }catch(e){if(!res.headersSent)reply(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Not found':e.message});else res.end();}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
  if(!['127.0.0.1','localhost','::1'].includes(host)&&!process.env.PUBLIC_ORIGIN)throw new Error('Set PUBLIC_ORIGIN when exposing the server; use your HTTPS public origin');
  createApp().listen(port,host,()=>console.log(`FlyNS: http://${host}:${port}\nRehearsal works without packages. Live ENSv2 requires a Sepolia wallet and a registered parent name.`));
}
