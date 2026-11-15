// Radius is the occupied disk, in metres. Scale is applied to the whole machine.
export const props = [
  {id:'A-relais',kind:'relay',x:-2.05,z:16,r:.82,scale:.50,yaw:Math.PI/2},
  {id:'A-sonde',kind:'sensor',x:2.05,z:10,r:.7,scale:.55,yaw:-Math.PI/2},
  {id:'B-repartiteur',kind:'reactor',x:2.7,z:-.6,r:2.1,scale:1.02},
  {id:'B-controle',kind:'terminal',x:-1.7,z:-3.7,r:1.45,scale:1},
  {id:'B-serveur',kind:'server',x:5.8,z:3.4,r:1.4,scale:.85},
  {id:'D-service',kind:'relay',x:-21,z:-1.65,r:.82,scale:.50},
  {id:'D-calibreur',kind:'scanner',x:-27,z:1.6,r:.8,scale:.53,yaw:Math.PI},
  {id:'E-chambre',kind:'reactor',x:-43,z:0,r:3.25,scale:1.58,yaw:Math.PI/2},
  {id:'E-controle',kind:'terminal',x:-39,z:3.9,r:1.35,scale:.9,yaw:Math.PI/2},
  {id:'E-manipulateur',kind:'robot',x:-46,z:4.7,r:1.65,scale:.95},
  {id:'E-refroidisseur',kind:'cooler',x:-46,z:-5.4,r:1.6,scale:.95}
];
