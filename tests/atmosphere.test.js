import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkshopAtmosphere} from '../atmosphere.js';
import {config} from '../config.js';
test('writing scene produces finite changing light and drifting dust without optional haze settings', () => {
  const properties = {};
  const particles = [];
  const previousDocument = globalThis.document, previousMedia = globalThis.matchMedia;
  globalThis.matchMedia = () => ({matches:false,addEventListener(){}});
  globalThis.document = {createElement:()=>({style:{}})};
  const scene = {style:{setProperty:(key,value)=>{properties[key]=value;}},querySelectorAll:()=>[],querySelector:selector=>selector.includes('dust')?{append:element=>particles.push(element)}:null};
  try {
    const effect = new WorkshopAtmosphere(scene, config.writingVisuals);
    effect.mode='intro';effect.started=0;
    effect.render(5000);
    const light=properties['--light-level'], x=particles[0].style.left;
    assert.equal(particles.length,28);
    for(const value of Object.values(properties)) assert.ok(Number.isFinite(value));
    assert.ok(light>.4);
    assert.ok(Number.isFinite(particles[0].style.opacity));
    effect.render(7000);
    assert.notEqual(properties['--light-level'],light);
    assert.notEqual(particles[0].style.left,x);
  } finally {globalThis.document=previousDocument;globalThis.matchMedia=previousMedia;}
});

test('finished piano fire patches move independently in the shared loop and reduced motion schedules no frame',()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 let reduced=false,scheduled=0,canceled=0;
 const patches=Array.from({length:6},()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}}));
 const reflection={setAttribute(){}};
 globalThis.document={createElement:()=>({style:{}})};
 globalThis.matchMedia=()=>({get matches(){return reduced;},addEventListener(){}});
 globalThis.requestAnimationFrame=()=>++scheduled;globalThis.cancelAnimationFrame=()=>canceled++;
 const scene={style:{setProperty(){}},querySelectorAll:s=>s==='.fire-patch'?patches:[],querySelector:s=>s==='.fire-reflections'?reflection:s.includes('dust')?{append(){}}:null};
 try{
 const effect=new WorkshopAtmosphere(scene,config.finishedPianoVisuals);effect.started=0;effect.render(2000);
 const first=patches.map(p=>p.attrs.transform);effect.render(4500);
 assert.ok(patches.every((p,i)=>p.attrs.transform!==first[i]));assert.equal(new Set(first).size,6);
 effect.start('intro');assert.equal(scheduled,1);effect.stop();assert.equal(effect.mode,'idle');assert.ok(canceled>0);
 reduced=true;effect.start('intro');assert.equal(scheduled,1);
 }finally{Object.assign(globalThis,saved);}
});
