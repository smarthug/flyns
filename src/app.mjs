import {LocalENS} from './ens/local.mjs';
import {LiveENS} from './ens/live.mjs';
import {WalletRPC} from './ens/rpc.mjs';
import {permissionDenial} from './ens/authorization.mjs';
import {setterResource,RESOLVER_ROLE} from './ens/protocol.mjs';
import {FlyEngine,initialState} from './sim/engine.mjs';
import {validateCircuit,ENGINE_CONFIG} from './sim/circuit.mjs';
import {canonical,modelDigest,makeCheckpoint,sha256,verifyCheckpoint,safeCheckpointURL} from './sim/checkpoint.mjs';
import {canvasArena,drawNeural} from './ui/arena-canvas.mjs';

const $=id=>document.getElementById(id), short=s=>s&&s.length>24?s.slice(0,12)+'…'+s.slice(-8):s||'—';
const [graph,config]=await Promise.all([fetch('/data/circuit.json').then(r=>r.json()),fetch('/public/config.json').then(r=>r.json())]);
validateCircuit(graph);const modelHash=await modelDigest(graph);
let backend=new LocalENS(localStorage),rpc=null,agents=[],selected=null,arena='A',busy=false,renderer=canvasArena($('arena'),select),events=[];
let toastTimer;const notice=text=>{$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,7000);};
function journal(label,details={},kind='info'){
  const e={timestamp:new Date().toISOString(),mode:backend.mode,kind,label,...details};events.unshift(e);events=events.slice(0,150);
  const li=document.createElement('li'),head=document.createElement('div'),time=document.createElement('time');li.dataset.kind=kind;head.className='event-label';time.textContent=new Date().toLocaleTimeString('en-GB');head.textContent=label;li.append(time,head);
  const sub=document.createElement('small');sub.textContent=details.detail||[details.tick!==undefined?`tick ${details.tick}`:'',details.sha256?short(details.sha256):'',details.block?`block ${details.block}`:''].filter(Boolean).join(' · ');head.append(sub);
  if(details.hash){const a=document.createElement('a');a.href=`https://sepolia.etherscan.io/tx/${details.hash}`;a.target='_blank';a.rel='noreferrer';a.textContent=short(details.hash)+' ↗';head.append(a);}
  $('journal').prepend(li);while($('journal').children.length>20)$('journal').lastChild.remove();
}
const current=()=>agents.find(a=>a.meta.name===selected);
const required=()=>{const a=current();if(!a)throw new Error('Select an agent first');return a;};
async function run(action){if(busy)return;busy=true;document.body.classList.add('is-busy');for(const el of document.querySelectorAll('button,input,select'))el.disabled=true;
  try{await action();}catch(e){console.error(e);notice(e.message);journal(e.message,{},'error');}
  finally{busy=false;document.body.classList.remove('is-busy');for(const el of document.querySelectorAll('button,input,select'))el.disabled=false;$('actor').disabled=backend.mode!=='local';render();}
}
function select(name){selected=name;const a=current();if(a)arena=a.arena;render();}
function render(){
  const a=current(),local=backend.mode==='local';$('modeBadge').textContent=local?'LOCAL REHEARSAL':'SEPOLIA · LIVE CONTRACTS';
  $('modeDescription').textContent=local?'No blockchain transactions. Names ending in .demo are local examples.':'Real ENSv2 calls. Every write requires a wallet confirmation; test ETH only.';
  $('localMode').classList.toggle('active',local);$('liveMode').classList.toggle('active',!local);$('actor').disabled=!local||busy;
  $('actorAddress').textContent=local?'Local rehearsal actor':short(rpc?.account);
  $('arenaA').classList.toggle('active',arena==='A');$('arenaB').classList.toggle('active',arena==='B');$('arenaLabel').textContent=`ARENA ${arena} / ${local?'LOCAL':'SEPOLIA'}`;
  $('emptyArena').hidden=agents.some(x=>x.arena===arena);$('agentTotal').textContent=String(agents.length).padStart(2,'0');$('agentList').replaceChildren();
  for(const item of agents){const b=document.createElement('button');b.className='agent-card agent-row'+(item.meta.name===selected?' selected':'');b.disabled=busy;
    const dot=document.createElement('span');dot.className='agent-orb';dot.textContent='⌁';const copy=document.createElement('span');copy.className='agent-copy';const title=document.createElement('strong');title.textContent=item.meta.name;const sub=document.createElement('small');sub.textContent='Isolated resolver · independent state';copy.append(title,sub);const state=document.createElement('span');state.className='agent-state';state.textContent=`${item.arena} · ${item.paused?'PAUSED':'RUNNING'}`;b.append(dot,copy,state);b.onclick=()=>select(item.meta.name);$('agentList').append(b);}
  $('selectedName').textContent=a?.meta.name||'No agent selected';$('selectedStatus').textContent=a?(a.paused?'PAUSED':'LIVE CIRCUIT'):'NOT LOADED';
  $('checkpointHash').textContent=a?.pointer?short(a.pointer.sha256):'Not published';$('checkpointHash').title=a?.pointer?.sha256||'';
  for(const [id,value] of [['modelHash',a?.meta.modelHash||modelHash],['resolverAddress',a?.meta.resolver],['namespaceAddress',a?.meta.namespaceRegistry]]){$(id).textContent=short(value);$(id).title=value||'';}
  $('pauseButton').textContent=a?.paused?'Resume selected':'Pause selected';$('aliasResult').textContent=a?.alias||'';
  $('checkpointPermission').textContent=a?.writer?'Allowed (key only)':'Not granted / unchecked';$('checkpointPermission').className=a?.writer?'yes':'no';
  $('resumeName').placeholder=local?'ada.flyns.demo':'ada.your-name.eth';metrics();
}
function metrics(){const a=current(),s=a?.engine.state;$('tick').textContent=s?s.tick.toLocaleString('en-US'):'—';$('activity').textContent=s?(s.neural.reduce((x,y)=>x+y,0)/s.neural.length).toFixed(3):'—';$('energy').textContent=s?(s.energy*100).toFixed(1)+'%':'—';$('runningCount').textContent=agents.filter(a=>a.arena===arena&&!a.paused).length;}
function seedFrom(id){return [...id].reduce((s,c)=>(Math.imul(s,31)+c.charCodeAt(0))>>>0,2166136261)||1;}
function addAgent(meta,state=null){if(meta.modelHash!==modelHash)throw new Error('This agent uses a different model. Load the matching circuit before restoring.');const existing=agents.find(a=>a.meta.name===meta.name);if(existing)return existing;
  const a={meta,engine:new FlyEngine(graph,state||initialState(meta.agentId,seedFrom(meta.agentId),graph.nodes.length)),arena,paused:false,sequence:0,pointer:null,writer:meta.writer||false};agents.push(a);selected=meta.name;return a;}
async function initLocal(){backend=new LocalENS(localStorage);$('actor').value='owner';agents=[];selected=null;arena='A';let metas=await backend.list();
  if(!metas.some(meta=>meta.modelHash===modelHash)){
    const previousModels=metas.length>0;
    for(const base of ['ada','kibo','mori']){const label=metas.some(meta=>meta.name===`${base}.${backend.baseName}`)?`${base}-${modelHash.slice(0,8)}`:base;metas.push(await backend.hatch(label,{agentId:crypto.randomUUID(),modelHash}));}
    if(previousModels)journal('Circuit changed: new local identities created',{detail:'Previous names and checkpoints are preserved; restore them only with their matching graph and engine.'});
  }
  for(const meta of metas.filter(meta=>meta.modelHash===modelHash).slice(0,5))addAgent(meta);
  selected=agents[0]?.meta.name;render();journal('Local rehearsal ready',{detail:'No chain calls. No fabricated transaction receipts.'});
}
async function connect(){if(!window.ethereum)throw new Error('Install an injected Ethereum wallet to use Sepolia. Rehearsal needs no wallet.');
  const previous=backend.mode==='sepolia'?backend:null;
  rpc=new WalletRPC(window.ethereum,e=>journal(`${e.kind.toUpperCase()} · ${e.label}`,e,e.kind));await rpc.connect();
  backend=new LiveENS(rpc,config,{storage:localStorage,onResource:r=>journal(r.label,{detail:r.address})});
  if(previous){backend.baseName=previous.baseName;backend.registry=previous.registry;}else{agents=[];selected=null;arena='A';}
  $('setup').open=true;$('walletInfo').textContent=`Connected ${rpc.account} · Sepolia ${config.chainId}`;$('connect').textContent='Reconnect / switch account ↗';$('setupState').textContent='Wallet connected; parent not configured';
  journal('Connected to Sepolia',{detail:'ENSv2 integration is live-mode code; setup requires your own registered parent.'});render();
}
function runtimeAccount(){const s=$('runtimeAddress').value.trim().toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(s)||/^0x0{40}$/.test(s))throw new Error('Enter a nonzero runtime wallet address');if(s===rpc?.account)throw new Error('Use a separate runtime wallet, not the current custodian/admin');return s;}
async function publish(a){
  const meta=await backend.getAgent(a.meta.name);if(meta.agentId!==a.meta.agentId||meta.modelHash!==modelHash)throw new Error('Canonical identity or model changed; stop this runtime and re-resolve');
  if(!await backend.canWrite(meta))throw new Error(backend.mode==='local'?'LOCAL DENIAL: runtime checkpoint capability was not granted or has been revoked':'Current Sepolia wallet has no checkpoint setter capability');
  let sequence=1;try{const p=await backend.checkpoint(meta.name);sequence=p.sequence+1;}catch(e){if(e.message!=='No checkpoint has been published')throw e;}
  const cp=makeCheckpoint(a.engine.snapshot(),modelHash,sequence),raw=canonical(cp),digest=await sha256(raw);
  const response=await fetch('/api/checkpoints',{method:'POST',headers:{'content-type':'application/json'},body:raw,signal:AbortSignal.timeout(20000)});const stored=await response.json();if(!response.ok)throw new Error(stored.error||'Checkpoint store unavailable');
  if(stored.sha256!==digest)throw new Error('Checkpoint store returned the wrong digest');safeCheckpointURL(stored.uri,location.href);
  const pointer={schema:'flyns.pointer.v1',uri:stored.uri,sha256:digest,sequence};await backend.publish(meta,pointer);a.pointer=pointer;a.sequence=sequence;
  journal('Canonical checkpoint published',{tick:cp.state.tick,sha256:digest,detail:`Sequence ${sequence} · ${backend.mode==='local'?'local registry only':'confirmed ENSv2 text record'}`});render();return cp;
}
async function readBounded(uri){const r=await fetch(safeCheckpointURL(uri,location.href),{signal:AbortSignal.timeout(15000),credentials:'omit',redirect:'error'});if(!r.ok)throw new Error(`Snapshot HTTP ${r.status}`);
  const reader=r.body.getReader(),parts=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();throw new Error('Snapshot exceeds 128 KiB');}parts.push(value);}const all=new Uint8Array(size);let pos=0;for(const p of parts){all.set(p,pos);pos+=p.length;}return new TextDecoder('utf-8',{fatal:true}).decode(all);}
async function restore(name,targetArena=arena){
  const meta=await backend.getAgent(name);if(meta.modelHash!==modelHash)throw new Error('Model hash mismatch. Use the identical circuit and engine version.');
  const old=agents.find(a=>a.meta.name===meta.name),pointer=await backend.checkpoint(name),raw=await readBounded(pointer.uri);
  const cp=await verifyCheckpoint(raw,pointer,{agentId:meta.agentId,modelHash,neuronCount:graph.nodes.length,minSequence:old?.sequence||0});
  const fresh=new FlyEngine(graph,cp.state);const a=old||addAgent(meta);a.meta=meta;a.engine=fresh;a.arena=targetArena;a.paused=false;a.sequence=cp.sequence;a.pointer=pointer;selected=meta.name;arena=targetArena;
  const proof=`Verified SHA-256, identity, model and sequence ${cp.sequence}. Fresh engine restored at tick ${cp.state.tick}, PRNG ${cp.state.rng}.`;
  $('resumeProof').textContent=proof;$('resumeProof').dataset.tick=String(cp.state.tick);journal('Fresh runtime restored by name',{tick:cp.state.tick,sha256:pointer.sha256,detail:`Arena ${targetArena} · ${name}`});render();return a;
}
$('hatchForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(agents.length>=5)throw new Error('This observatory is limited to five concurrent agents');const label=$('agentLabel').value.trim();const meta=await backend.hatch(label,{agentId:crypto.randomUUID(),modelHash});addAgent(meta);$('agentLabel').value='';journal('Agent hatched',{detail:meta.name});});};
$('connect').onclick=$('liveMode').onclick=()=>run(connect);$('localMode').onclick=()=>run(initLocal);
$('setupButton').onclick=()=>run(async()=>{if(backend.mode!=='sepolia')throw new Error('Connect your Sepolia wallet first');const result=await backend.setup($('parentName').value.trim());$('setupState').textContent=`${result.baseName} → ${short(result.registry)}`;journal('Colony namespace attached',{detail:result.registry});});
$('arenaA').onclick=()=>{arena='A';render();};$('arenaB').onclick=()=>{arena='B';render();};
$('pauseButton').onclick=()=>{const a=current();if(a){a.paused=!a.paused;render();}};
$('stimulate').onclick=()=>{const a=current();if(!a)return;const e=a.engine.state.environment;e.threat=e.threat?0:0.8;e.food=e.threat?[-0.55,-0.25]:[.6,.25];journal('Engineered stimulus changed',{detail:`${a.meta.name} · no learning is claimed`});};
$('checkpointButton').onclick=()=>run(()=>publish(required()));
$('migrateButton').onclick=()=>run(async()=>{const a=required(),wasPaused=a.paused;a.paused=true;try{await publish(a);await restore(a.meta.name,a.arena==='A'?'B':'A');}catch(e){a.paused=wasPaused;throw e;}});
$('resumeForm').onsubmit=e=>{e.preventDefault();run(()=>restore($('resumeName').value.trim()));};
$('actor').onchange=()=>{if(backend.mode==='local'){backend.as($('actor').value);journal('Local actor switched',{detail:backend.actor});render();}};
$('grantButton').onclick=()=>run(async()=>{const a=required(),account=backend.mode==='local'?null:runtimeAccount();a.writer=await backend.grant(a.meta,account);$('permissionResult').textContent='Delegated flyns.checkpoint only. Model, identity, aliases and other agents are not included.';journal('Checkpoint-only capability granted',{detail:a.meta.name});});
$('revokeButton').onclick=()=>run(async()=>{const a=required(),account=backend.mode==='local'?null:runtimeAccount();await backend.revoke(a.meta,account);a.writer=false;$('permissionResult').textContent='Checkpoint writer revoked. Offchain simulation may continue; future canonical writes must fail.';journal('Checkpoint writer revoked',{detail:a.meta.name});});
$('probeButton').onclick=()=>run(async()=>{const a=required();try{await backend.probeForbidden(a.meta);$('permissionResult').textContent='Probe would succeed: this actor is privileged. Switch to the separate delegated runtime wallet to demonstrate denial.';journal('Probe allowed — privileged actor',{detail:'eth_call only in live mode. No model record was changed.'});}
  catch(e){const denial=backend.mode==='local'?e.message.includes('LOCAL DENIAL'):permissionDenial(e,{resource:setterResource('flyns.model.sha256'),role:RESOLVER_ROLE.TEXT,account:rpc.account});if(!denial)throw new Error('Permission probe inconclusive: expected ENS authorization error was not verified. '+e.message);$('permissionResult').textContent='Protected model write denied. This was a local check / eth_call preflight, not a mined revert transaction.';journal('Protected write denied (preflight)',{detail:a.meta.name,...(typeof denial==='object'?{authorization:denial}:{})},'denied');}});
$('aliasButton').onclick=()=>run(async()=>{const a=required();a.alias=await backend.alias(a.meta);$('resumeName').value=a.alias;journal('Live record alias verified',{detail:`${a.alias} · wildcard record link, not a newly minted name`});});
$('threeToggle').onchange=()=>run(async()=>{const useThree=$('threeToggle').checked;renderer.dispose();let canvas=$('arena'),fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);
  try{renderer=useThree?await (await import('./ui/arena-three.mjs')).threeArena(fresh,select):canvasArena(fresh,select);$('rendererLabel').textContent=useThree?'THREE.JS OBSERVATORY':'CANVAS OBSERVATORY';}
  catch(e){const replacement=fresh.cloneNode(false);fresh.replaceWith(replacement);renderer=canvasArena(replacement,select);$('threeToggle').checked=false;$('rendererLabel').textContent='CANVAS OBSERVATORY';throw new Error('Optional Three.js bundle is not installed or WebGL is unavailable. Run npm run setup:3d, then reload.');}});
$('exportJournal').onclick=()=>{const data={schema:'flyns.journal.v1',exportedAt:new Date().toISOString(),warning:'LOCAL events are not blockchain evidence. Preflight denials are not mined reverts.',events};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='flyns-journal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('modelCount').textContent=`${graph.nodes.length} NEURONS · ${graph.edges.length} EDGES`;$('provenance').textContent=`${graph.nodes.length}-neuron ${graph.nodes.length===12?'selected-edge fixture':'selected circuit'} · MaleCNS v1.0-derived data · CC BY 4.0. Engineered dynamics and inputs; this is not the full brain.`;
await initLocal();const query=new URLSearchParams(location.search);if(query.has('resume'))$('resumeName').value=query.get('resume');if(query.get('arena')==='B')arena='B';render();
let last=performance.now(),acc=0,uiLast=0;function frame(now){const delta=Math.min(.12,(now-last)/1000);last=now;acc+=delta;while(acc>=ENGINE_CONFIG.dt){for(const a of agents)if(!a.paused)a.engine.step();acc-=ENGINE_CONFIG.dt;}
  renderer.draw(agents.filter(a=>a.arena===arena),selected,now);if(now-uiLast>180){metrics();drawNeural($('neural'),graph,current()?.engine.state);uiLast=now;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
