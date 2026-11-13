import test from 'node:test';
import assert from 'node:assert/strict';
import {StanzaPlayer, validFinalLine} from '../challenge.js';

class Media extends EventTarget {
  paused = true;
  ended = false;
  currentTime = 0;
  src = '';
  plays = [];
  play() {
    this.paused = false;
    this.ended = false;
    this.plays.push(this.src);
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  load() { this.currentTime = 0; }
  removeAttribute() { this.src = ''; }
}
test('final line accepts only exact words, whitespace/case variants and one final period', () => {
  for (const answer of ['A FADED AGE DEFACED', ' a  faded\nAGE defaced. ', 'A FADED AGE DEFACED .']) assert.ok(validFinalLine(answer));
  for (const answer of ['A FADED AGE DEFACED..', 'A FADED AGE DEFACED!', 'A FADED DEFACED AGE', 'A FADED AGE', 'A FADED AGE DE FACED']) assert.equal(validFinalLine(answer), false);
});
test('initial stanzas advance on completion and replay switching ignores stale ending', async () => {
  const audio = new Media();
  const reveals = [];
  let completed = false;
  const player = new StanzaPlayer({
    audio, clips: ['1','2','3','4'], images: [],
    onScene() {}, onReady() {}, onRetry() {},
    onPlaying: index => reveals.push(index),
    onAdvance: async next => { if (next === 4) { completed = true; player.stop(); } },
  });
  player.onRest = () => reveals.push(null);
  player.urls = ['1','2','3','4'];
  try {
    player.startInitial();
    for (let i = 0; i < 4; i++) {
      assert.equal(player.index, i);
      audio.ended = true;
      audio.dispatchEvent(new Event('ended'));
      audio.dispatchEvent(new Event('ended'));
      await new Promise(resolve => setTimeout(resolve, 520));
    }
    assert.ok(completed);
    assert.deepEqual(audio.plays, ['1','2','3','4']);
    player.replay(3);
    player.replay(1);
    audio.dispatchEvent(new Event('ended'));
    assert.equal(player.phase, 'playing');
    assert.equal(player.index, 1);
    assert.equal(audio.currentTime, 0);
    audio.ended = true;
    audio.dispatchEvent(new Event('ended'));
    assert.equal(reveals.at(-1), null);
  } finally { player.stop(); }
});

test('measured endpoint stops replay and advances initial playback exactly once', async () => {
  const audio = new Media();
  const advances = [];
  let resting = false;
  const player = new StanzaPlayer({
    audio, clips: ['1', '2'], images: [], endTimes: [10, 12], holdMs: 0,
    onScene() {}, onReady() {}, onRetry() {},
    onAdvance: async index => { advances.push(index); },
  });
  player.urls = ['1', '2'];
  player.onRest = () => { resting = true; };
  try {
    player.startInitial();
    audio.currentTime = 9.99;
    audio.dispatchEvent(new Event('timeupdate'));
    assert.equal(player.index, 0);
    audio.currentTime = 10;
    audio.dispatchEvent(new Event('timeupdate'));
    audio.dispatchEvent(new Event('timeupdate'));
    assert.equal(audio.paused, true);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(advances, [1]);
    assert.equal(player.index, 1);
    player.replay(0);
    audio.currentTime = 10;
    audio.dispatchEvent(new Event('timeupdate'));
    assert.ok(resting);
    assert.equal(player.phase, 'idle');
  } finally { player.stop(); }
});

test('watching the prologue starts the complete listening sequence even with saved progress', async () => {
  const {FinalChallenge} = await import('../challenge.js');
  const challenge = Object.create(FinalChallenge.prototype);
  let starts = 0;
  Object.assign(challenge, {
    listened: true, solved: true, ready: true,
    player: {active: false, startInitial() { starts++; }},
    render() {}, recovery() {},
  });
  challenge.enter();
  assert.equal(starts, 0);
  assert.equal(challenge.sequential, false);
  challenge.enter({playSequence: true});
  assert.equal(starts, 1);
  assert.equal(challenge.sequential, true);
  assert.equal(challenge.listened, true);
  assert.equal(challenge.solved, true);
});

test('prologue handoff hides controls before revealing the challenge or starting audio', async () => {
  const {FinalChallenge} = await import('../challenge.js');
  const challenge = Object.create(FinalChallenge.prototype);
  let starts = 0, listeningAtRender = false;
  Object.assign(challenge, {
    listened: true, entered: false, ready: true,
    player: {active:false, startInitial(){starts++;}},
    render(){listeningAtRender=this.sequential;}, recovery(){},
  });
  challenge.prepareEntry({playSequence:true});
  assert.equal(listeningAtRender,true, 'listening layout is ready while challenge is still hidden');
  assert.equal(challenge.entered,false);
  assert.equal(starts,0, 'narration waits until the handoff finishes');
  challenge.enter({playSequence:true});
  assert.equal(starts,1);
});

test('explicit prologue skip unlocks replay and piano without starting the initial sequence', async () => {
  const {FinalChallenge} = await import('../challenge.js');
  const challenge = Object.create(FinalChallenge.prototype);
  let starts=0, saves=0;
  Object.assign(challenge,{listened:false,ready:true,player:{active:false,startInitial(){starts++;}},render(){},save(){saves++;},recovery(){}});
  challenge.prepareEntry({skipListening:true});
  assert.equal(challenge.listened,true);
  assert.equal(challenge.sequential,false);
  assert.equal(starts,0);
  assert.equal(saves,1);
  challenge.enter({skipListening:true});
  assert.equal(starts,0);
});
