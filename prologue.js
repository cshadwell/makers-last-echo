import {loadImage, fetchRecording} from './loading.js';
// One media element carries the initial user gesture across the three clips.
export class NarratedPrologue {
  constructor({audio, clips, images, onScene, onAdvance, onRetry, onReady, onPlaying, holdMs = 500, progressive = false}) {
    Object.assign(this, {audio, clips, images, onScene, onAdvance, onRetry, onReady, onPlaying, holdMs, progressive});
    this.phase = 'idle';
    this.run = 0;
    this.playAttempt = 0;
    this.audio.addEventListener('ended', () => {
      if (this.phase === 'playing' && this.audio.ended) this.advance();
    });
    this.audio.addEventListener('pause', () => {
      if (this.phase === 'playing' && this.audio.paused && !this.audio.ended) this.fail();
    });
    this.audio.addEventListener('error', () => {
      if (this.phase === 'playing') this.fail();
    });
    for (const event of ['waiting', 'stalled']) {
      this.audio.addEventListener(event, () => {
        if (this.phase === 'playing') this.watchPlayback();
      });
    }
    this.audio.addEventListener('playing', () => {
      if (this.phase !== 'playing') return;
      this.clearPlaybackTimer();
      this.onRetry(false);
      this.onPlaying?.(this.index);
    });
  }

  get active() { return this.phase !== 'idle'; }

  async prepareClip(index) {
    if (this.urls?.[index]) return;
    this.clipLoads ||= [];
    if (!this.clipLoads[index]) {
      this.clipLoads[index] = (async () => {
        const [blob] = await Promise.all([fetchRecording(this.clips[index]), loadImage(this.images[index])]);
        this.urls ||= [];
        this.urls[index] = URL.createObjectURL(blob);
      })().catch(error => { this.clipLoads[index] = null; throw error; });
    }
    return this.clipLoads[index];
  }

  async prepare() {
    if (this.preparing) return this.preparing;
    if (this.progressive ? this.urls?.[0] : this.clips.every((_, index) => this.urls?.[index])) return true;
    this.preparing = (async () => {
      try {
        if (this.progressive) await this.prepareClip(0);
        else {
          const [recordings] = await Promise.all([
            Promise.all(this.clips.map(fetchRecording)),
            Promise.all(this.images.map(loadImage)),
          ]);
          this.urls = recordings.map(recording => URL.createObjectURL(recording));
        }
        this.onReady(true);
        return true;
      } catch {
        this.onReady(false);
        return false;
      } finally { this.preparing = null; }
    })();
    return this.preparing;
  }

  start(index = 0, {deferPlayback = false} = {}) {
    if (!this.urls?.[index] || this.active) return;
    this.index = index;
    this.phase = 'transition';
    this.onScene();
    this.loadClip();
    if (!deferPlayback) this.play();
  }

  loadClip(position = 0) {
    this.audio.src = this.urls[this.index];
    if (position > 0) this.audio.currentTime = position;
  }

  play() {
    this.phase = 'playing';
    const run = this.run;
    const attempt = ++this.playAttempt;
    this.watchPlayback();
    this.audio.play().catch(() => {
      if (run === this.run && attempt === this.playAttempt && this.phase === 'playing') this.fail();
    });
  }

  clearPlaybackTimer() {
    clearTimeout(this.playbackTimer);
    this.playbackTimer = undefined;
  }

  watchPlayback() {
    if (this.playbackTimer !== undefined) return;
    this.playbackTimer = setTimeout(() => {
      if (this.phase === 'playing') this.fail();
    }, 12000);
  }

  fail() {
    this.clearPlaybackTimer();
    this.phase = 'retry';
    this.position = this.audio.currentTime;
    this.audio.pause();
    this.onRetry(true);
  }

  retry() {
    if (this.phase !== 'retry') return;
    if (Number.isInteger(this.pendingIndex)) {
      this.phase = 'transition';
      this.finishAdvance(this.run);
      return;
    }
    if (this.audio.error) this.loadClip(this.position);
    this.play();
  }

  async advance() {
    this.clearPlaybackTimer();
    this.phase = 'transition';
    const run = this.run;
    await new Promise(resolve => setTimeout(resolve, this.holdMs));
    if (run !== this.run) return;
    this.pendingIndex = this.index + 1;
    await this.finishAdvance(run);
  }

  async finishAdvance(run) {
    const next = this.pendingIndex;
    try {
      if (this.progressive && next < this.clips.length) await this.prepareClip(next);
      if (run !== this.run) return;
      await this.onAdvance(next);
      if (run !== this.run) return;
      this.pendingIndex = undefined;
      if (next >= this.clips.length) return;
      this.index = next;
      this.loadClip();
      this.play();
    } catch { if (run === this.run) this.fail(); }
  }

  stop() {
    this.run++;
    this.phase = 'idle';
    this.pendingIndex = undefined;
    this.clearPlaybackTimer();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.onRetry(false);
  }
}
