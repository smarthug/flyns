import {compileCircuit,ENGINE_CONFIG,ENGINE_VERSION} from './circuit.mjs';
export function random(s){let n=s.rng>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/4294967296;}
export function initialState(id,seed,count){
  const s={agentId:id,engine:ENGINE_VERSION,tick:0,rng:(seed>>>0)||1,x:0,y:0,heading:0,energy:1,neural:Array(count).fill(0),motor:{left:0,right:0},environment:{food:[0.6,0.25],threat:0}};
  s.x=(random(s)-0.5)*1.1;s.y=(random(s)-0.5)*1.1;s.heading=random(s)*Math.PI*2;return s;
}
export class FlyEngine{
  constructor(graph,state,{silenced=false}={}){this.circuit=compileCircuit(graph,{silenced});this.state=structuredClone(state);if(this.state.neural.length!==this.circuit.count)throw new Error('State/circuit mismatch');}
  step(){
    const s=this.state,c=this.circuit,{dt,leak,gain,baseline}=ENGINE_CONFIG;
    const drive=new Float64Array(c.count);
    for(const [a,b,w] of c.edges)drive[b]+=s.neural[a]*w;
    const angle=Math.atan2(s.environment.food[1]-s.y,s.environment.food[0]-s.x)-s.heading;
    const sideSignal=Math.sin(angle), proximity=1/(1+Math.hypot(s.x-s.environment.food[0],s.y-s.environment.food[1]));
    // Engineered sensory encoder, NOT measured neural response amplitudes.
    for(const i of c.inputs)drive[i]+=0.15+0.55*proximity*(1+c.sides[i]*sideSignal)+s.environment.threat*0.8;
    s.neural=s.neural.map((v,i)=>(1-leak)*v+leak*Math.max(0,Math.tanh(gain*drive[i]+baseline)));
    let l=0,r=0,nl=0,nr=0;
    for(const i of c.outputs){if(c.sides[i]<0){l+=s.neural[i];nl++;}else{r+=s.neural[i];nr++;}}
    l/=Math.max(1,nl);r/=Math.max(1,nr);s.motor={left:l,right:r};
    // Engineered motor readout. No learning, evolutionary optimisation or LLM.
    s.heading+=(2.2*(r-l)+(random(s)-0.5)*0.9)*dt;
    const speed=0.08+0.34*(l+r);s.x+=Math.cos(s.heading)*speed*dt;s.y+=Math.sin(s.heading)*speed*dt;
    const radius=Math.hypot(s.x,s.y);if(radius>0.88){s.x*=0.88/radius;s.y*=0.88/radius;s.heading+=Math.PI*0.73;}
    s.energy=Math.max(0.05,s.energy-0.00004);
    if(Math.hypot(s.x-s.environment.food[0],s.y-s.environment.food[1])<0.12)s.energy=Math.min(1,s.energy+0.004);
    s.tick++;return s;
  }
  snapshot(){return structuredClone(this.state);}
}
