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
