const identifier = /^[a-z][a-z0-9-]{0,63}$/;
const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
export function validate(b, plugins) {
  const check = (value, name) => { if (!value) throw Error('Blueprint invalide · ' + name); };
  check(b.version === 1 && identifier.test(b.id) && typeof b.name === 'string', 'identité');
  check(['2d','3d','hybrid'].includes(b.mode), 'mode');
  check(b.space && point(b.space.spawn) && [b.space.width,b.space.depth].every(n=>Number.isFinite(n)&&n>0), 'espace');
  check(Array.isArray(b.space.obstacles) && b.space.obstacles.every(a=>point(a)&&a[2]>0),'obstacles');
  for (const [id,path] of Object.entries(b.resources)) {
    check(identifier.test(id) && typeof path==='string' && /^\/(?!\/)[\w./-]+$/.test(path) && !path.split('/').includes('..'), 'ressource '+id);
  }
  check(Array.isArray(b.objectives) && b.objectives.every(id=>identifier.test(id)) && new Set(b.objectives).size===b.objectives.length,'objectifs');
  if(b.opening) check(/^\/(?!\/)[\w/-]+\.webp$/.test(b.opening.image)&&typeof b.opening.alt==='string','image cinématographique');
  const ids=new Set();
  for (const obj of b.objects) {
    check(identifier.test(obj.id) && !ids.has(obj.id) && point(obj.position),'objet');
    ids.add(obj.id);
    for (const [type,config] of Object.entries(obj.components)) {
      const plugin=plugins.get(type);
      check(plugin && plugin.valid(config,b), obj.id+'.'+type);
      check(b.mode!=='2d' || !plugin.spatial,'composant spatial');
    }
  }
  for(const link of b.transitions) check(typeof link.label==='string' && /^\/(?!\/)[\w/-]*$/.test(link.to),'transition');
  return b;
}
