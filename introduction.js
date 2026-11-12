// Narration owns its own HTML audio element; never passes through the clue instrument.
export class Introduction {
  constructor({settings,createMedia=src=>new Audio(src),onChange,onComplete,stopPuzzle}) {
    Object.assign(this,{settings,createMedia,onChange,onComplete,stopPuzzle});
    this.active=false;this.run=0;
  }
  stop(){
    this.run++;clearTimeout(this.loadTimer);
    if(this.media){this.media.onended=null;this.media.onerror=null;this.media.onplaying=null;this.media.pause();try{this.media.currentTime=0;}catch{}this.media=null;}
    this.active=false;
  }
  async start(){
    this.stop();this.stopPuzzle();this.active=true;const run=this.run;
    this.onChange('playing',this.settings.src?'The workshop waits. Listen, or skip to the keys.':this.settings.placeholder);
    if(!this.settings.src)return;
    try {
      const media=this.createMedia(this.settings.src);this.media=media;media.preload='auto';media.volume=this.settings.volume;
      media.onended=()=>{if(run===this.run)this.finish();};
      media.onerror=()=>{if(run===this.run)this.unavailable();};
      media.onplaying=()=>clearTimeout(this.loadTimer);
      this.loadTimer=setTimeout(()=>{if(run===this.run)this.unavailable();},this.settings.loadTimeoutMs);
      await media.play();
      if(run!==this.run)media.pause();
    }catch{if(run===this.run)this.unavailable();}
  }
  unavailable(){this.stop();this.active=true;this.onChange('unavailable','Narration is unavailable. Continue to the puzzle, or skip the introduction.');}
  finish(){this.stop();this.onComplete();}
}
