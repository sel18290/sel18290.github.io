// Only the next scene's first view; never preload all perspectives/rooms.
const retained=new Map();let releaseTimer;
export function warmNextScene(fragments){
 const urls=fragments===2?['assets/n03-red-panorama-empty.webp','assets/n03-foreground.webp']:['assets/noctis-study.webp'];
 for(const [url] of retained)if(!urls.includes(url))retained.delete(url);
 clearTimeout(releaseTimer);
 for(const url of urls){if(retained.has(url))continue;const image=new Image();image.decoding='async';image.fetchPriority='low';const item={image,promise:null};retained.set(url,item);item.promise=new Promise(resolve=>{image.onload=async()=>{try{await image.decode();}catch{}resolve(true);image.onload=image.onerror=null;};image.onerror=()=>{retained.delete(url);resolve(false);image.onload=image.onerror=null;};image.src=url;});}
 // Release JS references; the browser manages its normal HTTP/decoded caches.
 releaseTimer=setTimeout(()=>{retained.clear();releaseTimer=undefined;},30000);
 return Promise.all(urls.map(url=>retained.get(url)?.promise||Promise.resolve(false)));
}
