import {NarratedPrologue} from './prologue.js?v=epilogue-1';

// Reuse narration's actual-ended progression and same-clip interruption recovery.
export class Epilogue {
  constructor({audio, root, curtain, fade}) {
    this.root=root;this.curtain=curtain;this.fade=fade;this.started=false;
    this.image=root.querySelector('img');
    this.retry=root.querySelector('button');
    this.recovery=root.querySelector('.epilogue-recovery');
    this.player=new NarratedPrologue({audio,
      clips:['assets/epilogue1.mp3','assets/epilogue2.mp3'],images:[null,this.image],holdMs:0,
      onScene:()=>{},onReady:()=>{},
      onRetry:show=>{this.recovery.hidden=!show;},
      onAdvance:async next=>{
        curtain.classList.add('is-black');await fade(curtain,2100);
        root.classList.add('has-backdrop');
        if(next===1){this.image.hidden=false;}
        else {this.image.hidden=true;root.querySelector('.the-end').hidden=false;this.player.stop();}
        void curtain.offsetWidth;curtain.classList.remove('is-black');await fade(curtain,2100);
      },
    });
    this.retry.onclick=async()=>{
      this.recovery.hidden=true;
      if(this.player.phase==='retry')this.player.retry();
      else await this.play();
    };
    window.addEventListener('pagehide',()=>{if(this.player.phase==='playing'&&!audio.ended)this.player.fail();});
  }
  prepare(){return this.player.prepare();}
  async play(){
    if(this.player.active)return;
    if(!await this.prepare()){this.recovery.hidden=false;return;}
    this.player.start();
  }
  start(){
    if(this.started)return;
    this.started=true;this.root.hidden=false;document.body.classList.add('epilogue-playing');
    this.play();
  }
}
