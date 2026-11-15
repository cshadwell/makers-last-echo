// Impact times include 180 ms of silent lift preparation; original knock.mp3 is retained.
export const knockImpacts = [.25, .57, .89];
export function knockFrameAt(time, impacts = knockImpacts) {
  for (const impact of impacts) {
    const start = impact - .24, peak = impact - .06;
    if (time >= start && time < impact) {
      return time < peak ? 3 * (time - start) / (peak - start) : 3 * (impact - time) / (impact - peak);
    }
  }
  return 0;
}
export class KnockEntry {
  constructor({audio, frames, reducedMotion, onComplete, onError}) {
    Object.assign(this, {audio, frames: [...frames], reducedMotion, onComplete, onError});
    this.active = false;
    this.run = 0;
    audio.addEventListener('ended', () => {
      if (!this.active || !audio.ended) return;
      this.stop();
      this.onComplete();
    });
    audio.addEventListener('error', () => { if (this.active) this.fail(); });
    audio.addEventListener('pause', () => { if (this.active && !audio.ended) this.fail(); });
  }
  async prepare() {
    if (this.url) return;
    if (!this.preparing) this.preparing = (async () => {
      const response = await fetch(new URL('assets/knock-entry.wav', import.meta.url));
      if (!response.ok) throw Error('Knock recording unavailable');
      this.url = URL.createObjectURL(await response.blob());
    })().finally(() => { this.preparing = null; });
    return this.preparing;
  }
  render(time) {
    const frame = this.reducedMotion.matches ? 0 : knockFrameAt(time);
    this.frames.forEach((image, index) => {
      image.style.opacity = index ? Math.max(0, Math.min(1, frame - index + 1)) : 1;
    });
  }
  play() {
    if (this.active || !this.url) return;
    this.active = true;
    const run = ++this.run;
    this.audio.src = this.url;
    this.render(0);
    const tick = () => {
      if (!this.active || this.run !== run) return;
      this.render(this.audio.currentTime);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    // Use the same HTML audio element as narration, unlocking it on this click.
    this.audio.play().catch(() => { if (this.active && this.run === run) this.fail(); });
  }
  fail() { this.stop(); this.onError(); }
  stop() {
    this.active = false;
    this.run++;
    cancelAnimationFrame(this.frame);
    this.audio.pause();
    this.render(0);
  }
}
