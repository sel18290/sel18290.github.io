export const objectives=[
 {id:'read',prerequisites:[],hint:'Consulte le document.',rewards:[]},
 {id:'quiz',prerequisites:['read'],quiz:{type:'single',choices:['Le lent profond','Le paradoxal','Toutes les phases sont identiques'],answer:0,success:'Le lent profond est généralement davantage présent en début de nuit.',explanation:'Consulte le document : compare le début et la fin de nuit.'},rewards:['knowledge']}
];
export const examples=[
 {id:'demo2d',mode:'2d',dialogue:'Archive illustrée du sommeil',document:'Le sommeil lent profond est généralement plus présent au début de nuit ; le paradoxal prend davantage de place vers la fin.',objectives},
 {id:'demo3d',mode:'3d',dialogue:'Console de démonstration 3D',document:'Le sommeil lent profond est généralement plus présent au début de nuit ; le paradoxal prend davantage de place vers la fin.',objectives},
 {id:'demohybrid',mode:'hybrid',dialogue:'Archive 2D dans une scène 3D',document:'Le sommeil lent profond est généralement plus présent au début de nuit ; le paradoxal prend davantage de place vers la fin.',objectives}
];
