import {KnockEntry} from './knock-entry.js?v=completed-note-2';
import {CottageAtmosphere} from './cottage.js?v=completed-note-2';
import {WorkshopAtmosphere} from './atmosphere.js?v=completed-note-2';
import {NarratedPrologue} from './prologue.js?v=completed-note-2';
import {config} from './config.js?v=completed-note-2';
import {readProgress} from './logic.js';
import {FinalChallenge} from './challenge.js?v=completed-note-2';
import {Epilogue} from './epilogue.js?v=completed-note-2';
import {loadEntrance, loadImage} from './loading.js';
const $ = id => document.getElementById(id);
let storage; try { storage = window.localStorage; } catch {}
if (new URLSearchParams(location.search).get('reset') === '1') {
  storage?.removeItem(config.storageKey);
  storage?.removeItem(config.challenge.storageKey);
  const cleanUrl = new URL(location.href); cleanUrl.searchParams.delete('reset');
  history.replaceState(null, '', cleanUrl);
}
const state = {...readProgress(storage, config.storageKey)};
try { state.introSeen = !!JSON.parse(storage.getItem(config.storageKey))?.introSeen; } catch {}
const audio = $('prologue-audio');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const cottageRoot = $('cottage-entry');
let epilogue;
let cottage, challenge, challengeTask, entranceTask, laterTask;
let puzzleOpen = false, enteringStudio = false, flowRun = 0, sceneIndex = 0;
let cancelFade, skipTimer, skipWindowStarted = false, retryAction;
const scene = $('scene'), stage = $('scene-stage');
const prologueScenes = [
  {element: scene, effects: new WorkshopAtmosphere(scene, config.visuals)},
  {element: $('workbench-scene'), effects: new WorkshopAtmosphere($('workbench-scene'), config.workbenchVisuals)},
  {element: $('writing-scene'), effects: new WorkshopAtmosphere($('writing-scene'), config.writingVisuals)},
  {element: $('finished-piano-scene'), effects: new WorkshopAtmosphere($('finished-piano-scene'), config.finishedPianoVisuals)},
];
for (const [key, value] of Object.entries(config.visuals.doorway)) scene.style.setProperty(`--door-${key}`, `${value}%`);

function recovery(message, action) {
  retryAction = action;
  $('prologue-recovery').hidden = !message;
  if (message) {
    $('prologue-recovery').querySelector('p').textContent = message;
    $('retry-prologue').textContent = 'Retry';
  }
}
function waitForFade(element, timeout) {
  if (motionPreference.matches) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer); element.removeEventListener('transitionend', ended);
      motionPreference.removeEventListener('change', changed); cancelFade = null; resolve();
    };
    const ended = event => { if (event.target === element && event.propertyName === 'opacity') finish(); };
    const changed = () => { if (motionPreference.matches) finish(); };
    const timer = setTimeout(finish, timeout);
    cancelFade = finish;
    element.addEventListener('transitionend', ended);
    motionPreference.addEventListener('change', changed);
  });
}
function stopSceneEffects() { for (const {effects} of prologueScenes) effects.stop(); }
function resetPrologue() {
  cancelFade?.(); sceneIndex = 0;
  prologueScenes.forEach(({element, effects}, index) => {
    effects.stop(); element.classList.remove('is-visible', 'is-still'); element.hidden = index !== 0;
  });
}
async function ensureChallenge() {
  if (challengeTask) return challengeTask;
  challengeTask = (async () => {
    if (!challenge) {
      epilogue = new Epilogue({audio, root:$('epilogue'), curtain:$('handoff-curtain'), fade:waitForFade, onBlack:()=>$('line-dialog').close()});
      challenge = new FinalChallenge({audio, settings: config.challenge, storage, onSolved:()=>epilogue.start()});
      epilogue.prepare();
    }
    // These CSS textures and the handwriting font are intentionally deferred too.
    await Promise.all([
      challenge.prepare(),
      ...['assets/web/walnut.jpg', 'assets/web/portrait-frame.jpg'].map(async src => {
        const image = new Image(); image.src = src; await loadImage(image);
      }),
    ]);
    document.fonts?.load('16px FauxAntique').catch(() => {});
    return challenge;
  })().finally(() => { challengeTask = null; });
  return challengeTask;
}
async function stageLaterContent() {
  if (laterTask) return laterTask;
  laterTask = (async () => {
    // One upcoming scene at a time. None of this competes with the entrance.
    await prologue.prepareClip(1);
    await prologue.prepareClip(2);
    await prologue.prepareClip(3);
    await ensureChallenge();
  })().catch(() => { laterTask = null; });
  return laterTask;
}
async function advanceScene(index) {
  const next = prologueScenes[index];
  if (!next) { await openPuzzle(); return; }
  const outgoing = prologueScenes[sceneIndex];
  next.element.hidden = false; next.effects.start('intro');
  void next.element.offsetWidth; next.element.classList.add('is-visible');
  await waitForFade(next.element, 2100);
  if (!prologue.active) return;
  outgoing.effects.stop(); outgoing.element.hidden = true; sceneIndex = index;
}
const prologue = new NarratedPrologue({
  audio, clips: config.prologueClips,
  images: prologueScenes.map(({element}) => element.querySelector('img')),
  progressive: true,
  onScene() {
    resetPrologue(); challenge?.stop(); puzzleOpen = false;
    $('puzzle').hidden = true; $('layout').classList.remove('puzzle-open');
    document.body.classList.remove('challenge-open'); document.body.classList.add('prologue-playing');
    scene.classList.add('introduced', 'ambient'); prologueScenes[0].effects.start('intro');
  },
  onPlaying() {
    // Narration begins only after the first workshop fade has finished.
    if (!skipWindowStarted) {
      skipWindowStarted = true; $('skip-prologue').hidden = false;
      skipTimer = setTimeout(() => { $('skip-prologue').hidden = true; }, 10000);
      stageLaterContent();
    }
  },
  onAdvance: advanceScene,
  onRetry(show) {
    if (show) recovery('Narration was interrupted.', () => prologue.retry());
    else recovery('');
  },
  onReady() {},
});
const knock = new KnockEntry({
  audio, frames: document.querySelectorAll('.knocker-frame'), reducedMotion: motionPreference,
  onComplete: enterStudio,
  onError() {
    $('knocker-entry').disabled = false;
    recovery('The knocking sound could not play.', startKnocking);
  },
});
async function prepareEntrance() {
  if (entranceTask) return entranceTask;
  $('knocker-entry').disabled = true;
  recovery('');
  entranceTask = loadEntrance({
    image: $('cottage-image'), frames: [...document.querySelectorAll('.knocker-frame')],
    async setupLighting() {
      cottageRoot.querySelectorAll('[data-href]').forEach(image => image.setAttribute('href', image.dataset.href));
      if (!cottage) cottage = new CottageAtmosphere(cottageRoot);
      cottage.start(); cottageRoot.querySelector('.cottage-lighting').removeAttribute('hidden');
    },
    prepareSound: () => knock.prepare(),
    onReady() {
      cottageRoot.dataset.ready = 'true'; $('knocker-entry').disabled = false;
      // First workshop only, and only after the entire entrance is ready to use.
      prologue.prepare();
    },
  }).catch(() => {
    recovery('The doorway could not load.', prepareEntrance);
  }).finally(() => { entranceTask = null; });
  return entranceTask;
}
function startKnocking() {
  if (knock.active || enteringStudio || !knock.url) return;
  recovery(''); $('knocker-entry').disabled = true;
  knock.play();
}
async function enterStudio() {
  if (enteringStudio || puzzleOpen) return;
  enteringStudio = true;
  const run = flowRun;
  try {
    // If a visitor clicks immediately, the first scene can finish loading while the door stays visible.
    if (!await prologue.prepare()) throw Error('Workshop unavailable');
    if (run !== flowRun) return;
    cottage?.stop(); cottageRoot.classList.add('is-leaving');
    await waitForFade(cottageRoot, 700);
    if (run !== flowRun) return;
    cottageRoot.hidden = true; document.body.classList.remove('cottage-entry');
    prologue.start(0, {deferPlayback: true});
    document.body.classList.add('studio-reveal');
    void stage.offsetWidth;
    document.body.classList.remove('opening-black');
    await waitForFade(document.body, 1050);
    if (run !== flowRun) return;
    prologue.play();
  } catch {
    enteringStudio = false;
    recovery('The workshop could not load.', enterStudio);
  }
}
async function openPuzzle({skipListening = false} = {}) {
  const cinematic = document.body.classList.contains('prologue-playing');
  const run = ++flowRun;
  knock.stop(); prologue.stop(); clearTimeout(skipTimer); $('skip-prologue').hidden = true;
  stopSceneEffects(); cancelFade?.();
  let game;
  try { game = await ensureChallenge(); }
  catch { recovery('The musical challenge could not load.', () => openPuzzle({skipListening})); return; }
  if (run !== flowRun) return;
  game.stop(); game.prepareEntry({playSequence: cinematic && !skipListening, skipListening});
  puzzleOpen = true; state.introSeen = true;
  try { storage?.setItem(config.storageKey, JSON.stringify(state)); } catch {}
  const slowHandoff = cinematic && !skipListening;
  const curtain = $('handoff-curtain');
  if (slowHandoff) {
    curtain.classList.add('is-black');
    await waitForFade(curtain, 2100);
    if (run !== flowRun) return;
  }
  $('puzzle').hidden = false; $('layout').classList.add('puzzle-open');
  document.body.classList.add('challenge-open');
  document.body.classList.remove('opening-black', 'cinematic-entry', 'studio-reveal', 'prologue-playing', 'prologue-ending');
  if (slowHandoff) {
    // Let the player see and read the first parchment before its recording starts.
    game.reveal(0);
    void curtain.offsetWidth;
    curtain.classList.remove('is-black');
    await waitForFade(curtain, 2100);
    if (run !== flowRun) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (run !== flowRun) return;
  $('puzzle').focus({preventScroll: true});
  game.enter({playSequence: cinematic && !skipListening, skipListening});
}
$('knocker-entry').onclick = startKnocking;
$('retry-prologue').onclick = () => retryAction?.();
$('skip-prologue').onclick = () => openPuzzle({skipListening: true});
prepareEntrance();
window.addEventListener('pagehide', () => {
  if (knock.active) {
    knock.stop();
    $('knocker-entry').disabled = false;
  }
  if (prologue.phase === 'playing' && !audio.ended) prologue.fail();
  else if (challenge?.player.phase === 'playing' && !audio.ended) challenge.player.fail();
  cottage?.stop();
});
window.addEventListener('pageshow', () => {
  if (!cottageRoot.hidden && !enteringStudio) cottage?.start();
});
