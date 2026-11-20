import * as T from 'three';

export function createAnnexPalette(base,kind){
 const owned=[],copy=(source,name,colour,side=T.DoubleSide)=>{
  const m=source.clone();m.name='N06 / Annex '+kind+' / '+name;m.color.multiply(new T.Color(colour));m.side=side;owned.push(m);return m;
 };
 const shell=copy(base.annexShell||base.paint,'pressure shell',kind==='rest'?0xfff0db:kind==='meal'?0xf4eee3:0xe3edff);
 shell.userData.uvMode='authored';
 const lining=copy(base.annexLining||base.graphite,'inner acoustic skin',kind==='rest'?0xd7b99a:0xe2edfa,T.BackSide);lining.userData.uvMode='authored';
 const frame=copy(base.annexFrame||base.steel,'machined frame',kind==='rest'?0xe2c3a3:kind==='meal'?0xd2d7d6:0xa8c9e7);
 const panel=copy(shell,'access panel',0xffffff);panel.userData.uvMode='metric';
 const gasket=copy(base.seal||base.graphite,'pressure gasket',0xc5c9ce);
 const trim=copy(base.copper||base.steel,'fastener rail',kind==='rest'?0xf2c796:0xd8e7f0);
 const glass=new T.MeshPhysicalMaterial({name:'N06 / Annex '+kind+' / coated glazing',color:kind==='rest'?0xd7d3c7:0xbcd6eb,transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide,metalness:0,roughness:.085,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.5});owned.push(glass);
 return {shell,lining,frame,panel,gasket,trim,glass,owned};
}
// Curved-shell UVs follow arc length instead of box projecting across normals.
export function annexShellGeometry(radius,start,length,thetaStart=.12,thetaLength=Math.PI*.38){
 const g=new T.SphereGeometry(radius,24,20,start,length,thetaStart,thetaLength),uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++){
  const u=uv.getX(i),v=1-uv.getY(i),theta=thetaStart+v*thetaLength;
  uv.setXY(i,(start+u*length)*radius*Math.sin(theta),v*thetaLength*radius*.80);
 }
 g.scale(1,.55,1);return g;
}
export const annexRoof=Object.freeze({radius:9.6,squash:.55,base:.8,topTheta:.12,rimTheta:.12+Math.PI*.38});
export function annexRoofPoint(phi,theta,r=annexRoof.radius){return [-r*Math.cos(phi)*Math.sin(theta),annexRoof.base+r*annexRoof.squash*Math.cos(theta),r*Math.sin(phi)*Math.sin(theta)];}
export function finishAnnexCanopy({canopy,palette,mesh,tube,box}){
 const start=0,length=Math.PI/6,end=start+length,sectorEnd=Math.PI/3;
 const {topTheta,rimTheta}=annexRoof,thetaLength=rimTheta-topTheta;
 mesh(annexShellGeometry(9.62,start-.006,length+.012,topTheta,thetaLength+.004),palette.shell,[0,.8,0],canopy);
 mesh(annexShellGeometry(9.53,start-.006,length+.012,topTheta,thetaLength+.004),palette.lining,[0,.8,0],canopy);
 mesh(annexShellGeometry(9.60,end-.006,sectorEnd-end+.012,topTheta,thetaLength+.004),palette.glass,[0,.8,0],canopy);
 // Both sides of every structural rib touch the same pressure-skin profile.
 for(const phi of [start,end,sectorEnd]){
  const inner=[],outer=[];
  for(let i=0;i<=12;i++){const theta=topTheta+thetaLength*i/12;inner.push(annexRoofPoint(phi,theta,9.47));outer.push(annexRoofPoint(phi,theta,9.65));}
  tube(inner,.055,palette.frame,canopy);tube(outer,.045,palette.gasket,canopy);
 }
 for(const theta of [topTheta,.72,rimTheta]){
  const line=[];for(let i=0;i<=12;i++)line.push(annexRoofPoint(start+sectorEnd*i/12,theta,9.47));
  tube(line,.045,palette.frame,canopy);
 }
 // Edge returns close the visible thickness of the opaque sandwich panels.
 for(const phi of [start,end]){
  const positions=[],indices=[];
  for(let i=0;i<=24;i++)for(const r of [9.53,9.62])positions.push(...annexRoofPoint(phi,topTheta+thetaLength*i/24,r));
  for(let i=0;i<24;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));mesh(g,palette.frame,[0,0,0],canopy);
 }
 for(const theta of [.38,.78,1.15]){const p=annexRoofPoint(start+.045,theta,9.44),plate=box(.19,.045,.11,p,palette.trim,canopy,.015);plate.rotation.y=-start;}
 // Only the ventilation flap moves. The roof, glazing and ribs stay anchored.
 const p=annexRoofPoint(length*.5,.72,9.41),housing=box(.62,.07,.28,p,palette.frame,canopy,.025);housing.rotation.y=-length*.5;
 const vent=new T.Group();vent.name='N06 / Annex ventilation flap';vent.position.fromArray([p[0],p[1]-.05,p[2]]);canopy.add(vent);
 box(.48,.022,.18,[0,0,0],palette.panel,vent,.012);
 return vent;
}
export function closeAnnexCrown({group,palette,mesh,ring}){
 mesh(annexShellGeometry(9.62,0,Math.PI*2,0,annexRoof.topTheta+.006),palette.shell,[0,.8,0],group);
 mesh(annexShellGeometry(9.53,0,Math.PI*2,0,annexRoof.topTheta+.006),palette.lining,[0,.8,0],group);
 const p=annexRoofPoint(0,annexRoof.topTheta,9.47);ring(0,0,Math.hypot(p[0],p[2]),p[1],.07,palette.frame,group);
}
