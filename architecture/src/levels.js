import {createDemonstration,spawnPoints} from './demo.js';
import {createExpandedN06} from './n06-expanded.js';

// Register trusted source modules here. A level factory may use any geometry
// functions or BufferGeometry: this registry selects levels, not allowed shapes.
const definitions=new Map([['n06-etendue',{title:'N06 · Campus orbital',create:createExpandedN06,garden:true,arrivals:[{id:'jardin',label:'Jardin N06',position:[0,.025,13],yaw:0},{id:'concourse',label:'Nouveaux accès',position:[0,.025,25],yaw:Math.PI},{id:'upper',label:'Étage supérieur',position:[-8,6.025,36],yaw:-Math.PI/2},{id:'n01',label:'Habitat',position:[-35,.025,34],yaw:Math.PI/2,hidden:true},{id:'n02',label:'Laboratoire',position:[35,.025,34],yaw:-Math.PI/2,hidden:true},{id:'n03',label:'Observatoire',position:[0,6.185,38],yaw:Math.PI,hidden:true}],budgets:{triangles:600000,collisionTriangles:120000,meshes:600}}],['atelier',{
 title:'Architectures libres',create:createDemonstration,
 arrivals:[{id:'entrance',label:'Entrée · rampe ambre',position:spawnPoints.entrance,yaw:-Math.PI/2},
  {id:'lower',label:'Passage inférieur',position:spawnPoints.lower,yaw:0},
  {id:'upper',label:'Galerie haute',position:spawnPoints.upper,yaw:Math.PI/2}],
 budgets:{triangles:200000,collisionTriangles:60000,meshes:160}
}]]);
export function levelDefinition(id='atelier'){
 const definition=definitions.get(id);if(!definition)throw Error('Espace inconnu');return definition;
}
export function checkBudget(architecture,budget){
 const cost=architecture.cost();for(const [key,limit]of Object.entries(budget))if(cost[key]>limit)throw Error('Budget architectural dépassé : '+key);return cost;
}
