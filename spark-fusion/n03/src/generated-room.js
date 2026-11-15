import * as T from '../vendor/three.module.js';
import {retireRoom} from './room-resources.js';
import {styles} from './art-profiles.js';
import {cues} from './machine-behaviors.js';
import {ResearchRoom3D} from './room3d.js';
import {buildRoom} from './room-builder.js';
import {dressRoom} from './art-director.js';
import {nearestStation,walk} from './room-plan.js';
import {InstallationAudio} from './audio.js';
import {direction,SPEED} from './physics.js';
const names={server:'Serveur neuronal',reactor:'Cœur énergétique',robot:'Bras de précision',sensor:'Capteur optique',terminal:'Terminal',cooler:'Échangeur thermique',relay:'Armoire de commande',scanner:'Portail de mesure'};
export async function openGeneratedRoom(id,canvas,input,onError,profile){
  if(!/^[a-z][a-z0-9-]{0,47}$/.test(id))throw Error('Identifiant de salle invalide');
  let spec;
  if(id==='personnelle'){spec=JSON.parse(sessionStorage.getItem('cortex.master.preview'));if(!spec)throw Error('Revenez au laboratoire pour créer votre salle');}
  else {const res=await fetch('/spark-fusion/n03/rooms/'+id+'.json');if(!res.ok)throw Error('Définition de salle indisponible');spec=await res.json();}
  if(spec.id!==id)throw Error('Identité de salle incohérente');
  const context=canvas.getContext('webgl2',{antialias:true});if(!context)throw Error('WEBGL2_UNAVAILABLE');
  const builtRoom=buildRoom(spec,{profile}),renderer=new T.WebGLRenderer({canvas,context});
  try{return new GeneratedRoom(canvas,input,onError,{renderer,builtRoom,profile});}catch(e){renderer.dispose();throw e;}
}
export class GeneratedRoom extends ResearchRoom3D{
  constructor(...args){
    super(...args);
    this.fillReport=dressRoom(this.scene,this.lighting,this.lab.layout.spec,this.lab.stations[0]);
    this.nextSound=6;
  }
  quality(value){
    const profile=typeof value==='boolean'?(value?'economy':'balanced'):value;
    if(profile!==this.profile){
      const before=this.lab,next=buildRoom(before.layout.spec,{profile});
      for(const station of next.stations){
        const saved=before.stations.find(s=>s.id===station.id);
        station.active=saved.active;station.activatedAt=saved.activatedAt;
      }
      this.post.resetMaterials?.();
      this.scene.add(next.root);this.lab=next;
      retireRoom(before,next);
      this.lighting.invalidateChairShadow?.();
    }
    super.quality(value);
  }
  inspect(){
    const station=nearestStation(this.position,this.input.yaw,this.lab.layout);if(!station)return;
    station.active=true;station.activatedAt=this.elapsed??0;
    const action=station.interaction??this.lab.layout.spec.interaction;
    const calibration=action==='calibration',cue=cues[station.cue??action];
    return {...station,message:names[station.kind]+(calibration?' · Alignement confirmé':' · Diagnostic nominal'),...cue};
  }
  startAmbience(audio){
    const tones=styles[this.lab.layout.spec.style].sound.ambient;
    if(!audio.enabled||!audio.ctx)return ()=>{};
    audio.ambientActive=true;
    const stops=tones.map((frequency,i)=>{
      const s=this.lab.stations[i%this.lab.stations.length];
      return audio.tone(frequency,{continuous:true,level:[.021,.012,.008][i],position:[s.x,s.height,s.z]});
    });
    let stopped=false;
    return ()=>{if(stopped)return;stopped=true;audio.ambientActive=false;stops.forEach(stop=>stop());};
  }
  soundscape(audio,pose,time){
    if(!audio.enabled||!audio.ambientActive)return;
    audio.lastPulse=time;audio.lastMechanism=time;
    // Share the listener and gain graph; the demonstration supplies its own sources.
    InstallationAudio.prototype.update.call(audio,pose,time,{active:false});
    const policy=styles[this.lab.layout.spec.style].sound;
    if(time<this.nextSound)return;this.nextSound=time+policy.interval;
    const station=this.lab.stations[Math.floor(time/policy.interval)%this.lab.stations.length];
    audio.tone(this.lab.layout.spec.audio==='servo'?policy.motor:policy.pulse,{end:policy.motor,duration:.36,level:policy.level,position:[station.x,station.height,station.z]});
  }
  frame(now){
    if(!this.running)return;
    const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;this.elapsed+=dt;
    const m=this.input.movement(),d=direction(this.input.yaw,m.right,m.forward),blend=1-Math.exp(-12*dt);
    this.velocity.x+=(d.x*SPEED-this.velocity.x)*blend;this.velocity.z+=(d.z*SPEED-this.velocity.z)*blend;
    this.collisionHits+=walk(this.position,this.velocity.x*dt,this.velocity.z*dt,this.lab.layout);
    this.camera.position.x=this.position.x;this.camera.position.z=this.position.z;this.camera.position.y+=(1.68+(this.position.floor??0)-this.camera.position.y)*(1-Math.exp(-14*dt));this.camera.rotation.set(this.input.pitch,this.input.yaw,0,'YXZ');
    this.lab.update(this.elapsed,this.reduced,{pose:this.position,eco:this.eco});
    if(!this.eco&&!this.reduced&&this.elapsed-this.lastChairShadow>.5){
      this.lastChairShadow=this.elapsed;this.lighting.invalidateChairShadow?.();
    }
    this.onFrame?.({...this.position,y:this.camera.position.y,yaw:this.input.yaw,pitch:this.input.pitch},this.elapsed);
    this.render();this.samples++;
    if(now-this.sampleAt>1800){
      const fps=this.samples*1000/(now-this.sampleAt);
      this.metrics(fps);
      this.lowWindows=fps<24?this.lowWindows+1:0;
      if(this.profile!=='economy'&&this.lowWindows>=3){
        this.lowWindows=0;
        this.quality(this.profile==='cinematic'?'balanced':'economy');
        const selector=document.querySelector('#quality');if(selector)selector.value=this.profile;
      }
      this.sampleAt=now;this.samples=0;
    }
    this.raf=requestAnimationFrame(this.frame);
  }
  updateHUD(){
    const station=nearestStation(this.position,this.input.yaw,this.lab.layout);
    document.querySelector('#target').hidden=true;document.querySelector('#interact').disabled=!station;
    document.querySelector('#interactLabel').textContent=station?names[station.kind]+' · '+((station.interaction??this.lab.layout.spec.interaction)==='calibration'?'Calibrer':'Examiner'):'Approchez d’un équipement';
    document.querySelector('#distance').textContent=this.lab.stations.filter(s=>s.active).length+' / '+this.lab.stations.length+' postes contrôlés';
  }
  metrics(fps){document.querySelector('#metrics').textContent=this.lab.layout.spec.name+' · '+this.profile+' · '+this.lab.cost.triangles.toLocaleString('fr-FR')+' triangles'+(fps?' · '+Math.round(fps)+' images/s':'');}
}
