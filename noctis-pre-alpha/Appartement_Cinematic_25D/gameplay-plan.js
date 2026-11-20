// Authored locations on the generated study panorama. Missing props stay in the
// accessible inventory, rather than pretending they exist in the photograph.
export const gameplayObjects=Object.freeze([
 {phase:1,key:'clock',label:'Réveil · inventaire',uv:null},
 {phase:1,key:'bed',label:'Lit',uv:[.09,.58]},
 {phase:1,key:'computer',label:'Ordinateur · journal N1',uv:[.49,.51]},
 {phase:1,key:'robot',label:'ORBI-7',uv:[.865,.56]},
 {phase:1,key:'door',label:'Porte · poursuivre N2',uv:[.93,.43]},
 {phase:2,key:'computer',label:'Ordinateur principal',uv:[.49,.51]},
 {phase:2,key:'drink',label:'Boisson énergisante · inventaire',uv:null},
 {phase:2,key:'tablet',label:'Tablette',uv:[.64,.58]},
 {phase:2,key:'light',label:'Éclairage',uv:[.92,.32]},
 {phase:2,key:'robot',label:'ORBI-7',uv:[.865,.56]},
 {phase:2,key:'door',label:'Porte · sortie',uv:[.93,.43]},
 {phase:2,key:'secret',selector:'#secret-panel',label:'Accès technique',uv:[.96,.5]}
]);
export function directionAt(u,v){const angle=(u-.5)*Math.PI*2,latitude=(.5-v)*Math.PI;return [Math.cos(angle)*Math.cos(latitude),Math.sin(latitude),Math.sin(angle)*Math.cos(latitude)];}
export function gamePhase(classes){return classes.contains('room-two')?2:1;}
