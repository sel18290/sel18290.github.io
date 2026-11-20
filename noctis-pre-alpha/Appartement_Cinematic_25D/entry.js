const params=new URLSearchParams(location.search);
if(params.get('scene')==='bureau'&&params.get('mode')!=='visite')location.replace('/noctis-pre-alpha/fusion-native/noctis/panorama-fusion.html');
else import('./cube.js?v=reveal-24');
