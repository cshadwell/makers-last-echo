// Existing scene overlays, animated independently of all artwork and puzzle/audio state.
export class WorkshopAtmosphere {
  constructor(scene,settings){
    this.scene=scene;this.settings=settings;this.mode='idle';this.frame=0;
    this.preference=matchMedia('(prefers-reduced-motion: reduce)');
    this.preference.addEventListener?.('change',()=>{if(this.preference.matches)this.pause();else if(this.mode!=='idle')this.start(this.mode);});
    this.haze=[...scene.querySelectorAll('.air-haze i')];
    this.beam=scene.querySelector('.light-shaft');
    this.particles=[];
    const dust=scene.querySelector('#dust, .scene-dust');
    for(let i=0;i<Math.min(220,Math.max(0,settings.dustDensity));i++){
      const element=document.createElement('i'),foreground=i%27===0;
      // Stable distribution, varied depth, no sparkling or sudden appearance.
      const size=foreground?6+i%3:1.0+(i%5)*.40;
      element.style.width=element.style.height=`${size}px`;
      element.style.filter=`blur(${foreground?2.2:.25}px)`;
      dust.append(element);
      const x = settings.writing ? 5 + (i * 17.73) % 35 : settings.workbench ? 19 + (i * 17.73) % 58
        : i % 5 === 0 ? 5 + (i * 31.73) % 88 : 15 + (i * 17.73) % 50;
      const y = settings.writing ? 9 + (i * 19.13) % 43 : settings.workbench ? 13 + (i * 19.13) % 44 : 15 + (i * 19.13) % 70;
      this.particles.push({element,x,y,phase:i*2.399,alpha:foreground?.26:.35+i%7*.075});
    }
  }
  pause(){cancelAnimationFrame(this.frame);this.frame=0;}
  stop(){this.pause();this.mode='idle';this.lastIntroSwirl=0;}
  start(mode){
    this.pause();const previous=this.mode;this.mode=mode;
    if(mode==='intro'||previous==='idle')this.started=performance.now();
    if(mode==='puzzle')this.settledAt=performance.now();
    if(this.preference.matches)return;
    const tick=now=>{
      if(!this.last||now-this.last>32){this.last=now;this.render(now);}
      this.frame=requestAnimationFrame(tick);
    };
    this.frame=requestAnimationFrame(tick);
  }
  render(now){
    const s=this.settings,t=(now-this.started)/1000;
    const build=Math.min(1,t/s.entranceSeconds),ease=build*build*(3-2*build);
    const quiet=this.mode==='puzzle'?Math.min(1,(now-this.settledAt)/1800):0;
    const intensity=1-quiet*(1-(s.puzzleAtmosphere ?? 1));
    // Three unrelated slow periods produce smooth, non-uniform candlelight.
    const variation=s.candleVariation ?? 1;
    const candle=.90+variation*(.055*Math.sin(t*.79)+.029*Math.sin(t*1.37+2)+.016*Math.sin(t*2.13+.4));
    this.scene.style.setProperty('--light-level',ease*candle*intensity*s.glowStrength);
    this.scene.style.setProperty('--beam-level',ease*candle*intensity*s.beamOpacity);
    this.scene.style.setProperty('--entrance-dim',this.mode==='intro'?.67*(1-ease):0);
    const mist=this.mode==='intro'?1:1-quiet;
    this.scene.style.setProperty('--haze-level',ease*mist*(s.hazeOpacity ?? 0));
    this.haze.forEach((layer,i)=>{
      layer.style.transform=`translate(${Math.sin(t*.13+i*2)*7}%,${Math.cos(t*.09+i)*9}%) rotate(${Math.sin(t*.07+i)*8}deg)`;
      layer.style.opacity=.45+.20*Math.sin(t*.19+i*2.1);
    });
    this.beam?.style.setProperty('--band-one',`${26+Math.sin(t*.17)*5}deg`);
    this.beam?.style.setProperty('--band-two',`${38+Math.sin(t*.11+2)*4}deg`);
    const swirl = this.mode === 'intro'
      ? (s.entranceSwirlSeconds ? Math.sin(Math.PI * Math.min(1, t / s.entranceSwirlSeconds)) : 0)
      : (this.lastIntroSwirl || 0) * (1 - quiet);
    if(this.mode==='intro')this.lastIntroSwirl=swirl;
    for(const p of this.particles){
      // Nearby motes share an air current; small eddies add depth without falling like snow.
      const flow=Math.sin(t*.20+p.x*.035),eddy=t*.28+p.phase;
      let x=p.x+7*flow+2.8*Math.cos(eddy),y=p.y+4*Math.cos(t*.16+p.x*.035)+2*Math.sin(eddy);
      if(p.x<43){
        const angle=p.phase+t*.48,ringX=28+(8+p.phase%5)*Math.cos(angle),ringY=59+(12+p.phase%7)*Math.sin(angle);
        x=x*(1-swirl*.7)+ringX*swirl*.7;y=y*(1-swirl*.7)+ringY*swirl*.7;
      }
      // Feathered diagonal beam from left doorway toward nearby workroom floor.
      const beamY=s.workbench ? 10+(x-22)*.72 : 43+(x-25)*.65;
      const beam=Math.max(0,1-Math.abs(y-beamY)/13)*Math.max(0,Math.min(1,(x-15)/12,(76-x)/12));
      p.element.style.left=`${x}%`;p.element.style.top=`${y}%`;
      p.element.style.opacity=Math.min(.72,p.alpha*s.particleVisibility*(.60+beam*1.3)*(.45+.55*ease)*intensity);
      p.element.style.backgroundColor=beam>.1?'#ffe1a6':'#c9b99d';
    }
  }
}
