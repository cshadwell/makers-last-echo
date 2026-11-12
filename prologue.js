// One media element carries the initial user gesture across the three clips.
export class NarratedPrologue {
  constructor({audio, clips, images, onScene, onAdvance, onRetry, onReady, onPlaying, holdMs = 500}) {
    Object.assign(this, {audio, clips, images, onScene, onAdvance, onRetry, onReady, onPlaying, holdMs});
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

  async prepare() {
    if (this.urls || this.preparing) return;
    this.preparing = true;
    try {
      const [recordings] = await Promise.all([
        Promise.all(this.clips.map(async path => {
          const response = await fetch(path);
          if (!response.ok) throw new Error('Recording unavailable');
          const recording = await response.blob();
          if (!recording.size) throw new Error('Empty recording');
          return recording;
        })),
        Promise.all(this.images.map(image => image.decode())),
      ]);
      this.urls = recordings.map(recording => URL.createObjectURL(recording));
      this.onReady(true);
    } catch {
      this.onReady(false);
    } finally {
      this.preparing = false;
    }
  }

  start(index = 0) {
    if (!this.urls || this.active) return;
    this.index = index;
    this.onScene();
    this.loadClip();
    this.play();
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
    if (this.audio.error) this.loadClip(this.position);
    this.play();
  }

  async advance() {
    this.clearPlaybackTimer();
    this.phase = 'transition';
    const run = this.run;
    await new Promise(resolve => setTimeout(resolve, this.holdMs));
    if (run !== this.run) return;
    await this.onAdvance(this.index + 1);
    if (run !== this.run || this.index + 1 >= this.clips.length) return;
    this.index++;
    this.loadClip();
    this.play();
  }

  stop() {
    this.run++;
    this.phase = 'idle';
    this.clearPlaybackTimer();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.onRetry(false);
  }
}
