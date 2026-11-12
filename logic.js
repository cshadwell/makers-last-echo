export const normalize = text => text.trim().toUpperCase().replace(/\s+/g,' ');
export const correctAnswer = (text, words) => normalize(text) === words.join(' ');
export function enterNote(attempt, note, melody) {
  const next = [...attempt,note];
  return {attempt:next, complete:next.length === melody.length,
    correct:next.length === melody.length && next.every((n,i)=>n===melody[i])};
}
export const frequency = midi => 440 * 2 ** ((midi-69)/12);
export function schedule(words, timing) {
  let time=0; const events=[];
  words.forEach((word,group)=>{
    [...word].forEach((note,index)=>{events.push({note,group,time,duration:timing.note});time+=timing.note+(index===word.length-1?timing.wordGap:timing.gap);});
  });
  return events;
}
export function readProgress(storage,key) {
  try { const s=JSON.parse(storage.getItem(key)); return {unlocked:!!(s?.unlocked||s?.solved),solved:!!s?.solved, submission:s?.submission?.mockAccepted?s.submission:null}; }
  catch {return {unlocked:false,solved:false,submission:null};}
}
export async function submitCompletion(state, name, adapter, persist) {
  if (!state.solved) throw Error('Complete the puzzle first.');
  if (state.busy || state.submission) return false;
  const trimmed=name.trim(); if (!trimmed || trimmed.length>80) throw Error('Enter a name of 1–80 characters.');
  state.busy=true;
  try {
    // Keep the same idempotency key for retries and reloads. A real endpoint must enforce it.
    const receipt=await adapter.submit({name:trimmed,id:state.completionId});
    if (!receipt.accepted) throw Error('Submission was not accepted. Please retry.');
    state.submission={mockAccepted:true,name:trimmed}; persist();return true;
  } finally {state.busy=false;}
}
