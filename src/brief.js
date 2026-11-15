import {compileRoom} from './room-plan.js';
const functions={robotique:'robotique',calcul:'calcul',énergétique:'energie',contrôle:'controle',neuronal:'neuronal',synchronisation:'synchronisation',données:'donnees',confinement:'confinement',couloir:'couloir',expérimentation:'experimentation'};
const frenchNumbers={une:1,un:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8};
export function fromBrief(text,id,seed){
  const brief=text.toLocaleLowerCase('fr');
  const type=Object.keys(functions).find(word=>brief.includes(word));
  if(!type)throw Error('Précisez la fonction de la salle');
  function count(noun,fallback){const match=brief.match(new RegExp('(\\d+|'+Object.keys(frenchNumbers).join('|')+')\\s+'+noun));return match?(frenchNumbers[match[1]]??Number(match[1])):fallback;}
  const double=/deux fois plus vaste|double surface/.test(brief);
  const shape=brief.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/);
  const [width,length,height]=shape?shape.slice(1).map(Number):double?[25,37,14]:[18,26,12];
  const forge=brief.includes('ambre')||brief.includes('forge');
  const spec={version:1,id,name:text.split(/[,.]/)[0].replace(/^crée(?:r)? (?:une? )?/i,'').trim().slice(0,80),function:functions[type],style:forge?'forge':'cortex',dimensions:{width,length,height},seed,machines:count('machines?',4),bridges:count('passerelles?',1),ceiling:type==='robotique'?'gantry':'vault',interaction:type==='robotique'?'calibration':'diagnostic',audio:type==='robotique'?'servo':'compute'};
  if(/cœur énergétique|coeur énergétique/.test(brief))spec.focal='reactor';
  if(/octogonal|pans coupés/.test(brief))spec.architecture={shape:'chamfered'};
  if(/galeries? accessibles?|rampe/.test(brief)){
    spec.architecture={...spec.architecture,galleries:count('galeries?',1),walkable:true};
  }
  compileRoom(spec);return spec;
}
