// Metres. The radius reserves the footprint and the interaction approach.
const stations=[
 ['A01','robot-arm',-2,15,.9,2.6,'Manipulateur de prélèvement'],
 ['A02','containers_B',2,9,.82,1.4,'Échantillons conditionnés'],
 ['B06','Field_Core',5.2,-3.7,1.12,2.9,'Alimentation de la distribution'],
 ['B01','drill_structure',3,-.6,2.6,5,'Foreuse de caractérisation'],
 ['B02','cargodepot_B',-3,-4.0,1.45,2.1,'Réserve de carottes minérales'],
 ['D01','roofmodule_cargo_A',-23,1.55,.85,1.5,'Module de maintenance'],
 ['E01','Reactor_Vessel',-43,0,3.7,6.3,'Cuve du réacteur — entraînements de commande'],
 ['E02','robot-arm',-46,4.8,1.6,3.8,'Bras de transfert'],
 ['E03','lights',-46,-5,1.45,3.7,'Éclairage de la station'],
 ['A03','Wall_2',2.7,18,1.42,3.7,'Blindage de la galerie',1.571],
 ['A04','RoofTile_Vents',0,13,2.5,.6,'Ventilation de la galerie',0,4.04],
 ['B03','Props_Computer',-5,3.9,1.15,2.2,'Console de distribution'],
 ['B04','Props_Vessel_Tall',5.6,3.2,1.12,3.8,'Réservoir de fluide'],
 ['B05','Door_Double',.2,-5.6,2.1,3.85,'Sas de laboratoire'],
 ['C01','Props_Chest',-12,-1.75,.69,1.1,'Coffre de prélèvement'],
 ['D02','Props_Capsule',-26,-1.68,.78,2.7,'Capsule de contrôle'],
 ['D03','Column_3',-31,1.8,.65,3.8,'Colonne de distribution'],
 ['E04','Props_Pod',-40,-4.45,1.7,3.8,'Capsule de maturation'],
 ['E05','Props_Teleporter_2',-48,-1.8,1.55,3.5,'Chambre de transfert'],
 ['E06','Props_Computer',-39,3.4,1.3,2.5,'Poste scientifique']
];
export const props=stations.map(([id,asset,x,z,r,h,label,yaw=0,y=0])=>({id,asset,x,z,r,h,label,yaw,y}));
