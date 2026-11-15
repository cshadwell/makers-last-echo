import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {loadEntrance} from '../loading.js';
import {NarratedPrologue} from '../prologue.js';

test('entrance readiness depends only on cottage, lighting, frames, and knock sound in that order',async()=>{
  const events=[];
  await loadEntrance({image:'cottage',frames:['k1','k2','k3','k4'],load:async image=>events.push(image),setupLighting:async()=>events.push('lighting'),prepareSound:async()=>events.push('knock sound'),onReady:()=>events.push('clickable')});
  assert.deepEqual(events,['cottage','lighting','k1','k2','k3','k4','knock sound','clickable']);
});
test('arrival HTML eagerly requests only the cottage image and entrance images stay within budget',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const images=[...html.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
  assert.equal(images.filter(tag=>/\ssrc=/.test(tag)).length,1);
  assert.match(images.find(tag=>/\ssrc=/.test(tag)),/web\/cottage.jpg/);
  assert.ok(!html.includes('rel="preload" href="assets/FauxAntique.ttf"'));
  const files=['cottage.jpg',...[1,2,3,4].map(i=>`knocker-${i}.jpg`)];
  const bytes=files.reduce((total,file)=>total+statSync(new URL('../assets/web/'+file,import.meta.url)).size,0);
  assert.ok(bytes<850*1024,`Entrance artwork is ${bytes} bytes`);
});
class Media extends EventTarget {
  currentTime=0;ended=false;paused=true;plays=[];
  play(){this.plays.push(this.src);this.paused=false;this.ended=false;return Promise.resolve();}
  pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}
}
test('progressive prologue prepares first scene only and can wait for its visual reveal before narration',async()=>{
  const original=globalThis.fetch,requests=[],decoded=[];
  globalThis.fetch=async path=>{requests.push(path);return {ok:true,blob:async()=>new Blob(['audio'])};};
  const audio=new Media();
  const player=new NarratedPrologue({audio,clips:['one','two','three'],images:[0,1,2].map(index=>({decode:async()=>decoded.push(index)})),progressive:true,onScene(){},onReady(){},onRetry(){},onAdvance:async()=>{}});
  try{
    assert.equal(await player.prepare(),true);
    assert.deepEqual(requests,['one']);assert.deepEqual(decoded,[0]);
    player.start(0,{deferPlayback:true});assert.equal(audio.plays.length,0);
    player.play();assert.equal(audio.plays.length,1);
    await player.prepareClip(1);assert.deepEqual(requests,['one','two']);
    player.stop();
  }finally{globalThis.fetch=original;player.stop();}
});
test('failed upcoming scene waits for explicit retry instead of advancing silently',async()=>{
  const original=globalThis.fetch;let fail=true;const retries=[],advances=[];
  globalThis.fetch=async path=>({ok:!(path==='two'&&fail),blob:async()=>new Blob(['audio'])});
  const audio=new Media();
  const player=new NarratedPrologue({audio,clips:['one','two'],images:[],progressive:true,holdMs:0,onScene(){},onReady(){},onRetry:show=>retries.push(show),onAdvance:async index=>advances.push(index)});
  try{
    await player.prepare();player.start();audio.ended=true;audio.dispatchEvent(new Event('ended'));
    await new Promise(resolve=>setTimeout(resolve,15));
    assert.equal(player.phase,'retry');assert.deepEqual(advances,[]);assert.equal(retries.at(-1),true);
    fail=false;player.retry();await new Promise(resolve=>setTimeout(resolve,15));
    assert.equal(player.index,1);assert.equal(player.phase,'playing');assert.deepEqual(advances,[1]);
  }finally{globalThis.fetch=original;player.stop();}
});
