import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Introduction} from '../introduction.js';
function fixture(src=''){
 const media=[],changes=[];let stopped=0,completed=0;
 const intro=new Introduction({settings:{src,volume:.8,loadTimeoutMs:1000,placeholder:'Development placeholder'},createMedia:()=>{const item={pauseCount:0,currentTime:0,play:async()=>{},pause(){this.pauseCount++;}};media.push(item);return item;},onChange:(...args)=>changes.push(args),onComplete:()=>completed++,stopPuzzle:()=>stopped++});
 return {intro,media,changes,get stopped(){return stopped;},get completed(){return completed;}};
}
test('unconfigured narration gives placeholder and permits continue',async()=>{const f=fixture();await f.intro.start();assert.equal(f.media.length,0);assert.match(f.changes[0][1],/placeholder/);f.intro.finish();assert.equal(f.completed,1);assert.equal(f.stopped,1);});
test('skip stops narration; replay stops old audio and puzzle before starting new media',async()=>{const f=fixture('test.mp3');await f.intro.start();const old=f.media[0],ended=old.onended;f.intro.finish();assert.equal(old.pauseCount,1);assert.equal(old.currentTime,0);assert.equal(old.onended,null);await f.intro.start();ended();assert.equal(f.completed,1);assert.equal(f.stopped,2);assert.equal(f.media.length,2);f.media[1].onended();assert.equal(f.completed,2);assert.equal(f.intro.active,false);});
test('missing or blocked narration retains an explicit continue path',async()=>{const f=fixture('missing.mp3');await f.intro.start();f.media[0].onerror();assert.equal(f.media[0].pauseCount,1);assert.equal(f.changes.at(-1)[0],'unavailable');assert.equal(f.intro.active,true);f.intro.finish();assert.equal(f.completed,1);const g=fixture('blocked.mp3');g.intro.createMedia=()=>({play:async()=>{throw Error('blocked');},pause(){}});await g.intro.start();assert.equal(g.changes.at(-1)[0],'unavailable');g.intro.stop();});
test('skip while play is pending cannot restart old narration',async()=>{const f=fixture('slow.mp3');let resolve;f.intro.createMedia=()=>{const m={pauseCount:0,pause(){this.pauseCount++;},play:()=>new Promise(r=>resolve=r)};f.media.push(m);return m;};const pending=f.intro.start();f.intro.finish();resolve();await pending;assert.equal(f.media[0].pauseCount,2);assert.equal(f.completed,1);assert.equal(f.intro.active,false);});
