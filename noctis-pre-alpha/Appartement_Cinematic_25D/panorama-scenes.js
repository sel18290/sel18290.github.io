export const panoramas=Object.freeze([
 {id:'chambre',title:'Chambre 360°',slug:'chambre',button:'bedroom',url:'./assets/chambre-360.png'},
 {id:'bureau',title:'Bureau 360°',slug:'bureau',button:'study',url:'./assets/bureau-360.png'},
 {id:'salle3',cubeSize:2048,yaw:-Math.PI/2,title:'Panorama 360 salle 3',slug:'salle3-generateur-rouge',button:'reactor',url:'./assets/salle3-generateur-rouge-360-sr4x.png'}
]);
export function panoramaIndex(id){const index=panoramas.findIndex(p=>p.id===id);return index<0?0:index;}
