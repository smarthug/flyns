export const ENGINE_VERSION='flyns-rate-v1';
export const ENGINE_CONFIG=Object.freeze({dt:0.04,leak:0.22,gain:1.6,baseline:0.04});
export function validateCircuit(g){
  if(!g||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||g.nodes.length<2||g.nodes.length>10000||g.edges.length>200000)throw new Error('Invalid or oversized circuit');
  const ids=new Set();
  for(const n of g.nodes){if(!Number.isSafeInteger(n.id)||ids.has(n.id)||![-1,0,1].includes(n.sign)||!Array.isArray(n.position)||n.position.length!==3||!n.position.every(Number.isFinite))throw new Error('Invalid neuron');ids.add(n.id);}
  const pairs=new Set();
  for(const e of g.edges){if(!Array.isArray(e)||e.length!==3||!Number.isInteger(e[0])||!Number.isInteger(e[1])||e[0]<0||e[1]<0||e[0]>=g.nodes.length||e[1]>=g.nodes.length||!Number.isFinite(e[2])||e[2]<=0)throw new Error('Invalid edge');const key=e[0]+':'+e[1];if(pairs.has(key))throw new Error('Duplicate edge');pairs.add(key);}
  if(g.inputTargets&&!g.inputTargets.every(i=>Number.isInteger(i)&&i>=0&&i<g.nodes.length))throw new Error('Invalid input targets');
  return g;
}
export function compileCircuit(graph,{silenced=false}={}){
  validateCircuit(graph);const count=graph.nodes.length,totals=new Float64Array(count);
  graph.edges.forEach(([,to,w])=>totals[to]+=w);
  const edges=graph.edges.map(([a,b,w])=>[a,b,silenced?0:w*graph.nodes[a].sign/Math.max(1,totals[b])]);
  const inputs=graph.inputTargets||graph.nodes.flatMap((n,i)=>n.role==='input'?[i]:[]);
  const outputs=graph.nodes.flatMap((n,i)=>n.role==='output'?[i]:[]);
  const mid=(Math.max(...graph.nodes.map(n=>n.position[0]))+Math.min(...graph.nodes.map(n=>n.position[0])))/2;
  return {count,edges,inputs,outputs:outputs.length?outputs:[0,count-1],sides:graph.nodes.map(n=>n.position[0]<mid?-1:1)};
}
