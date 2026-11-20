import * as T from 'three';

// Each signal follows the centre line of its own machine.
export function fieldAnimation(root){
  const particles=96;
  const geometry=new T.SphereGeometry(1,10,8);
  const material=new T.MeshBasicMaterial({color:0xffca96});
  const lights=new T.InstancedMesh(geometry,material,particles);
  lights.instanceMatrix.setUsage(T.DynamicDrawUsage);
  lights.frustumCulled=false;
  root.add(lights);
  const temp=new T.Object3D();
  const colours=[0xff956e,0x96f5ed,0xffba72];
  const colour=new T.Color();
  for(let i=0;i<particles;i++)lights.setColorAt(i,colour.setHex(colours[Math.floor(i/32)]));
  let time=0;
  const update=dt=>{
    time+=dt;
    for(let i=0;i<particles;i++){
      const strand=i%8,index=Math.floor(i%32/8),group=Math.floor(i/32);
      const t=(time*(group===0?.14:.09)+index*.25+strand*.03)%1;
      const a=Math.PI*2*(strand/8+t*(group===2?.115:group===1?.60:1.65));
      let r,y,x,z;
      if(group===0){r=.105+.19*Math.sin(Math.PI*t)**2;y=1.1+1.98*t;x=3.05;z=-2.5;}
      else if(group===1){r=.46+.08*Math.sin(Math.PI*t);y=3.04+1.52*t;x=-17;z=0;}
      else {r=2.28+.14*Math.cos(t*Math.PI*22);y=4.51+.14*Math.sin(t*Math.PI*22);x=20;z=0;}
      temp.position.set(x+r*Math.cos(a),y,z+r*Math.sin(a));
      temp.scale.setScalar(.032+.024*Math.sin(Math.PI*t)**2);temp.updateMatrix();
      lights.setMatrixAt(i,temp.matrix);
    }
    lights.instanceMatrix.needsUpdate=true;
  };
  update(0);
  return update;
}
