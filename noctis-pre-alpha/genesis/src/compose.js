// Templates are cloned so a new room cannot change a historical scene.
export function composeRoom(recipe, library) {
  const scene={version:1,id:recipe.id,name:recipe.name,mode:'hybrid',resources:{},objects:[],objectives:[],transitions:recipe.transitions};
  for(const module of recipe.modules){
    const part=library[module];
    if(!part)throw Error('Module de salle inconnu · '+module);
    const copy=structuredClone(part);
    Object.assign(scene.resources,copy.resources);
    scene.objects.push(...(copy.objects||[]));
    scene.objectives.push(...(copy.objectives||[]));
    if(copy.presentation==='cinematic-image')scene.opening=recipe.opening;
    if(copy.space)scene.space=copy.space;
  }
  return scene;
}
