import test from 'node:test';
import assert from 'node:assert/strict';
import {Epilogue,FIRST_EPILOGUE_END} from '../epilogue.js';
class Media extends EventTarget{
 paused=true;ended=false;currentTime=0;plays=[];
 play(){this.paused=false;this.ended=false;this.plays.push(this.src);this.dispatchEvent(new Event('playing'));return Promise.resolve();}
 pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}
}
const classes=()=>({values:new Set(),add(s){this.values.add(s);},remove(s){this.values.delete(s);}});
test('epilogue waits for both genuine endings, fades between clips, ignores duplicate starts, and resumes interruption',async()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window={addEventListener(){}};globalThis.document={body:{classList:classes()}};
 const image={hidden:true},end={hidden:true},retry={},recovery={hidden:true};
 const root={hidden:true,classList:classes(),querySelector:s=>s==='img'?image:s==='button'?retry:s==='.the-end'?end:recovery};
 const audio=new Media(),curtain={classList:classes()};let fades=0,blackCalls=0;
 const ending=new Epilogue({audio,root,curtain,fade:async()=>{fades++;},onBlack:()=>{blackCalls++;assert.equal(curtain.classList.values.has("is-black"),true);}});
 ending.player.urls=['one','two'];
 try{
 ending.start();ending.start();await Promise.resolve();await Promise.resolve();assert.deepEqual(audio.plays,['one']);
 audio.currentTime=4;audio.pause();audio.dispatchEvent(new Event('pause'));assert.equal(recovery.hidden,false);
 retry.onclick();assert.equal(audio.currentTime,4);assert.equal(ending.player.index,0);
 audio.currentTime=FIRST_EPILOGUE_END-.1;audio.dispatchEvent(new Event('timeupdate'));assert.equal(ending.player.index,0);assert.equal(fades,0);
 audio.currentTime=FIRST_EPILOGUE_END;audio.dispatchEvent(new Event('timeupdate'));audio.dispatchEvent(new Event('timeupdate'));
 assert.equal(audio.paused,true);
 await new Promise(r=>setTimeout(r,10));assert.equal(image.hidden,false);assert.equal(end.hidden,true);assert.equal(fades,2);assert.equal(blackCalls,1);assert.equal(audio.plays.at(-1),'two');
 audio.ended=true;audio.dispatchEvent(new Event('ended'));await new Promise(r=>setTimeout(r,10));
 assert.equal(image.hidden,true);assert.equal(end.hidden,false);assert.equal(fades,4);assert.equal(ending.player.phase,'idle');
 }finally{ending.player.stop();globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
