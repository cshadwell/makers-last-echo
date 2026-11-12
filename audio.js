import {frequency,schedule} from './logic.js';
export class Instrument {
  constructor(settings){this.settings=settings;this.voices=new Set();this.timers=[];this.generation=0;}
  async ready(){
    this.context ??= new (window.AudioContext||window.webkitAudioContext)();
    await this.context.resume();
    if(this.context.state!=='running') throw Error('Audio is unavailable. Tap a piano key to try again.');
  }
  tone(letter,when=this.context.currentTime,duration=this.settings.timing.note){
    const ctx=this.context;const note=this.settings.notes.find(n=>n.letter===letter);
    const gain=ctx.createGain();gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(.22,when+.012);
    gain.gain.exponentialRampToValueAtTime(.001,when+duration);
    // One shared, soft harmonic voice for reference keys AND message notes.
    const oscillators=[1,2,3].map((harmonic,i)=>{
      const osc=ctx.createOscillator(),level=ctx.createGain();level.gain.value=[1,.20,.06][i];
      osc.frequency.value=frequency(note.midi)*harmonic;osc.connect(level);level.connect(gain);
      this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);level.disconnect();};
      osc.start(when);osc.stop(when+duration+.025);return osc;
    });
    oscillators[0].addEventListener('ended',()=>gain.disconnect());
  }
  stop(){this.generation++;for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();this.timers.forEach(clearTimeout);this.timers=[];}
  async key(letter){this.stop();const token=this.generation;await this.ready();if(token===this.generation)this.tone(letter);}
  async play(words,onEnd){
    this.stop();const token=this.generation;await this.ready();if(token!==this.generation)return;
    const events=schedule(words,this.settings.timing),start=this.context.currentTime+.06;
    for(const event of events)this.tone(event.note,start+event.time,event.duration);
    const end=events.at(-1);this.timers.push(setTimeout(()=>{if(token===this.generation)onEnd();},(end.time+end.duration+.1)*1000));
  }
}
