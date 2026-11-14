import test from 'node:test';
import assert from 'node:assert/strict';
import {CottageAtmosphere,cottageLightLevels} from '../cottage.js';
test('window firelight varies gently with distinct timings',()=>{
  const samples=Array.from({length:120},(_,i)=>cottageLightLevels(i/2));
  for(const pair of samples) for(const value of pair) assert.ok(value>.36 && value<.74);
  assert.notEqual(samples[0][0],samples[0][1]);
  assert.notEqual(samples[0][0],samples[10][0]);
  for(let i=1;i<samples.length;i++) for(let j=0;j<2;j++) assert.ok(Math.abs(samples[i][j]-samples[i-1][j])<.10);
});
test('reduced motion holds steady light and stop cancels animation',()=>{
  const originals={document:globalThis.document,matchMedia:globalThis.matchMedia,cancelAnimationFrame:globalThis.cancelAnimationFrame};
  const values=[];let cancelled;
  globalThis.document={addEventListener(){}};
  globalThis.matchMedia=()=>({matches:true,addEventListener(){}});
  globalThis.cancelAnimationFrame=id=>{cancelled=id;};
  try{
    const effect=new CottageAtmosphere({querySelectorAll:()=>[0,1].map(()=>({style:{setProperty:(key,value)=>values.push(value)}}))});
    effect.start();effect.render(50);
    assert.deepEqual(values,[.55,.55,.55,.55]);
    effect.frame=42;effect.stop();
    assert.equal(cancelled,42);assert.equal(effect.active,false);assert.equal(effect.frame,0);
  }finally{Object.assign(globalThis,originals);}
});
