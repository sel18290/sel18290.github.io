import * as T from '../vendor/three.module.js';

const TAU = Math.PI * 2;
const UP = new T.Vector3(0, 1, 0);

function turned(profile, segments) {
  return new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), segments);
}

// All tooling is in local metres. Y is vertical, +Z faces the operator.
function kit(m) {
  const seal = turned([[.72,0],[1,0],[1,.1],[.94,.18],[.94,.44],[1,.48],
    [1,.56],[.92,.63],[.92,.84],[.84,1],[.63,1],[.63,.91]], 40);
  const pins = new T.CylinderGeometry(1,1,1,6);
  const tube = new T.CylinderGeometry(1,1,1,10);
  const trace = new T.CylinderGeometry(1,1,1,5);
  const shapes = { seal, pins, tube, trace, plate:new T.BoxGeometry(),
    cover:turned([[.65,0],[.91,.21],[1,.4],[1,.62],[.9,.81],[.59,1],[.15,1]],40),
    bead:new T.SphereGeometry(1,10,7) };
  const luminous = new T.MeshStandardMaterial({color:0xcf1c28,emissive:0xff172d,emissiveIntensity:2.1,roughness:.34});
  const pixel = new T.MeshBasicMaterial({color:0xffafb0});
  return {shapes, materials:{...m, luminous, pixel}, glass:new T.CylinderGeometry(1,1,1,48,1,true)};
}

function batch(room, tools) {
  const sets = new Map();
  const transform = new T.Object3D();
  let frame = new T.Matrix4();
  const group = new T.Group();
  group.name = 'scientific-instruments-'+room.id;
  function mount(x,y,z,yaw,scale=1) {
    frame = new T.Matrix4().makeRotationY(yaw).scale(new T.Vector3(scale,scale,scale)).setPosition(x,y,z);
  }
  function part(form, finish, pos, size, rotation) {
    transform.position.set(...pos);
    transform.scale.set(...size);
    transform.quaternion.copy(rotation || new T.Quaternion());
    transform.updateMatrix();
    const key = form+'/'+finish;
    if(!sets.has(key)) sets.set(key, {form,finish,list:[]});
    sets.get(key).list.push(new T.Matrix4().multiplyMatrices(frame,transform.matrix));
  }
  function link(a,b,r,finish,form='tube') {
    const v=new T.Vector3(...b).sub(new T.Vector3(...a));
    const len=v.length();
    if(len<1e-5) return;
    const q=new T.Quaternion().setFromUnitVectors(UP,v.divideScalar(len));
    part(form,finish,a.map((c,i)=>(c+b[i])*.5),[r,len,r],q);
  }
  function glass(pos,r,h) {
    // Independent sorting per transparent vessel (the opaque interior is batched).
    const shell=new T.Mesh(tools.glass,tools.materials.glass);
    shell.name='borosilicate-envelope';
    shell.matrixAutoUpdate=false;
    shell.matrix.multiplyMatrices(frame,new T.Matrix4().makeScale(r,h,r).setPosition(...pos));
    group.add(shell);
  }
  function finish() {
    for(const {form,finish,list} of sets.values()) {
      const mesh=new T.InstancedMesh(tools.shapes[form],tools.materials[finish],list.length);
      mesh.name=form+'-'+finish;
      list.forEach((mat,i)=>mesh.setMatrixAt(i,mat));
      mesh.computeBoundingSphere();
      mesh.receiveShadow=true;
      group.add(mesh);
    }
    return group;
  }
  return {mount,part,link,glass,finish};
}

function diagnostics(b, x,y,z,phase) {
  b.part('plate','anodized',[x,y,z],[.98,.54,.09]);
  b.part('plate','dark',[x,y,z+.052],[.86,.43,.022]);
  for(let i=0;i<5;i++) {
    b.part('plate','steel',[x-.37+i*.18,y,z+.068],[.005,.34,.004]);
  }
  let previous;
  for(let i=0;i<34;i++) {
    const t=i/33;
    const peak=Math.exp(-Math.pow((t-.58)*18,2));
    const point=[x-.38+t*.76,y+.025+Math.sin(t*15+phase)*.018+peak*Math.sin(t*90)*.12,z+.071];
    if(previous)b.link(previous,point,.006,'pixel','trace');
    previous=point;
  }
  for(let i=0;i<6;i++)b.part('plate',i<4?'luminous':'steel',[x-.33+i*.067,y-.15,z+.073],[.041,.017,.009]);
}

// Deterministic, bifurcating electrodes join the two insulated bus caps.
function filaments(b, seed) {
  const level = i => .21+i*.16;
  const trunk = i => [Math.sin(i*.74+seed)*.037,level(i),Math.sin(i*.63)*.046];
  for(let i=1;i<=9;i++)b.link(trunk(i-1),trunk(i),.024,'luminous','trace');
  for(let side=0;side<2;side++)for(let j=0;j<6;j++) {
    const start=trunk(3+j%3);
    const ang=j*TAU/6+seed+side*.58;
    const dy=side===0?.9:-.55;
    let last=start;
    for(let k=1;k<=4;k++) {
      const t=k/4, a=ang+Math.sin(t*4+j)*.22;
      const r=.37*Math.pow(t,.83);
      const next=[start[0]+Math.cos(a)*r,start[1]+dy*t,start[2]+Math.sin(a)*r];
      b.link(last,next,.019-.0025*k,'luminous','trace');
      if(k===2||k===3) {
        const twig=[next[0]+Math.cos(a+.7)*.076,next[1]+dy*.17,next[2]+Math.sin(a+.7)*.076];
        b.link(next,twig,.008,'pixel','trace');
      }
      last=next;
    }
  }
}

function vessel(b,phase) {
  // Wall trunnions and triangulated outriggers carry the upper and lower seals.
  for(const y of [.02,1.92]) {
    b.part('plate','anodized',[0,y,-.98],[1.26,.36,.12]);
    for(const s of [-1,1]){
      b.link([s*.46,y,-1],[s*.41,y,-.24],.088,'steel');
      b.link([s*.46,y+.28,-.99],[s*.41,y,-.24],.046,'aluminium');
    }
  }
  b.glass([0,1.02,0],.47,1.60);
  for(const y of [0,1.79]){
    b.part('seal','titanium',[0,y,0],[.57,.23,.57]);
    b.part('tube','luminous',[0,y+.145,0],[.563,.025,.563]);
    for(let k=0;k<10;k++){
      const a=k*TAU/10;
      b.part('pins','steel',[Math.cos(a)*.49,y+.228,Math.sin(a)*.49],[.035,.033,.035]);
    }
  }
  b.part('cover','anodized',[0,2.015,0],[.51,.25,.51]);
  for(const s of [-1,1]) {
    const x=s*.47;
    b.link([x,.13,-.17],[x,1.96,-.17],.036,'titanium');
    b.link([s*.29,2.14,-.07],[s*.29,2.42,-.22],.058,'steel');
    b.link([s*.29,2.42,-.22],[s*.29,2.42,-.95],.058,'steel');
  }
  filaments(b,phase);
  diagnostics(b,0,-.27,.025,phase);
}

function coolantManifold(b) {
  b.part('plate','anodized',[0,.68,-.5],[2.0,1.20,.16]);
  for(const x of [-.68,-.29,.1]) {
    b.part('tube','steel',[x,.67,-.18],[.128,.9,.128]);
    for(const y of [.18,.41,.94,1.16]){
      b.part('tube','titanium',[x,y,-.18],[.15,.048,.15]);
    }
    b.link([x,1.17,-.18],[x,1.39,-.40],.07,'copper');
    b.link([x,.17,-.18],[x,.06,-.40],.07,'steel');
  }
  diagnostics(b,.56,.86,-.17,1);
}

export function buildInstruments(scene,plan,m) {
  const tools=kit(m);
  const root=new T.Group();
  root.name='Diagnostic instruments';
  for(const room of plan.rooms) {
    const b=batch(room,tools);
    const cx=(room.x0+room.x1)/2, cz=(room.z0+room.z1)/2;
    if(room.id==='B') {
      // Elevated assemblies below the catwalk, backs anchored to the north wall.
      for(const s of [-1,1]) {
        b.mount(cx+s*4.9,2.52,room.z0+.79,0,.70);
        vessel(b,s+.7);
      }
    } else if(room.id==='E') {
      for(const s of [-1,1]) {
        b.mount(room.x0+1.1,2.68,cz+s*2.75,Math.PI/2,.88);
        vessel(b,s+2.4);
      }
    } else if(room.id==='D') {
      b.mount(cx,2.20,room.z0+.55,0,.9);
      coolantManifold(b);
    } else continue;
    root.add(b.finish());
  }
  scene.add(root);
  return root;
}
