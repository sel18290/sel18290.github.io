import * as THREE from '../vendor/three.module.js';
import {block,beam,pipe,duct,plate,bolt,part,polygon} from './industrial-parts.js';
import {createDeckIrradiance,SERVICE_BAYS} from './deck-irradiance.js';
import {placeAssembly} from './architecture-assets.js';
const PORTAL_OUTER=[[-12.7,0],[-12.7,10.8],[-9.2,15.6],[-4.7,18.4],[4.7,18.4],[9.2,15.6],[12.7,10.8],[12.7,0],[11.8,0],[11.8,10.45],[8.58,14.93],[4.4,17.55],[-4.4,17.55],[-8.58,14.93],[-11.8,10.45],[-11.8,0]];
export function createArchitecture(root,m,{assets}={}){
 const colliders=[],machinePositions=[],manifest={height:18.6,walkableWidth:16.4,architecturalWidth:26.6,levels:['circulation et équipements','galeries de maintenance','charpente et distribution'],functions:['alimentation','refroidissement','calcul neuronal','synchronisation','surveillance']};
 const obstacle=(id,x,z,w,d)=>colliders.push({id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
 const shell=new THREE.Group();shell.name='MONUMENTAL_TECHNOLOGICAL_NAVE';root.add(shell);
 if (m.deck.map) {
  m.deck.lightMap = createDeckIrradiance(18, 27);
  m.deck.lightMapIntensity = 2.7;
 }
 block(shell,'walking_deck',[0,-.16,0],[18,.32,27],m.deck);
 block(shell,'roof_in_shadow',[0,18.65,0],[27,.55,29],m.dark);
 const maintenance=new THREE.MeshBasicMaterial({color:0xffc6ad});maintenance.name='maintenance_warm';for(const side of[-1,1])for(const z of SERVICE_BAYS){block(shell,'architectural_red_luminaire',[side*8.8,6.25,z],[.12,.06,3.0],m.cyan);block(shell,'maintenance_downlight',[side*6.4,8.2,z],[1.8,.07,.10],maintenance);}for(const side of[-1,1])block(shell,'upper_red_structure_light',[side*3.9,15.45,0],[.10,.06,22],m.cyan);
 for(const side of[-1,1]){
  // A cantilever joins each luminaire to its gallery. The opaque backing
  // gives a visible cut-off while exposing the service lamp from the deck.
  for (const z of SERVICE_BAYS) {
   beam(shell, 'maintenance_lamp_cantilever', [side * 8.65, 6.38, z], [side * 6.45, 8.33, z], .14, .12, m.steel);
   block(shell, 'maintenance_lamp_backplate', [side * 6.4, 8.31, z], [1.95,.13,.24], m.shell, true);
  }
  if(side>0)block(shell,'deep_side_enclosure',[side*13.15,8.7,0],[.5,17.4,29],m.dark);else{for(const z of[-10.5,10.5])block(shell,'observation_wall_wing',[-13.15,8.7,z],[.5,17.4,8],m.dark);block(shell,'observation_wall_header',[-13.15,11.8,0],[.5,11,13],m.dark);block(shell,'observation_wall_sill',[-13.15,.6,0],[.5,1.2,13],m.steel);const pane=part(shell,'space_observation_glass',new THREE.PlaneGeometry(13,5.1),new THREE.MeshStandardMaterial({color:0x6a9dae,metalness:.15,roughness:.13,transparent:true,opacity:.06,side:THREE.DoubleSide,depthWrite:false}),[-13.1,3.75,0]);pane.rotation.y=Math.PI/2;}
  // Detachable access skins break up the 29-m enclosure. The observation bay stays clear.
  for (const z of [-12, -8, -4, 0, 4, 8, 12]) {
   if (side < 0 && Math.abs(z) < 8) continue;
   const panel = new THREE.Group();
   panel.name = 'enclosure_panel';
   panel.position.set(side * 12.86, 8.6, z);
   panel.rotation.y = -side * Math.PI / 2;
   shell.add(panel);
   plate(panel, 'enclosure_service_skin', 3.78, 3.6, .10, [0,0,0], m.shell, {bevel:.032});
   for (const x of [-1.55,1.55]) {
    for (const y of [-1.4,1.4]) bolt(panel, [x,y,.067], m.chrome,.047);
   }
   block(panel, 'enclosure_panel_reveal', [0,-1.2,.063], [1.9,.035,.018], m.dark);
  }
  block(shell,'peripheral_restricted_deck',[side*11,-.22,0],[4.5,.44,28],m.steel);
  block(shell,'lower_safety_bund',[side*8.58,.38,0],[.36,.76,26],m.dark,true);obstacle('perimeter',side*8.58,0,.36,26);
  for(const z of[-11,-7,-3,1,5,9,12]){block(shell,'lower_guard_post',[side*8.48,.85,z],[.09,.98,.09],m.shell);bolt(shell,[side*8.25,.23,z],m.chrome);}
  pipe(shell,'low_guard_top',[side*8.48,1.34,-12.5],[side*8.48,1.34,12.5],.045,m.chrome);
  for(const y of[6.35,12.15]){
   block(shell,'maintenance_gallery',[side*10.7,y,0],[4.4,.24,27],m.steel);
   for(const x of [side*8.56,side*12.65]){pipe(shell,'gallery_handrail',[x,y+1.1,-13],[x,y+1.1,13],.037,m.chrome);pipe(shell,'gallery_midrail',[x,y+.57,-13],[x,y+.57,13],.022,m.shell);for(let z=-13;z<=13;z+=2)block(shell,'gallery_rail_post',[x,y+.55,z],[.065,1.1,.065],m.shell);}
   for(let z=-12;z<=12;z+=2){block(shell,'gallery_grille',[side*10.7,y+.145,z],[3.9,.04,1.78],m.dark);for(let k=0;k<6;k++)block(shell,'gallery_floor_rib',[side*10.7,y+.17,z-.65+k*.26],[3.8,.025,.05],m.shell);beam(shell,'gallery_diagonal_brace',[side*8.8,y-.15,z-.8],[side*12.5,y-1.65,z+.8],.17,.17,m.dark);}
  }
  for(const z of[-10,0,10]){const b=placeAssembly(shell,'buttress',m,assets,[side*11.4,0,z],side<0?Math.PI:0);b.name='POWER_BUTTRESS_ASSEMBLY';}
  // The machine rows retain the established walk-level footprints; all overhead additions clear the player.
  for(const z of[-9,-1,7]){const x=side*6.4,stack=placeAssembly(root,'stack',m,assets,[x,0,z],-side*Math.PI/2);stack.userData.collider={id:'cabinet',minX:x-.825,maxX:x+.825,minZ:z-1.075,maxZ:z+1.075};machinePositions.push({x,z});
   duct(shell,'large_coolant_feed',[[x,7.85,z],[x,9.1,z],[side*9.8,10.1,z],[side*11.4,10.8,z]],.23,m.rubber);
   duct(shell,'titanium_return_feed',[[x+.3*side,7.8,z],[x+.3*side,8.8,z],[side*10.2,9.7,z],[side*11.4,10.3,z]],.11,m.chrome);
  }
  for(const z of[-8.2,3.8,10.8]){const plateGroup=new THREE.Group();plateGroup.position.set(side*12.8,3.15,z);plateGroup.rotation.y=-side*Math.PI/2;shell.add(plateGroup);plate(plateGroup,'industrial_service_cassette',3.1,4.4,.22,[0,0,0],m.steel,{holes:[{x:0,y:.7,w:1.65,h:1.1}]});plate(plateGroup,'shadowed_cutout',1.7,1.15,.04,[0,.7,-.17],m.dark);for(let i=0;i<5;i++)block(plateGroup,'service_vent',[0,-1.45+i*.24,.16],[2.3,.09,.13],m.shell);for(const x of[-1.33,1.33])for(const y of[-1.9,1.9])bolt(plateGroup,[x,y,.17],m.chrome,.045);}
  for(const y of[4.5,10.8,15.3])for(const offset of[-.27,.27]){pipe(shell,'primary_longitudinal_conduit',[side*(10.45+offset),y,-13],[side*(10.45+offset),y,13],y===4.5?.2:.13,m.steel);for(let z=-12;z<=12;z+=4)block(shell,'conduit_saddle',[side*(10.45+offset),y,z],[.62,.62,.16],m.dark,true);}
  // Access ladders live beyond the lower safety bund, not in the player's route.
  for(const z of[-10.5,8.5]){for(const dz of[-.3,.3])pipe(shell,'maintenance_ladder_rail',[side*11.2,.2,z+dz],[side*11.2,6.8,z+dz],.035,m.chrome);for(let y=.5;y<6.6;y+=.33)pipe(shell,'maintenance_ladder_rung',[side*11.2,y,z-.3],[side*11.2,y,z+.3],.026,m.chrome);}
 }
 for(const z of[-12.4,-5.7,5.7,12.4]){
  part(shell,'load_bearing_portal',polygon(PORTAL_OUTER,.85,.055),m.steel,[0,0,z]);
  const contour=[[-11.9,3],[-11.9,10.5],[-8.65,15],[-4.4,17.6],[4.4,17.6],[8.65,15],[11.9,10.5],[11.9,3]];
  for(let i=0;i<contour.length-1;i++){const a=contour[i],b=contour[i+1];beam(shell,'portal_titanium_lip',[a[0],a[1],z+.49],[b[0],b[1],z+.49],.085,.065,m.shell);if(i===1||i===5)pipe(shell,'portal_indirect_light',[a[0],a[1],z+.52],[b[0],b[1],z+.52],.025,m.cyan);}
  for(const side of[-1,1])for(const y of[2.5,5.8,9.2]){plate(shell,'portal_mechanical_lock',.66,.82,.11,[side*12.2,y,z+.52],m.dark);for(const dx of[-.22,.22])for(const dy of[-.25,.25])bolt(shell,[side*12.2+dx,y+dy,z+.61],m.chrome,.042);}
 }
 // Fixed observation optics: their line of sight is directed toward the neuronal post.
 for(const side of[-1,1]){const optics=new THREE.Group();optics.name='SURVEILLANCE_OPTICS';optics.userData.function='surveillance des équipements';root.add(optics);pipe(optics,'camera_mount',[side*9,4.2,5.7],[side*7.8,3.8,5.7],.045,m.steel);block(optics,'optical_housing',[side*7.8,3.8,5.7],[.42,.24,.3],m.shell,true);pipe(optics,'recessed_optical_lens',[side*7.8,3.8,5.55],[side*7.8,3.8,5.48],.065,m.dark,16);block(optics,'camera_status',[side*7.94,3.85,5.53],[.018,.018,.015],m.red);}
 // Longitudinal I-beams and diagonal webbing close the enormous roof structurally.
 for(const x of[-8.3,8.3,-3.9,3.9]){for(const y of[15.6,16.6])block(shell,'roof_beam_flange',[x,y,0],[.65,.12,26.5],m.steel);block(shell,'roof_beam_web',[x,16.1,0],[.12,1.0,26.5],m.dark);for(let z=-12;z<12;z+=3)beam(shell,'roof_diagonal_web',[x-.32,15.7,z],[x+.32,16.5,z+3],.09,.10,m.shell);}
 const dock=new THREE.Group();dock.name='NEURAL_INDUCTION_PORT';dock.position.set(0,7.1,-3.8);root.add(dock);const horizontal=placeAssembly(dock,'halo',m,assets,[0,0,0],0,.64);horizontal.rotation.x=-Math.PI/2;
 for(const x of[-3.1,3.1]){beam(shell,'induction_ring_bracket',[x,7.2,-3.8],[Math.sign(x)*2.62,7.2,-3.8],.18,.34,m.shell);beam(shell,'suspended_machine_crossmember',[x,7.2,-7.0],[x,7.2,-.6],.32,.36,m.steel);for(const z of[-6.1,-1.5]){pipe(shell,'suspension_tension_rod',[x,7.25,z],[x,16,z],.055,m.chrome);block(shell,'suspension_connector',[x,7.45,z],[.45,.5,.45],m.dark,true);beam(shell,'upper_suspension_cleat',[x,16,z],[Math.sign(x)*3.9,16,z],.22,.25,m.steel);}}
 for(const side of[-1,1]){duct(shell,'neuronal_cable_bundle',[[side*2.2,7.1,-3.8],[side*3.6,8,-4.4],[side*6.4,9.6,-5.5],[side*10.7,10.8,-5.7]],.2,m.rubber);for(const dz of[-.15,.15])duct(shell,'signal_fibre_bundle',[[side*2.1,7.06,-3.8+dz],[side*3.4,7.8,-4.4+dz],[side*6.4,9.4,-5.5+dz],[side*10.7,10.6,-5.7+dz]],.035,m.cyan);}
 // Deep axial synchronizer behind the seat; it remains outside the reachable floor.
 placeAssembly(shell,'halo',m,assets,[0,7.1,-17.3]);
 for(const x of[-4.7,4.7]){beam(shell,'axial_ring_mount',[x,7.1,-17.3],[Math.sign(x)*4.21,7.1,-17.3],.24,.6,m.shell);beam(shell,'axial_sync_support',[x,0,-17.3],[x,13.3,-17.3],.48,.7,m.dark);block(shell,'support_light',[x,7.2,-16.85],[.04,9.5,.025],m.cyan);}
 block(shell,'axial_machine_base',[0,.75,-17.4],[10,1.5,3],m.steel,true);block(shell,'remote_gallery_floor',[0,-.18,-25],[26,.36,26],m.dark);block(shell,'remote_shadow_wall',[0,8,-38],[27,16,.6],m.dark);
 for(let z=-21;z>=-34;z-=6){for(const side of[-1,1]){placeAssembly(shell,'stack',m,assets,[side*6.4,0,z],-side*Math.PI/2);beam(shell,'distant_structural_rib',[side*10,0,z],[side*7,14,z],.55,.6,m.steel);}block(shell,'distant_upper_bridge',[0,12.5,z],[15,.35,2],m.steel);}
 // A framed observation barrier and a real bulkhead close the accessible deck.
 const glass=new THREE.MeshStandardMaterial({color:0x598da1,metalness:.15,roughness:.16,transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide});
 part(shell,'axial_observation_glass',new THREE.PlaneGeometry(16.3,11.5),glass,[0,6.5,-12.75]);block(shell,'axial_sill',[0,.45,-12.75],[17,.9,.35],m.dark);obstacle('observation_barrier',0,-12.75,18,.35);
 for(const x of[-8.2,8.2])beam(shell,'observation_jamb',[x,.9,-12.75],[x,12.2,-12.75],.22,.35,m.shell);
 block(shell,'entry_bulkhead',[0,8.2,13.6],[26.6,16.4,.5],m.dark);for(const x of[-5.5,5.5]){plate(shell,'entry_recess',3.5,4.8,.13,[x,2.4,13.28],m.steel);block(shell,'entry_seam',[x,2.2,13.16],[.03,3.8,.02],m.cyan);}
 // Segmented lower deck panels make near-field detail readable at walking height.
 for(const side of[-1,1])for(let z=-11.5;z<=11.5;z+=2.3){const p=plate(shell,'deck_inset_panel',1.6,2.08,.018,[side*3.35,.015,z],m.dark,{bevel:.008});p.rotation.x=-Math.PI/2;for(const x of[-.55,.55])for(const dz of[-.78,.78]){const b=bolt(shell,[side*3.35+x,.045,z+dz],m.chrome,.023);b.rotation.x=0;}}
 return{colliders,machinePositions,manifest};
}
