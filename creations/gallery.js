import {creations,categories,matching} from './catalogue.js?v=retablissement';
const $=id=>document.getElementById(id);let category='all';
$('total').textContent=creations.length;
for(const [id,name]of [['all','Tout voir'],...Object.entries(categories)]){
 const button=document.createElement('button');button.textContent=name;button.dataset.category=id;button.setAttribute('aria-pressed',String(id===category));button.onclick=()=>{category=id;for(const b of $('filters').children)b.setAttribute('aria-pressed',String(b===button));render();};$('filters').append(button);
}
function render(){
 const entries=matching($('search').value,category);$('collection').replaceChildren();$('results').textContent=`${entries.length} destination${entries.length>1?'s':''} · Accès indépendant à chaque version`;$('empty').hidden=!!entries.length;
 for(const [id,title]of Object.entries(categories)){
  const items=entries.filter(item=>item.category===id);if(!items.length)continue;
  const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');section.className='category';heading.textContent=title;grid.className='cards';section.append(heading,grid);
  for(const item of items){
   const card=document.createElement('a');card.className='card';card.href=item.direct ? item.url : './explorer.html?id='+encodeURIComponent(item.id);card.dataset.creation=item.id;
   const visual=document.createElement('div');visual.className='card-visual';
   if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';image.loading='lazy';image.decoding='async';image.onerror=()=>{image.remove();visual.classList.add('without-preview');};visual.append(image);}else visual.classList.add('without-preview');
   const identifier=document.createElement('span');identifier.className='visual-label';identifier.textContent=item.kind;visual.append(identifier);
   const content=document.createElement('div');content.className='card-copy';const tag=document.createElement('p'),name=document.createElement('h4'),description=document.createElement('p'),action=document.createElement('span');tag.className='eyebrow';tag.textContent=item.tag;name.textContent=item.name;description.className='description';description.textContent=item.description;action.className='card-action';action.textContent=item.direct ? 'Jouer à la mission ↗' : 'Ouvrir cet environnement ↗';content.append(tag,name,description,action);card.append(visual,content);grid.append(card);
  }
  $('collection').append(section);
 }
}
$('search').addEventListener('input',render);render();
