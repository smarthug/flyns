/** Optional Three.js renderer. Install with npm run setup:3d. Original procedural
 * geometry: not Flybody, not a biomechanical model. The same FlyEngine drives both renderers.
 */
export async function threeArena(canvas,onSelect){
  const T=await import('../../vendor/three/three.module.js');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0x101a15);const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(39,1,.01,100);camera.position.set(0,1.65,2.3);camera.lookAt(0,0,0);
  scene.add(new T.HemisphereLight(0xd6e8bd,0x223729,2));const sun=new T.DirectionalLight(0xc5edb7,3);sun.position.set(2,3,1);scene.add(sun);
  const floor=new T.Mesh(new T.CylinderGeometry(1,1,.035,80),new T.MeshStandardMaterial({color:0x233725,roughness:.8}));floor.position.y=-.03;scene.add(floor);
  for(const radius of [1,.97,.7,.4]){const ring=new T.Mesh(new T.TorusGeometry(radius,.003,5,100),new T.MeshBasicMaterial({color:radius>.9?0x759066:0x3c583b}));ring.rotation.x=Math.PI/2;scene.add(ring);}
  const food=new T.Group();for(let i=0;i<7;i++){const p=new T.Mesh(new T.IcosahedronGeometry(.012,0),new T.MeshStandardMaterial({color:0xb4d585}));p.position.set(Math.cos(i*2.4)*.025,.014,Math.sin(i*2.4)*.025);food.add(p);}scene.add(food);
  const groups=new Map(),resources=[];let last=[];
  const makeFly=(name,index)=>{
    const group=new T.Group(),mat=new T.MeshStandardMaterial({color:[0xbdb579,0xc59b73,0x91b0b2][index%3],roughness:.65}),dark=new T.MeshStandardMaterial({color:0x595d42}),eye=new T.MeshStandardMaterial({color:0x944f3a});
    function ellipsoid(x,z,sx,sy,sz,material){const m=new T.Mesh(new T.SphereGeometry(1,14,10),material);m.scale.set(sx,sy,sz);m.position.set(x,.037,z);group.add(m);return m;}
    ellipsoid(-.032,0,.045,.022,.022,mat);ellipsoid(.018,0,.027,.02,.024,dark);ellipsoid(.05,0,.018,.016,.018,mat);ellipsoid(.06,.012,.011,.012,.009,eye);ellipsoid(.06,-.012,.011,.012,.009,eye);
    const wings=[];for(const sign of [-1,1]){const wing=ellipsoid(-.025,sign*.023,.055,.002,.019,new T.MeshStandardMaterial({color:0xe2ecda,transparent:true,opacity:.44,side:T.DoubleSide,roughness:.2}));wing.rotation.y=sign*.37;wing.position.y=.06;wings.push(wing);for(let j=0;j<3;j++){const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(.02-j*.024,.035,sign*.012),new T.Vector3(.035-j*.03,.014,sign*.039),new T.Vector3(.05-j*.048,.005,sign*.06)]);group.add(new T.Line(geo,new T.LineBasicMaterial({color:0xa4ae85})));}}
    const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=64;const c=labelCanvas.getContext('2d');c.fillStyle='#16261dee';c.fillRect(0,0,512,64);c.font='22px monospace';c.textAlign='center';c.fillStyle='#c5edb7';c.fillText(name,256,42);
    const texture=new T.CanvasTexture(labelCanvas),sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true}));sprite.scale.set(.5,.063,1);sprite.position.set(0,.19,0);group.add(sprite);resources.push(texture);scene.add(group);return {group,wings,sprite};
  };
  const resize=()=>{const b=canvas.getBoundingClientRect();renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();};const obs=new ResizeObserver(resize);obs.observe(canvas);resize();
  const click=e=>{const b=canvas.getBoundingClientRect(),p=new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),ray=new T.Raycaster();ray.setFromCamera(p,camera);const point=new T.Vector3();if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point)){let nearest=null,dist=.2;for(const a of last){const d=Math.hypot(a.engine.state.x-point.x,a.engine.state.y-point.z);if(d<dist){dist=d;nearest=a;}}if(nearest)onSelect(nearest.meta.name);}};canvas.addEventListener('click',click);
  return {draw(agents,selected,time){last=agents;for(const obj of groups.values())obj.group.visible=false;agents.forEach((a,i)=>{let obj=groups.get(a.meta.agentId);if(!obj){obj=makeFly(a.meta.name,i);groups.set(a.meta.agentId,obj);}obj.group.visible=true;obj.group.position.set(a.engine.state.x,0,a.engine.state.y);obj.group.rotation.y=-a.engine.state.heading;obj.sprite.material.opacity=selected===a.meta.name?1:.6;for(let k=0;k<2;k++)obj.wings[k].rotation.x=a.paused?0:Math.sin(time*.055)*.3*(k?1:-1);});const p=agents[0]?.engine.state.environment.food||[.6,.25];food.position.set(p[0],0,p[1]);renderer.render(scene,camera);},dispose(){obs.disconnect();canvas.removeEventListener('click',click);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});resources.forEach(r=>r.dispose());renderer.dispose();}};
}
