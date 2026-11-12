import test from 'node:test';
import assert from 'node:assert/strict';
import {NarratedPrologue} from '../prologue.js';

class Media extends EventTarget {
  currentTime = 0;
  paused = true;
  ended = false;
  plays = [];
  play() {
    this.plays.push(this.src);
    if (this.blocked) return Promise.reject(new Error('Playback blocked'));
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  removeAttribute() { this.src = ''; }
  load() {}
}

test('narration retries on the same clip and advances once after a genuine end', async () => {
  const audio = new Media();
  let finishFade;
  let markFadeStarted;
  const fadeStarted = new Promise(resolve => { markFadeStarted = resolve; });
  const retries = [];
  const scenes = [];
  const prologue = new NarratedPrologue({
    audio, clips: ['one', 'two', 'three'], images: [],
    onScene() {},
    onRetry(show) { retries.push(show); },
    onAdvance(index) {
      scenes.push(index);
      markFadeStarted();
      return new Promise(resolve => { finishFade = resolve; });
    },
  });
  prologue.urls = ['one', 'two', 'three'];
  try {
    audio.blocked = true;
    prologue.start();
    await Promise.resolve();
    assert.equal(retries.at(-1), true);
    assert.deepEqual(scenes, []);
    audio.blocked = false;
    prologue.retry();
    audio.currentTime = 8;
    audio.pause();
    audio.dispatchEvent(new Event('pause'));
    assert.equal(retries.at(-1), true);
    prologue.retry();
    assert.equal(audio.currentTime, 8);
    assert.deepEqual(audio.plays, ['one', 'one', 'one']);
    audio.dispatchEvent(new Event('ended'));
    assert.equal(prologue.phase, 'playing');
    audio.ended = true;
    audio.dispatchEvent(new Event('ended'));
    audio.dispatchEvent(new Event('ended'));
    await fadeStarted;
    assert.deepEqual(scenes, [1]);
    assert.equal(audio.plays.at(-1), 'one');
    finishFade();
    await Promise.resolve();
    assert.equal(audio.plays.at(-1), 'two');
  } finally {
    prologue.stop();
  }
});
