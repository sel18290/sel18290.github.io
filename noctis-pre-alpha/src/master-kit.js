import * as T from '../vendor/three.module.js';
import { createMaterials } from './models.js';
import { applyCortexPalette, CORTEX_ART } from './art-direction.js';
import { block, beam, pipe, plate, part } from './industrial-parts.js';
import { batchRigidParts } from './mechanical-rig.js';

const TAU = Math.PI * 2;
const shapes = new Map();
function cached(key, build) {
  if (!shapes.has(key)) shapes.set(key, build());
  return shapes.get(key);
}

// Variants share immutable texture image data. Cloning a map is necessary only
// when its UV transform changes; never alter the repeat of the source material.
export function materialVariant(source, { color, roughness, metalness, intensity, repeat, relief } = {}) {
  const m = source.clone();
  if (color !== undefined) m.color.set(color);
  if (roughness !== undefined && 'roughness' in m) m.roughness = T.MathUtils.clamp(roughness, 0, 1);
  if (metalness !== undefined && 'metalness' in m) m.metalness = T.MathUtils.clamp(metalness, 0, 1);
  if (intensity !== undefined && m.emissive) m.emissiveIntensity = Math.max(0, intensity);
  if (relief !== undefined && m.normalScale) m.normalScale.setScalar(Math.max(0, relief));
  if (repeat && repeat.every(v => Number.isFinite(v) && v > 0)) {
    for (const name of ['map', 'normalMap', 'roughnessMap']) {
      if (!m[name]) continue;
      m[name] = m[name].clone();
      m[name].repeat.set(...repeat);
      m[name].needsUpdate = true;
    }
  }
  return m;
}

export function createKitMaterials(style = CORTEX_ART, { textures = true } = {}) {
  const m = applyCortexPalette(createMaterials({ textures }));
  m.dark.color.set(style.graphite ?? CORTEX_ART.graphite);
  m.steel.color.set(style.steel ?? CORTEX_ART.steel);
  m.cyan.color.set(style.signal ?? CORTEX_ART.signal);
  m.titanium = materialVariant(m.chrome, { roughness: .46 });
  m.aluminium = materialVariant(m.steel, { color: 0xaaa9a7, roughness: .48, metalness: .84 });
  m.anodized = materialVariant(m.shell, { color: style.graphite, roughness: .38 });
  m.composite = materialVariant(m.dark, { roughness: .7, metalness: .14 });
  m.polymer = materialVariant(m.rubber, { color: 0x363239, roughness: .66, metalness: .02 });
  m.emitter = new T.MeshStandardMaterial({ color: style.signal, emissive: style.signal, emissiveIntensity: style.effects?.emission ?? .8, roughness: .3, metalness: .12 });
  m.screen = new T.MeshStandardMaterial({ color: style.screen, emissive: style.screen, emissiveIntensity: .65, roughness: .32, metalness: .24 });
  // Thin tinted glass; intentionally avoid screen-space transmission passes.
  m.glass = new T.MeshPhysicalMaterial({ color: 0x524750, transparent: true, opacity: .25, depthWrite: false, roughness: .12, clearcoat: 1 });
  m.hologlass = m.glass.clone();
  m.hologlass.color.set(style.signal ?? CORTEX_ART.signal);
  m.hologlass.opacity = .34;
  for (const [name, material] of Object.entries(m)) material.name = name;
  return m;
}

function joint(root, name, position) {
  const g = new T.Group();
  g.name = name;
  g.position.set(...position);
  root.add(g);
  return g;
}

function drive(node, type, axis, amplitude, speed, behavior) {
  node.userData.dynamic = true;
  node.userData.drive = { type, axis, amplitude, speed, ...(behavior && {behavior}) };
  return node;
}

function collar(root, name, position, radius, height, material, segments) {
  const geo = cached('collar-' + segments, () => new T.CylinderGeometry(1, 1, 1, segments));
  return part(root, name, geo, material, position, [radius, height, radius]);
}

function ring(root, name, radius, tube, position, material, segments) {
  return part(root, name, cached('ring-' + [radius,tube,segments], () => new T.TorusGeometry(radius,tube,8,segments)), material, position);
}

function base(root, width, depth, m) {
  block(root,'anchor-plate',[0,.075,0],[width,.15,depth],m.anodized,true);
  for (const x of [-1,1]) for (const z of [-1,1]) {
    collar(root,'anchor-lock',[x*(width/2-.105),.167,z*(depth/2-.105)],.05,.034,m.aluminium,6);
  }
}

function ports(root, name, position, normal) {
  const socket = joint(root, 'port.' + name, position);
  socket.userData.socket = { role: name, normal, frame: 'local' };
  return socket;
}

function server(root,m,v,detail) {
  const count = 4 + v % 3, step = .49, top = .42 + count*step;
  base(root,1.84,1.32,m);
  for (const side of [-1,1]) {
    block(root,'rack-upright',[side*.78,(top+.15)/2,0],[.14,top-.15,1.05],m.titanium,true);
    pipe(root,'coolant-column',[side*.64,.2,-.58],[side*.64,top,-.58],.08,m.copper);
  }
  for (let i=0;i<count;i++) {
    const cartridge = joint(root,'blade.' + i,[0,.52+i*step,0]);
    if (i===1) drive(cartridge,'slide','z',.025,.72,'diagnostic');
    block(cartridge,'drawer',[0,0,0],[1.45,.415,.94],m.composite,true);
    block(cartridge,'face',[0,0,.475],[1.47,.346,.055],m.anodized,true);
    for (let slot=0;slot<(detail === 24 ? 2 : 4);slot++)
      block(cartridge,'intake',[0,-.105+slot*.053,.508],[.82,.021,.012],m.rubber);
    for (const side of [-1,1]) {
      pipe(cartridge,'drawer-grip',[side*.584,-.09,.55],[side*.584,.09,.55],.027,m.aluminium,12);
      for (const y of [-.09,.09]) pipe(cartridge,'grip-foot',[side*.584,y,.50],[side*.584,y,.55],.027,m.aluminium,12);
    }
    block(cartridge,'readout',[.47,.07,.509],[.08,.03,.012],m.emitter);
    if(i===1) batchRigidParts(cartridge);
  }
  block(root,'rack-header',[0,top-.045,0],[1.68,.18,1.13],m.shell,true);
  ports(root,'coolant',[.64,top,-.58],[0,1,0]);
}

function reactor(root,m,v,detail) {
  base(root,2.85,2.85,m);
  const height=2.8 + .24*(v%3);
  collar(root,'vessel-flange',[0,.31,0],1.28,.32,m.steel,detail);
  collar(root,'lower-insulator',[0,.59,0],1,.29,m.polymer,detail);
  collar(root,'containment-vessel',[0,height/2+.27,0],.7,height-.6,m.titanium,detail);
  for(let i=0;i<6;i++){
    const angle=i*TAU/6,x=Math.cos(angle),z=Math.sin(angle);
    pipe(root,'magnetic-support',[x*.96,.6,z*.96],[x*1.1,height-.16,z*1.1],.085,m.steel);
    const channel=pipe(root,'flux-channel',[x*.711,.72,z*.711],[x*.711,height-.32,z*.711],.023,i===0?m.emitter.clone():m.emitter,12);
    if(i===0) drive(channel,'pulse','y',.23,.84,'energy');
  }
  const drum=drive(joint(root,'coil-carrier',[0,height*.55,0]),'rotate','y',1,.12);
  for (const y of [-.19,.19]) {
    const coil=ring(drum,'induction-coil',.86,.052,[0,y,0],m.copper,detail);
    coil.rotation.x=Math.PI/2;
  }
  for(let i=0;i<4;i++){
    const a=i*TAU/4;
    block(drum,'coil-contact',[Math.cos(a)*.86,0,Math.sin(a)*.86],[.09,.44,.09],m.aluminium,true);
  }
  batchRigidParts(drum);
  collar(root,'vessel-crown',[0,height,0],1.19,.33,m.anodized,detail);
  ports(root,'power',[0,height+.166,0],[0,1,0]);
}

function robot(root,m,v,detail) {
  base(root,2.48,2.28,m);
  collar(root,'slewing-race',[0,.39,0],.72,.48,m.steel,detail);
  const turret=drive(joint(root,'slew-axis',[0,.63,0]),'swing','y',.22,.32);
  collar(turret,'slewing-head',[0,.18,0],.59,.36,m.anodized,detail);
  const shoulder=drive(joint(turret,'shoulder',[0,.42,0]),'swing','z',.08,.45);
  const h=1.12+.1*(v%3);
  function bearing(at, parent, radius) {
    const [x,y,z]=at;
    pipe(parent,'motor',[x,y,z-.23],[x,y,z+.23],radius,m.steel,detail);
    pipe(parent,'cap',[x,y,z+.23],[x,y,z+.27],radius*.75,m.titanium,detail);
  }
  bearing([0,0,0],shoulder,.24);
  for(const z of [-.13,.13]) beam(shoulder,'upper-fork',[0,0,z],[-.55,h,z],.16,.085,m.shell);
  const elbow=drive(joint(shoulder,'elbow',[-.55,h,0]),'swing','z',.095,.59);
  bearing([0,0,0],elbow,.18);
  beam(elbow,'tool-carrier',[0,0,0],[1.13,.38,0],.22,.26,m.aluminium);
  pipe(elbow,'return-line',[0,.15,-.15],[1.1,.53,-.15],.037,m.rubber,12);
  bearing([1.13,.38,0],elbow,.127);
  pipe(elbow,'spindle',[1.13,.38,0],[1.13,.0,0],.08,m.titanium,detail);
  for(const x of [-1,1]) beam(elbow,'pincer',[1.13+x*.1,.05,0],[1.13+x*.065,-.15,0],.047,.082,m.composite);
  ports(elbow,'tool',[1.13,-.14,0],[0,-1,0]);
  batchRigidParts(elbow);
}

function terminal(root,m,v,detail) {
  base(root,1.58,1.1,m);
  beam(root,'cantilever',[0,.15,0],[0,1.08,-.16],.26,.32,m.steel);
  const fascia=joint(root,'operator-panel',[0,1.09,-.1]);
  fascia.rotation.x=-.21;
  const width=1.45+.09*(v%3);
  plate(fascia,'console-back',width,.75,.12,[0,.32,0],m.titanium);
  plate(fascia,'screen',width-.12,.62,.025,[0,.32,.083],m.composite);
  const columns=detail===24?9:15;
  for(let i=0;i<columns;i++){
    const h=.09+(1+Math.sin(i*.65+v))*.11;
    block(fascia,'signal-sample',[(i-(columns-1)/2)*1.02/columns,.14+h/2,.103],[.52/columns,h,.013],i%4?m.screen:m.emitter);
  }
  block(fascia,'diagnostic-track',[0,.53,.105],[1.05,.016,.014],m.anodized);
  drive(block(fascia,'diagnostic-cursor',[0,.53,.117],[.07,.032,.014],m.screen),'slide','x',.41,.77);
  ports(root,'data',[0,.3,-.15],[0,0,-1]);
}

function sensor(root,m,v,detail) {
  base(root,1.34,1.34,m);
  const h=1.73+.16*(v%3);
  collar(root,'vibration-isolator',[0,.25,0],.45,.2,m.polymer,detail);
  pipe(root,'instrument-column',[0,.35,0],[0,h,0],.113,m.titanium,detail);
  const head=drive(joint(root,'scanner-head',[0,h,0]),'swing','y',.34,.56);
  for(const x of [-.33,.33]) beam(head,'gimbal-cheek',[x*.5,0,0],[x,.34,0],.09,.12,m.steel);
  pipe(head,'optic-axis',[-.36,.34,0],[.36,.34,0],.087,m.aluminium,detail);
  pipe(head,'optical-barrel',[0,.34,-.26],[0,.34,.23],.245,m.anodized,detail);
  pipe(head,'lens-housing',[0,.34,.23],[0,.34,.29],.21,m.titanium,detail);
  const lens=pipe(head,'sensor-lens',[0,.34,.295],[0,.34,.307],.167,m.emitter.clone(),detail);
  drive(lens,'pulse','z',.25,.98,'sensor');
  const focusSleeve=drive(joint(head,'focus-carriage',[0,.34,.22]),'slide','z',.018,.75,'proximity');
  ring(focusSleeve,'aperture-bezel',.189,.014,[0,0,.055],m.chrome,detail);
  ring(head,'optical-seal',.174,.012,[0,.34,.303],m.rubber,detail);
  ports(root,'power',[0,.28,-.44],[0,0,-1]);
  batchRigidParts(head);
}

// Every cartridge is modeled along local +Y from its mating surface. Port orientation,
// diameter class and occupancy are validated before insertion. No content executes from JSON.
const attachmentCatalog=Object.freeze({
  'coolant-gauge':{role:'coolant',diameter:.10},
  'flux-probe':{role:'power',diameter:.10},
  'tool-probe':{role:'tool',diameter:.08},
  'data-beacon':{role:'data',diameter:.08},
  'service-hatch':{role:'service',diameter:.14}
});
export const ATTACHMENT_KINDS=Object.freeze(Object.keys(attachmentCatalog));
export function installAttachment(root,id,m,detail=48) {
  if(!Object.hasOwn(attachmentCatalog,id)) throw Error('Accessoire inconnu : '+id);
  const {role,diameter}=attachmentCatalog[id];
  const socket=root.getObjectByName('port.'+role);
  if(!socket || socket.children.length) throw Error('Prise incompatible ou occupée : '+role);
  const a=joint(socket,'attachment.'+id,[0,0,0]);
  a.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...socket.userData.socket.normal));
  collar(a,'mount-flange',[0,.018,0],diameter,.036,m.titanium,detail);
  if(id==='service-hatch'){
    // Local +Y points out of the enclosure; the hinge lies across the lower edge.
    const pivot=drive(joint(a,'inspection-hinge',[0,.025,.26]),'swing','x',.28,.34,'opening');
    block(pivot,'service-cover',[0,.03,-.24],[.52,.058,.48],m.anodized,true);
    for(const side of [-1,1]){
      pipe(a,'hinge-pin',[side*.18-.04,.025,.26],[side*.18+.04,.025,.26],.042,m.titanium,detail);
      collar(pivot,'retainer',[side*.21,.063,-.42],.03,.02,m.aluminium,6);
    }
    batchRigidParts(pivot);
  }else if(id==='tool-probe'){
    collar(a,'tool-collet',[0,.058,0],.057,.08,m.anodized,detail);
    collar(a,'probe-shank',[0,.17,0],.021,.15,m.aluminium,detail);
    collar(a,'probe-tip',[0,.248,0],.028,.016,m.emitter,detail);
  }else if(id==='coolant-gauge'){
    collar(a,'pressure-neck',[0,.07,0],.048,.09,m.copper,detail);
    pipe(a,'gauge-housing',[0,.20,-.045],[0,.20,.035],.13,m.anodized,detail);
    pipe(a,'gauge-face',[0,.20,.036],[0,.20,.043],.112,m.screen,detail);
    const dial=drive(joint(a,'pressure-needle',[0,.20,.047]),'swing','z',.31,.54);
    block(dial,'needle',[0,.038,.001],[.012,.078,.008],m.dark);
  }else{
    collar(a,'instrument-body',[0,.092,0],.08,.15,m.anodized,detail);
    for(const y of [.061,.102,.143])collar(a,'thermal-ring',[0,y,0],.092,.014,m.aluminium,detail);
    const lens=collar(a,'status-lens',[0,.183,0],.062,.04,m.emitter.clone(),detail);
    drive(lens,'pulse','y',.29,.72,id==='flux-probe'?'energy':'standby');
  }
  return a;
}

function cooler(root,m,v,detail){
  base(root,2.38,1.82,m);
  const n=3+v%3,h=1.75+n*.12;
  for(const side of [-1,1]){
    pipe(root,'supply-manifold',[side*.86,.23,-.45],[side*.86,h,-.45],.115,m.copper,detail);
    for(let i=0;i<n;i++){
      const z=-.36+i*.18;
      block(root,'heat-exchanger-fin',[side*.52,h*.52,z],[.42,h*.65,.044],m.aluminium,true);
    }
  }
  block(root,'outlet-plenum',[0,h,.02],[1.95,.24,1.36],m.shell,true);
  const fan=drive(joint(root,'impeller',[0,h+.17,0]),'rotate','y',1,.53);
  collar(fan,'impeller-hub',[0,0,0],.14,.10,m.titanium,detail);
  for(let i=0;i<7;i++){
    const vane=joint(fan,'vane',[0,0,0]);vane.rotation.y=i*TAU/7;
    const blade=block(vane,'blade',[.27,0,0],[.34,.042,.14],m.anodized,true);blade.rotation.x=.21;
  }
  for(const x of [-.45,-.225,0,.225,.45])pipe(root,'fan-guard',[x,h+.28,-.5],[x,h+.28,.5],.015,m.titanium,12);
  batchRigidParts(fan);
  ports(root,'coolant',[.86,h+.02,-.45],[0,1,0]);
}
function relay(root,m,v,detail){
  base(root,1.78,1.32,m);
  const h=1.7+.14*(v%3);
  block(root,'enclosure',[0,.15+h/2,0],[1.44,h,1],m.anodized,true);
  plate(root,'removable-panel',1.32,h-.18,.045,[0,.15+h/2,.513],m.shell);
  for(let i=0;i<4;i++)block(root,'vent',[.32,.5+.13*i,.55],[.43,.037,.022],m.rubber);
  const light=block(root,'service-indicator',[.34,h-.17,.554],[.28,.067,.02],m.emitter.clone());
  drive(light,'pulse','y',.18,.61,'fault');
  ports(root,'service',[-.31,.92,.55],[0,0,1]);
}
function scanner(root,m,v,detail){
  base(root,2.36,1.62,m);
  const top=2.37+(v%3)*.13;
  for(const side of [-1,1]){
    block(root,'guide-column',[side*.86,(top+.15)/2,0],[.23,top-.15,.39],m.steel,true);
    pipe(root,'guide-rail',[side*.77,.24,.21],[side*.77,top-.1,.21],.04,m.chrome,detail);
  }
  block(root,'crosshead',[0,top,0],[1.98,.23,.5],m.anodized,true);
  const sleeve=joint(root,'fixed-cylinder',[0,.59,0]);
  sleeve.userData.dynamic=true; // Retain this stationary articulation reference across batching.
  collar(sleeve,'sleeve-wall',[0,0,0],.115,.86,m.anodized,detail);
  collar(root,'rod-bushing',[0,1.031,0],.124,.046,m.titanium,detail);
  const carriage=drive(joint(root,'scan-carriage',[0,1.26,0]),'slide','y',.30,.39,'piston');
  // The chrome rod remains captive in the fixed cylinder at both ends of its stroke.
  collar(carriage,'piston-rod',[0,-.32,0],.061,.64,m.chrome,detail);
  block(carriage,'scan-bar',[0,.02,.13],[1.58,.16,.36],m.shell,true);
  for(const x of [-.5,-.25,0,.25,.5])pipe(carriage,'detector',[x,.02,.28],[x,.02,.33],.032,m.emitter,detail);
  batchRigidParts(carriage);
  ports(root,'data',[0,top,.26],[0,0,1]);
}

const builders = Object.freeze({server,reactor,robot,terminal,sensor,cooler,relay,scanner});
export const EQUIPMENT_KINDS = Object.freeze(Object.keys(builders));
export function buildEquipment(kind, materials, {variant=0,profile='balanced',attachments}={}) {
  if(!Object.hasOwn(builders,kind)) throw Error('Équipement inconnu : ' + kind);
  if(!Number.isSafeInteger(variant)||variant<0) throw Error('Variante invalide');
  const detail={economy:24,balanced:48,cinematic:64}[profile];
  if(!detail) throw Error('Profil graphique inconnu');
  const root=new T.Group();
  root.name='kit.'+kind;
  root.userData.family='master.'+kind;
  root.userData.variant=variant;
  root.userData.anchor='floor-center';
  builders[kind](root,materials,variant,detail);
  const accessories=attachments??({server:['coolant-gauge'],reactor:['flux-probe'],robot:['tool-probe'],terminal:['data-beacon'],relay:['service-hatch'],cooler:['coolant-gauge'],scanner:['data-beacon']}[kind]??[]);
  if(!Array.isArray(accessories)||accessories.length>4)throw Error('Liste d’accessoires invalide');
  for(const id of accessories)installAttachment(root,id,materials,detail);
  batchRigidParts(root);
  return root;
}
