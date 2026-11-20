import * as T from 'three';

// Fit machinery to the headroom above the walkable routes.
export function sectorFinish(root, panel, materials){
  const {steel,graphite,seal,cyan}=materials;
  const copper=new T.MeshStandardMaterial({color:0x986343,metalness:.83,roughness:.33});
  const ice=new T.MeshStandardMaterial({color:0x275662,metalness:.55,roughness:.28});
  const amber=new T.MeshBasicMaterial({color:0xffb366});
  const hoop=(x,y,z,r,t,m)=>{
    const o=new T.Mesh(new T.TorusGeometry(r,t,8,80),m);
    o.position.set(x,y,z);o.rotation.x=Math.PI/2;root.add(o);
  };
  const pipe=(points,r,m)=>{
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const o=new T.Mesh(new T.TubeGeometry(path,40,r,10,false),m);root.add(o);
  };
  for(const side of [-1,1]){
    // Paired feeds draw the eye from each gallery to its own machinery.
    for(const z of [.55,.93]){
      pipe([[side*4.8,3.04,z],[side*9,3.04,z],[side*14,3.12,z],[side*16.8,4.55,z],[side*20,4.55,z]],.105,side<0?ice:copper);
    }
    for(let x=6;x<=14;x+=2){
      panel([.15,.24,.84],[side*x,3.16,.74],steel);
      for(const z of [.23,3.77]){
        panel([.26,1.45,.28],[side*x,2.58,z],steel,.06);
        panel([.33,.24,.38],[side*x,1.94,z],graphite);
      }
    }
  }
  // Refrigerant manifold and condensation fins are attached to the upper walls.
  for(let i=0;i<18;i++){
    panel([.07,1.06,.58],[-23+i*.35,3.76,-3.57],steel);
  }
  for(let i=0;i<3;i++){
    pipe([[-23,3.4+i*.24,-3.7],[-18,3.4+i*.24,-3.7],[-16.2,3.4+i*.24,-3],[-17,3.38+i*.13,0]],.08,ice);
  }
  for(const [r,y] of [[2.5,4.63],[2.23,4.48],[1.98,4.32]]){
    hoop(20,y,0,r,.10,copper);hoop(20,y-.09,0,r,.022,amber);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4, x=20+2.47*Math.cos(a),z=2.47*Math.sin(a);
    panel([.13,.64,.13],[x,4.93,z],steel);
  }
  for(const r of [1.5,1.8,2.8])hoop(1,.035,32,r,.016,cyan);
}
