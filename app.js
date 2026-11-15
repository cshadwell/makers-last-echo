import {KnockEntry} from './knock-entry.js';
import {CottageAtmosphere} from './cottage.js?v=three-knocks-1';
import {WorkshopAtmosphere} from './atmosphere.js?v=three-knocks-1';
import {NarratedPrologue} from './prologue.js';
import {config} from './config.js?v=three-knocks-1';
import {readProgress} from './logic.js';
import {FinalChallenge} from './challenge.js?v=three-knocks-1';
const $=id=>document.getElementById(id);
const cottage = new CottageAtmosphere($('cottage-entry'));
cottage.start();
function leaveCottage() {
  cottage.stop();
  document.body.classList.remove('cottage-entry');
  $('cottage-entry').classList.add('is-leaving');
  setTimeout(() => { $('cottage-entry').hidden = true; }, motionPreference.matches ? 0 : 1200);
}
let storage;try{storage=window.localStorage;}catch{}
if (new URLSearchParams(location.search).get('reset') === '1') {
  storage?.removeItem(config.storageKey);
  storage?.removeItem(config.challenge.storageKey);
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete('reset');
  history.replaceState(null, '', cleanUrl);
}
const state={...readProgress(storage,config.storageKey),busy:false};
try{state.completionId=JSON.parse(storage.getItem(config.storageKey))?.completionId;}catch{}
state.completionId ||= crypto.randomUUID?.() || `finale-${Date.now()}-${Math.random()}`;
const challenge = new FinalChallenge({audio: $('prologue-audio'), settings: config.challenge, storage});
challenge.prepare();
let puzzleOpen=false;
try{state.introSeen=!!JSON.parse(storage.getItem(config.storageKey))?.introSeen;}catch{}
const visual = config.visuals;
const scene = $('scene');
const stage = $('scene-stage');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
$('workshop-image').src = visual.image;
const atmosphere = new WorkshopAtmosphere(scene, visual);
const prologueScenes = [
  {element: scene, effects: atmosphere},
  {element: $('workbench-scene'), effects: new WorkshopAtmosphere($('workbench-scene'), config.workbenchVisuals)},
  {element: $('writing-scene'), effects: new WorkshopAtmosphere($('writing-scene'), config.writingVisuals)},
];
let sceneIndex = 0;
let cancelFade;

function resetPrologue() {
  cancelFade?.();
  sceneIndex = 0;
  for (const [index, {element, effects}] of prologueScenes.entries()) {
    effects.stop();
    element.classList.remove('is-visible', 'is-still');
    element.hidden = index !== 0;
  }
}

let skipTimer;
let skipWindowStarted = false;
function openPuzzle({skipListening = false} = {}) {
  knock.stop();
  leaveCottage();
  clearTimeout(skipTimer);
  $('skip-prologue').hidden = true;
  document.body.classList.remove('opening-black', 'cinematic-entry');
  const cinematic = document.body.classList.contains('prologue-playing');
  prologue.stop();
  challenge.stop();
  cancelFade?.();
  puzzleOpen = true;
  state.introSeen = true;
  save();
  for (const {element, effects} of prologueScenes) {
    effects.stop();
    element.classList.add('is-still');
  }
  // Stage the listening layout before the first visible challenge frame.
  challenge.prepareEntry({playSequence: cinematic && !skipListening, skipListening});
  $('puzzle').hidden = false;
  document.body.classList.add('challenge-open');
  $('layout').classList.add('puzzle-open');
  $('enter-workshop').hidden = true;
  $('resume-workshop').hidden = true;
  $('replay-intro').hidden = false;
  $('intro-status').textContent = 'The workshop is yours. The keys await.';

  const reveal = () => {
    document.body.classList.remove('prologue-playing', 'prologue-ending');
    document.body.classList.add('challenge-open');
    $('puzzle').focus({preventScroll: true});
    challenge.enter({playSequence: cinematic && !skipListening, skipListening});
  };
  if (!cinematic || motionPreference.matches) {
    reveal();
    return;
  }
  document.body.classList.add('prologue-ending');
  waitForFade(stage, 850).then(reveal);
}

function waitForFade(element, timeout) {
  if (motionPreference.matches) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer);
      element.removeEventListener('transitionend', ended);
      motionPreference.removeEventListener('change', changed);
      cancelFade = null;
      resolve();
    };
    const ended = event => {
      if (event.target === element && event.propertyName === 'opacity') finish();
    };
    const changed = () => { if (motionPreference.matches) finish(); };
    const timer = setTimeout(finish, timeout);
    cancelFade = finish;
    element.addEventListener('transitionend', ended);
    motionPreference.addEventListener('change', changed);
  });
}

async function advanceScene(index) {
  const next = prologueScenes[index];
  if (!next) {
    openPuzzle();
    return;
  }
  const outgoing = prologueScenes[sceneIndex];
  next.element.hidden = false;
  next.effects.start('intro');
  void next.element.offsetWidth;
  next.element.classList.add('is-visible');
  await waitForFade(next.element, 2100);
  if (!prologue.active) return;
  outgoing.effects.stop();
  outgoing.element.hidden = true;
  sceneIndex = index;
}

const prologue = new NarratedPrologue({
  audio: $('prologue-audio'),
  clips: config.prologueClips,
  images: [...prologueScenes.map(({element}) => element.querySelector('img')), ...document.querySelectorAll('.knocker-frame')],
  onScene() {
    resetPrologue();
    challenge.stop();
    puzzleOpen = false;
    $('puzzle').hidden = true;
    $('layout').classList.remove('puzzle-open');
    document.body.classList.remove('challenge-open');
    document.body.classList.add('prologue-playing');
    scene.classList.add('introduced', 'ambient');
    atmosphere.start('intro');
    void stage.offsetWidth;
  },
  onPlaying() {
    leaveCottage();
    document.body.classList.remove('opening-black');
    if (!skipWindowStarted) {
      skipWindowStarted = true;
      skipTimer = setTimeout(() => { $('skip-prologue').hidden = true; }, 10000);
    }
  },
  onAdvance: advanceScene,
  onRetry(show) {
    $('prologue-recovery').hidden = !show;
    if (show) {
      $('knocker-entry').disabled = false;
      $('retry-prologue').textContent = 'Retry narration';
      $('retry-prologue').focus({preventScroll: true});
    }
  },
  onReady(ready) {
    if (puzzleOpen) return;
    $('skip-prologue').hidden = false;
    if (ready) {
      knock.prepare().then(() => {
        if (puzzleOpen) return;
        $('knocker-entry').disabled = false;
        $('prologue-recovery').hidden = true;
      }).catch(showKnockError);
    }
    else {
      $('prologue-recovery').hidden = false;
      $('retry-prologue').textContent = 'Retry loading prologue';
    }
  },
});

let knockFailed = false;
function showKnockError() {
  knockFailed = true;
  $('knocker-entry').disabled = false;
  $('prologue-recovery').hidden = false;
  $('retry-prologue').textContent = 'Retry knocking';
}
const knock = new KnockEntry({
  audio: $('prologue-audio'), frames: document.querySelectorAll('.knocker-frame'),
  reducedMotion: motionPreference,
  onComplete: () => { knockFailed = false; playEntry(); },
  onError: showKnockError,
});
function startKnocking() {
  if (knock.active) return;
  $('knocker-entry').disabled = true;
  $('prologue-recovery').hidden = true;
  if (!knock.url) {
    // A retry that needs another download must preserve the explicit audio gesture.
    knock.prepare().then(() => { $('knocker-entry').disabled = false; }).catch(showKnockError);
    return;
  }
  prologue.stop();
  knockFailed = false;
  knock.play();
}

function startIntroduction() {
  if (prologue.urls) prologue.start();
  else preparePrologue();
}
function preparePrologue() {
  $('enter-workshop').disabled = true;
  $('replay-intro').disabled = true;
  $('intro-status').textContent = 'Loading the prologue…';
  prologue.prepare();
}
$('enter-workshop').onclick = startIntroduction;
$('replay-intro').onclick = startIntroduction;
$('resume-workshop').onclick = openPuzzle;
function playEntry() {
  if (!prologue.urls) preparePrologue();
  else if (prologue.phase === 'retry') prologue.retry();
  else prologue.start();
}
$('retry-prologue').onclick = () => knockFailed ? startKnocking() : playEntry();
$('knocker-entry').onclick = startKnocking;
$('skip-prologue').onclick = () => openPuzzle({skipListening: true});
preparePrologue();

for(const [key,value] of Object.entries(visual.doorway))scene.style.setProperty(`--door-${key}`,`${value}%`);
if(state.introSeen||state.unlocked||state.solved||challenge.listened){
 $('resume-workshop').hidden=false;$('intro-status').textContent='Your progress is saved. Resume your puzzle, or enter to hear the introduction.';
}

function save() {
  try { storage.setItem(config.storageKey, JSON.stringify(state)); } catch {}
}
window.addEventListener('pagehide', () => {
  knock.stop();
  if (prologue.phase === 'playing' && !prologue.audio.ended) prologue.fail();
  else if (challenge.player.phase === 'playing' && !challenge.player.audio.ended) challenge.player.fail();
});
