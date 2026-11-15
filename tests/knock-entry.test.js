import test from 'node:test';
import assert from 'node:assert/strict';
import {KnockEntry,knockImpacts,knockFrameAt} from '../knock-entry.js';

test('ring closes exactly on all three recorded impacts',()=>{
  assert.deepEqual(knockImpacts,[.25,.57,.89]);
  for(const impact of knockImpacts){
    assert.equal(knockFrameAt(impact),0);
    assert.ok(Math.abs(knockFrameAt(impact-.06)-3)<1e-10);
    assert.ok(knockFrameAt(impact-.03)>0);
    assert.equal(knockFrameAt(impact+.03),0);
  }
});
test('knocking owns audio until its actual end; repeated clicks and stale ends cannot advance',async()=>{
  const originals={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  class Audio extends EventTarget {ended=false;currentTime=0; plays=0;play(){this.plays++;return Promise.resolve();}pause(){}}
  try{
    const audio=new Audio();const frames=Array.from({length:4},()=>({style:{}}));let completed=0,failed=0;
    const reducedMotion={matches:false};
    const entry=new KnockEntry({audio,frames,reducedMotion,onComplete:()=>completed++,onError:()=>failed++});entry.url='knock';
    entry.play();entry.play();assert.equal(audio.plays,1);assert.equal(completed,0);
    entry.render(.19);assert.equal(frames[3].style.opacity,1);
    reducedMotion.matches=true;entry.render(.19);assert.equal(frames[3].style.opacity,0);
    audio.ended=true;audio.dispatchEvent(new Event('ended'));assert.equal(completed,1);assert.equal(entry.active,false);
    audio.dispatchEvent(new Event('ended'));assert.equal(completed,1);
    audio.ended=false;entry.play();audio.dispatchEvent(new Event('error'));assert.equal(failed,1);assert.equal(completed,1);
    audio.ended=true;audio.dispatchEvent(new Event('ended'));assert.equal(completed,1);
  }finally{Object.assign(globalThis,originals);}
});

test('deployed knock audio has three measured attacks at the configured strike times', async()=>{
  const {readFileSync}=await import('node:fs');
  const bytes=readFileSync(new URL('../assets/knock-entry.wav',import.meta.url));
  const rate=bytes.readUInt32LE(24),channels=bytes.readUInt16LE(22);
  assert.equal(rate,44100);assert.equal(bytes.readUInt16LE(34),16);
  let offset=12,data;
  while(offset<bytes.length){const size=bytes.readUInt32LE(offset+4);if(bytes.toString('ascii',offset,offset+4)==='data'){data=bytes.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
  const attacks=[],step=Math.round(rate*.005),frames=data.length/(channels*2);
  for(let f=0;f+step<frames;f+=step){let power=0;for(let i=0;i<step*channels;i++){const v=data.readInt16LE((f*channels+i)*2)/32768;power+=v*v;}const time=f/rate;
    if(Math.sqrt(power/(step*channels))>.15&&(!attacks.length||time-attacks.at(-1)>.15))attacks.push(time);
  }
  assert.equal(attacks.length,3);
  attacks.forEach((time,index)=>assert.ok(Math.abs(time-knockImpacts[index])<.006));
});
