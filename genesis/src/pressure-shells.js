import * as T from 'three';

// A swept pressure skin: the elliptical shoulder starts above head height.
// The same section can follow a changing axis and flare at a junction.
export function sweptRoof(length,width,spring,rise,bend=0){
  const vertices=[],uv=[],indices=[],rings=24,sides=40;
  for(let j=0;j<=rings;j++){
    const u=j/rings;
    for(let i=0;i<=sides;i++){
      const a=Math.PI*i/sides;
      vertices.push(width*Math.cos(a)+bend*Math.sin(Math.PI*u)*Math.sin(a),
        spring+rise*Math.sin(a)*(1-.075*Math.sin(Math.PI*u)**2),
        length*(u-.5));
      uv.push(i/sides,j/rings);
      if(i<sides&&j<rings){
        const k=j*(sides+1)+i;
        indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function pressureShells(root,{steel,graphite,cyan,paint}){
  const skin=paint?paint.clone():new T.MeshStandardMaterial({color:0xb0b3b0,metalness:.16,roughness:.6});skin.side=T.DoubleSide;
  const bronze=new T.MeshStandardMaterial({color:0x947c60,metalness:.76,roughness:.32});
  const warm=new T.MeshBasicMaterial({color:0xf3ca9b});
  function place(parent,geometry,material,x=0,y=0,z=0){
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function conduit(group,points,radius,mat){
    const path=new T.CatmullRomCurve3(points);
    return place(group,new T.TubeGeometry(path,Math.max(32,points.length*2),radius,8,false),mat);
  }
  function vault(x,z,yaw,length,width,spring,rise,bend,trim){
    const group=new T.Group();group.position.set(x,0,z);group.rotation.y=yaw;root.add(group);
    place(group,sweptRoof(length,width,spring,rise,bend),skin);
    const count=Math.max(2,Math.round(length/3.6));
    // Place a continuous inward-facing lip and longitudinal light along each shoulder.
    for(let side of [-1,1]){
      for(let inset of [0,.15]){
        const points=[];
        for(let k=0;k<=16;k++){
          const u=k/16,a=side<0?2.66:.48;
          points.push(new T.Vector3(width*Math.cos(a)+bend*Math.sin(Math.PI*u)*Math.sin(a),
            spring+rise*Math.sin(a)*(1-.075*Math.sin(Math.PI*u)**2)-.08-inset,length*(u-.5)));
        }
        conduit(group,points,inset?.021:.09,inset?trim:steel);
      }
    }
    for(let j=0;j<=count;j++){
      const u=j/count,pts=[];
      for(let i=0;i<=32;i++){
        const a=Math.PI*i/32;
        pts.push(new T.Vector3((width-.035)*Math.cos(a)+bend*Math.sin(Math.PI*u)*Math.sin(a),
          spring+rise*Math.sin(a)*(1-.075*Math.sin(Math.PI*u)**2)-.055,length*(u-.5)));
      }
      conduit(group,pts,.072,j%2?graphite:bronze);
    }
  }
  vault(0,0,0,11.45,4.94,3.10,1.47,.8,warm);
  vault(-10,2,Math.PI/2,9.95,1.98,2.15,1.17,.25,cyan);
  vault(10,2,Math.PI/2,9.95,1.98,2.15,1.17,-.25,warm);
  vault(-19,13,0,9.96,1.98,2.13,1.19,.18,cyan);
  vault(19,13,0,9.96,1.98,2.13,1.19,-.18,warm);
  vault(1,12,0,11.96,1.98,2.17,1.15,.15,cyan);
  vault(1,25,0,5.96,1.98,2.17,1.15,.15,cyan);
  // Four rolled pressure vessels form the corners of the cryogenic chamber.
  // Straight portions between them stay open onto both galleries.
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const cx=-20+sx*2.85,cz=2+sz*3.85;
    const angle=Math.atan2(sz,sx)-Math.PI/4;
    const profile=[[2.05,.02],[2.14,.16],[2.08,.34],[2.01,.55],[2.01,3.66],[1.93,4.1],[1.62,4.77],[1.44,5.13]];
    const quarter=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),48,Math.PI/2-angle-Math.PI/2,Math.PI/2);
    place(root,quarter,skin,cx,0,cz);
    for(const [h,r,m] of [[.35,2.08,steel],[2.85,2.01,cyan],[3.73,2.00,bronze]]){
      const points=[];
      for(let i=0;i<=32;i++){const a=angle+Math.PI*i/64;points.push(new T.Vector3(cx+r*Math.cos(a),h,cz+r*Math.sin(a)));}
      conduit(root,points,m===cyan?.019:.065,m);
    }
  }
  // Radial ceiling petals frame the atlas and leave an open central oculus.
  const atlas=new T.Group();atlas.position.set(1,0,32.7);root.add(atlas);
  const profile=[[1.28,4.90],[1.34,4.69],[1.66,4.59],[2.6,4.48],[3.9,4.08],[4.35,3.62],[4.56,3.54]];
  const petal=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),24,0,Math.PI/6-.025);
  skin.side=T.DoubleSide;
  for(let i=0;i<12;i++)place(atlas,petal,skin).rotation.y=i*Math.PI/6;
  for(const [r,y,m,t] of [[1.28,4.78,warm,.032],[1.45,4.66,bronze,.11],[4.53,3.52,steel,.09]]){
    place(atlas,new T.TorusGeometry(r,t,8,128),m,0,y,0).rotation.x=Math.PI/2;
  }
}
