const COLORS=['#c6e9b5','#e7bd88','#b2cde1','#d8b8d9','#e9d489'];
export function canvasArena(canvas,onSelect){
  const ctx=canvas.getContext('2d');let width=0,height=0,last=[];const trails=new Map();
  const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);};
  const obs=new ResizeObserver(resize);obs.observe(canvas);resize();
  const pos=(x,y)=>[width*.5+x*width*.39,height*.52+y*height*.36];
  const click=e=>{const r=canvas.getBoundingClientRect();let best=null,dist=50;last.forEach(a=>{const p=pos(a.engine.state.x,a.engine.state.y),d=Math.hypot(p[0]-(e.clientX-r.left),p[1]-(e.clientY-r.top));if(d<dist){dist=d;best=a;}});if(best)onSelect(best.meta.name);};canvas.addEventListener('click',click);
  function draw(agents,selected,time){
    if(!width||!height)return;last=agents;ctx.clearRect(0,0,width,height);
    const cx=width*.5,cy=height*.52,rx=width*.41,ry=height*.38;
    ctx.fillStyle='#101a15';ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#294031';for(let x=18;x<width;x+=21)for(let y=18;y<height;y+=21){ctx.beginPath();ctx.arc(x,y,.6,0,Math.PI*2);ctx.fill();}
    const glow=ctx.createRadialGradient(cx,cy,30,cx,cy,rx*1.2);glow.addColorStop(0,'#24433160');glow.addColorStop(1,'#0b151100');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#16291c77';ctx.strokeStyle='#577052';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(const scale of [.975,.88,.6,.3]){ctx.strokeStyle=scale>.9?'#324e35':'#304c314d';ctx.lineWidth=scale>.9?1:.7;ctx.beginPath();ctx.ellipse(cx,cy,rx*scale,ry*scale,0,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='#3b553b55';ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(cx-rx,cy);ctx.lineTo(cx+rx,cy);ctx.moveTo(cx,cy-ry);ctx.lineTo(cx,cy+ry);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<48;i++){const a=i/48*Math.PI*2;ctx.strokeStyle=i%4===0?'#708567':'#3d573d';ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*rx*1.015,cy+Math.sin(a)*ry*1.015);ctx.lineTo(cx+Math.cos(a)*rx*(i%4===0?1.045:1.03),cy+Math.sin(a)*ry*(i%4===0?1.045:1.03));ctx.stroke();}
    const food=agents[0]?.engine.state.environment.food||[.6,.25],p=pos(...food);
    ctx.strokeStyle='#a7cb7880';ctx.beginPath();ctx.arc(p[0],p[1],17,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#9ac177';for(let i=0;i<7;i++){const a=i*2.4;ctx.beginPath();ctx.arc(p[0]+Math.cos(a)*(i%3)*4,p[1]+Math.sin(a)*(i%3)*4,1.8,0,Math.PI*2);ctx.fill();}
    ctx.font='8px ui-monospace, monospace';ctx.fillStyle='#829d78';ctx.textAlign='center';ctx.fillText('STIMULUS FIELD',p[0],p[1]+30);
    agents.forEach((agent,index)=>{
      const s=agent.engine.state,col=COLORS[index%COLORS.length],isSelected=selected===agent.meta.name,[x,y]=pos(s.x,s.y);
      const track=trails.get(agent.meta.agentId)||[];
      if(!track.length||track[track.length-1][2]!==s.tick){track.push([s.x,s.y,s.tick]);if(track.length>110)track.shift();trails.set(agent.meta.agentId,track);}
      ctx.strokeStyle=col+'44';ctx.lineWidth=1;ctx.beginPath();track.forEach((q,i)=>{const [tx,ty]=pos(q[0],q[1]);i?ctx.lineTo(tx,ty):ctx.moveTo(tx,ty);});ctx.stroke();
      if(isSelected){ctx.strokeStyle=col+'88';ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      ctx.save();ctx.translate(x,y);ctx.rotate(s.heading);const flap=agent.paused?0:Math.sin(time*.035+index)*.13;
      ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(-2,5,13,6,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#b3bd9466';ctx.lineWidth=1;for(const sign of [-1,1])for(let leg=0;leg<3;leg++){ctx.beginPath();ctx.moveTo(1-leg*3,sign*2);ctx.lineTo(4-leg*4,sign*(8+Math.sin(time*.018+leg)*1.4));ctx.lineTo(7-leg*7,sign*12);ctx.stroke();}
      ctx.fillStyle='#bdac75';ctx.beginPath();ctx.ellipse(-7,0,9,4.6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#535739';for(const t of [-11,-7,-3]){ctx.beginPath();ctx.moveTo(t,-3.6);ctx.lineTo(t,3.6);ctx.stroke();}
      for(const sign of [-1,1]){ctx.save();ctx.rotate(sign*(.46+flap));ctx.fillStyle='#d5e5d644';ctx.strokeStyle='#dbe8d67a';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(-5,sign*4,13,4,sign*-.25,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-15,sign*7);ctx.stroke();ctx.restore();}
      ctx.fillStyle='#868b62';ctx.beginPath();ctx.ellipse(2,0,5,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9f7658';ctx.beginPath();ctx.arc(8,0,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8b4935';for(const k of [-1,1]){ctx.beginPath();ctx.arc(9,k*2.5,1.8,0,Math.PI*2);ctx.fill();}ctx.restore();
      const name=agent.meta.name;ctx.font='9px ui-monospace, monospace';const tw=ctx.measureText(name).width+18;const lx=Math.min(width-tw-10,Math.max(10,x-tw/2)),ly=Math.min(height-47,y+32);
      ctx.fillStyle=isSelected?'#273f2b':'#14251ce8';ctx.strokeStyle=isSelected?'#6a8d5d':'#35503a';ctx.lineWidth=.7;ctx.beginPath();ctx.roundRect(lx,ly,tw,23,4);ctx.fill();ctx.stroke();ctx.textAlign='left';ctx.fillStyle=col;ctx.fillText(name,lx+9,ly+15);
    });
    ctx.font='8px ui-monospace,monospace';ctx.fillStyle='#658169';ctx.textAlign='left';ctx.fillText('NAMESPACE / SENSORIMOTOR LOOP',22,height-47);
  }
  return {draw,dispose(){obs.disconnect();canvas.removeEventListener('click',click);}};
}
export function drawNeural(canvas,graph,state){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);}
  const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);const w=r.width,h=r.height;ctx.clearRect(0,0,w,h);if(!state)return;
  const count=graph.nodes.length,cols=Math.ceil(count>20?Math.sqrt(count*1.9):count/2),rows=Math.ceil(count/cols);
  const positions=graph.nodes.map((_,i)=>[35+(i%cols+.5)*(w-70)/cols,34+(Math.floor(i/cols)+.5)*(h-72)/rows]);
  graph.edges.forEach(([a,b,weight])=>{const s=state.neural[a]||0;ctx.strokeStyle=graph.nodes[a].sign>0?`rgba(177,212,157,${.09+s*.55})`:`rgba(190,156,114,${.08+s*.4})`;ctx.lineWidth=.3+Math.min(1,Math.log1p(weight)/6);ctx.beginPath();ctx.moveTo(...positions[a]);const ax=(positions[a][0]+positions[b][0])/2,ay=(positions[a][1]+positions[b][1])/2-16;ctx.quadraticCurveTo(ax,ay,...positions[b]);ctx.stroke();});
  graph.nodes.forEach((n,i)=>{const [x,y]=positions[i],v=state.neural[i]||0,sz=count>20?3:6;ctx.fillStyle=n.sign>0?`rgba(197,237,183,${.18+v*.82})`:`rgba(232,180,133,${.18+v*.82})`;ctx.strokeStyle=n.sign>0?'#b2d49c':'#c9a782';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,sz+v*3,0,Math.PI*2);ctx.fill();ctx.stroke();if(count<=20){ctx.fillStyle='#a4b59f';ctx.font='8px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(n.type,x,y+23);ctx.fillStyle='#6c876f';ctx.font='7px ui-monospace,monospace';ctx.fillText(v.toFixed(3),x,y+34);}});
}
