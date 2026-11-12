import {test} from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../config.js';
import {enterNote,correctAnswer,frequency,schedule,readProgress,submitCompletion} from '../logic.js';
import {mockNotification} from '../notification.js';
import {Instrument} from '../audio.js';
test('melody recognition is order-only and rejects incorrect sequences',()=>{
 for(const [notes,expected] of [[config.entryMelody,true],[['D',...config.entryMelody.slice(1)],false]]){let attempt=[],result;for(const note of notes){result=enterNote(attempt,note,config.entryMelody);attempt=result.attempt;}assert.equal(result.correct,expected);assert.equal(result.complete,true);}
 assert.equal(enterNote([],'C',config.entryMelody).complete,false);
});
test('exact words normalized for whitespace and case only',()=>{assert.ok(correctAnswer('  a  faded\nAGE defaced ',config.words));for(const text of ['A FADED AGE DEFACED!','A FADED DEFACED AGE','AFADEDAGEDEFACED','A FADED AGE'])assert.equal(correctAnswer(text,config.words),false);});
test('all 16 message notes use available pitches; groups and repeated notes have silence',()=>{
 const events=schedule(config.words,config.timing);assert.equal(events.length,16);assert.deepEqual(config.words.map(w=>w.length),[1,5,3,7]);
 events.forEach((event,i)=>{assert.ok(config.notes.some(n=>n.letter===event.note));if(i){const prev=events[i-1];assert.ok(event.time-prev.time-prev.duration >= (event.group===prev.group?config.timing.gap:config.timing.wordGap)-1e-9);}});
 const repeated=schedule(['AA'],config.timing);assert.ok(repeated[1].time>repeated[0].duration);assert.equal(frequency(69),440);
});
test('storage recovery, solved state, and unavailable storage',()=>{assert.equal(readProgress({getItem:()=>JSON.stringify({solved:true})},'test').unlocked,true);assert.equal(readProgress({getItem:()=>'{bad'},'test').solved,false);assert.equal(readProgress(undefined,'test').solved,false);});
test('failed mock preserves victory; retry and duplicate guard work',async()=>{
 const state={solved:true,completionId:'test'},persist=()=>{};mockNotification.failNext=true;
 await assert.rejects(submitCompletion(state,'Player',mockNotification,persist));assert.equal(state.solved,true);assert.equal(state.busy,false);assert.equal(state.submission,undefined);
 const first=submitCompletion(state,'Player',mockNotification,persist);assert.equal(await submitCompletion(state,'Player',mockNotification,persist),false);assert.equal(await first,true);assert.equal(await submitCompletion(state,'Player',mockNotification,persist),false);
});
test('message and piano share oscillator frequency and timbre; stop cancels voices',async()=>{
 const oscillators=[];const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 globalThis.window={AudioContext:class{currentTime=0;state='running';destination={};async resume(){}createGain(){return{gain:param(),connect(){},disconnect(){}}}createOscillator(){const osc={frequency:{},connect(){},start(){},stop(){this.stopped=true;},addEventListener(){}};oscillators.push(osc);return osc;}}};
 const audio=new Instrument(config);await audio.key('A');const key=oscillators.slice(0,3).map(o=>o.frequency.value);await audio.play(['A'],()=>{});assert.deepEqual(oscillators.slice(3).map(o=>o.frequency.value),key);audio.stop();assert.ok(oscillators.every(o=>o.stopped));assert.equal(audio.timers.length,0);
});
