import assert from 'node:assert/strict';
import {profiles,chooseProfile,resolution,withinReach} from '../src/profile.js';
for(const [choice,coarse,expected] of [[null,true,'mobile'],['detail',true,'detail'],['mobile',false,'mobile'],['__proto__',false,'detail']])assert.equal(chooseProfile(choice,coarse),expected);
for(const profile of Object.values(profiles))for(const [w,h,dpr] of [[390,844,3],[915,412,2.5],[3840,2160,2],[1920,1080,1]]){
 const r=resolution(profile,dpr,w,h);assert(w*h*r*r<=profile.pixelBudget+1 && r<=dpr && r>0);}
assert(withinReach({x:0,z:.35},0,0));assert(!withinReach({x:0,z:.35},Math.PI,0));assert(!withinReach({x:0,z:.35},0,1.3));assert(!withinReach({x:0,z:4.5},0,0));
console.log('Profils de rendu, budgets de résolution et portée orientée du diagnostic vérifiés.');
