import {fitInstrument} from './instrument-fit.js';
import {SamplePiano} from './sample-piano.js?v=correct-piano-2';
import {NarratedPrologue} from './prologue.js';

const asset = filename => new URL(`assets/${filename}`, import.meta.url).href;

export const validFinalLine = text =>
  text.trim().replace(/\.$/, '').trim().toUpperCase().replace(/\s+/g, ' ') === 'A FADED AGE DEFACED';

export class StanzaPlayer extends NarratedPrologue {
  constructor(options) {
    super(options);
    this.endTimes = options.endTimes || [];
    this.audio.addEventListener('timeupdate', () => {
      const endAt = this.endTimes[this.index];
      if (this.phase === 'playing' && Number.isFinite(endAt) && this.audio.currentTime >= endAt) {
        this.advance();
      }
    });
  }

  startInitial() {
    this.sequential = true;
    this.start();
  }
  replay(index) {
    this.stop();
    this.sequential = false;
    this.start(index);
  }
  async advance() {
    if (this.phase !== 'playing') return;
    if (this.sequential) {
      const completion = super.advance();
      this.audio.pause();
      return completion;
    }
    this.stop();
    this.onRest();
  }
}

export class FinalChallenge {
  constructor({audio, settings, storage}) {
    this.settings = settings;
    this.storage = storage;
    try {
      const saved = JSON.parse(storage?.getItem(settings.storageKey));
      this.solved = saved?.solved === true;
      this.listened = saved?.listened === true || this.solved;
    } catch {}
    this.panels = [];
    this.buttons = [];
    this.images = [];
    this.ready = false;
    this.entered = false;
    this.sequential = false;

    settings.stanzas.forEach((stanza, index) => {
      const panel = document.createElement('div');
      panel.className = 'stanza-card';
      const frame = document.createElement('div');
      frame.className = 'portrait-frame';
      const blurred = new Image();
      blurred.src = asset(stanza.blurred);
      blurred.alt = '';
      const sharp = new Image();
      sharp.src = asset(stanza.sharp);
      sharp.alt = `Stanza ${index + 1}`;
      sharp.className = 'portrait-sharp';
      frame.append(blurred, sharp);
      const button = document.createElement('button');
      button.textContent = `Replay stanza ${index + 1}`;
      button.classList.add('wooden-button');
      button.setAttribute('aria-label', `Replay stanza ${index + 1}`);
      button.textContent = '';
      const buttonArt = new Image();
      buttonArt.src = asset(`button${index + 1}.png`);
      buttonArt.alt = '';
      button.append(buttonArt);
      this.images.push(buttonArt);
      button.disabled = true;
      button.addEventListener('click', () => {
        if (this.listened && !this.sequential && this.ready) {
          this.reveal(null);
          this.player.replay(index);
        }
      });
      panel.append(frame, button);
      document.getElementById('stanza-panels').append(panel);
      this.panels.push(frame);
      this.buttons.push(button);
      this.images.push(blurred, sharp);
    });

    const makeVerse = lines => {
      const verse = document.createElement('p');
      verse.className = 'poem-verse';
      lines.forEach(line => {
        const row = document.createElement('span');
        row.textContent = line;
        verse.append(row);
      });
      return verse;
    };
    this.poemSheets = settings.poemStanzas.map((lines, index) => {
      const sheet = document.createElement('div');
      sheet.className = 'stanza-sheet';
      const image = new Image();
      image.src = asset(settings.parchmentImage);
      image.alt = '';
      sheet.setAttribute('aria-hidden', 'true');
      const content = document.createElement('div');
      content.className = 'stanza-handwriting';
      content.append(makeVerse(index === 3 ? [...lines, '…'] : lines));
      sheet.append(image, content);
      document.getElementById('stanza-readalong').append(sheet);
      this.images.push(image);
      return sheet;
    });
    const fullPoem = document.getElementById('full-poem-image');
    fullPoem.src = asset(settings.parchmentImage);
    fullPoem.alt = '';
    const fullText = document.getElementById('full-poem-text');
    settings.poemStanzas.forEach(lines => fullText.append(makeVerse(lines)));
    this.images.push(fullPoem);

    const piano = document.getElementById('keyboard-image');
    piano.src = asset(settings.pianoImage);
    this.images.push(piano);
    this.player = new StanzaPlayer({
      audio,
      clips: settings.stanzas.map(stanza => asset(stanza.audio)),
      endTimes: settings.stanzas.map(stanza => stanza.endAt),
      holdMs: settings.stanzaGapMs,
      images: this.images,
      onScene() {},
      onPlaying: index => this.reveal(index),
      onAdvance: async next => {
        if (next === settings.stanzas.length) {
          this.player.stop();
          this.reveal(null);
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          this.listened = true;
          this.sequential = false;
          this.save();
          this.render();
        }
      },
      onRetry: show => this.recovery(show ? 'Playback was interrupted. Retry to continue this stanza.' : ''),
      onReady: ready => {
        this.ready = ready;
        if (!ready && this.entered) this.recovery('The recordings or images could not load. Please retry.');
        if (ready && this.entered && this.sequential) this.startInitial();
        this.render();
      },
    });
    const complete = document.getElementById('complete-line');
    complete.classList.add('wooden-button');
    complete.setAttribute('aria-label', 'Complete the final line');
    complete.textContent = '';
    const completeArt = new Image();
    completeArt.src = asset('complete_button.png');
    completeArt.alt = '';
    complete.append(completeArt);
    this.images.push(completeArt);
    fitInstrument(document.getElementById('puzzle'));
    this.player.onRest = () => this.reveal(null);
    this.piano = new SamplePiano({
      root: document.getElementById('future-key-regions'),
      settings: settings.piano,
    });
    document.getElementById('retry-stanza').onclick = () => {
      if (this.player.phase === 'retry') this.player.retry();
      else if (!this.ready) this.player.prepare();
    };
    document.getElementById('complete-line').onclick = () => {
      if (this.listened && !this.sequential) document.getElementById('line-dialog').showModal();
    };
    document.getElementById('cancel-line').onclick = () => document.getElementById('line-dialog').close();
    document.getElementById('line-form').onsubmit = event => {
      event.preventDefault();
      if (!this.listened || this.sequential) return;
      const value = document.getElementById('missing-line').value;
      if (!validFinalLine(value)) {
        document.getElementById('line-feedback').textContent = 'Not quite. Listen again.';
        return;
      }
      this.piano.stop();
      this.solved = true;
      this.player.stop();
      this.reveal(null);
      this.save();
      this.render();
      document.getElementById('line-dialog').close();
    };
    window.addEventListener('pagehide', () => this.piano.stop());
    this.render();
  }

  prepare() { return this.player.prepare(); }

  prepareEntry({playSequence = false} = {}) {
    this.sequential = playSequence || !this.listened;
    this.render();
  }

  enter(options = {}) {
    this.entered = true;
    this.prepareEntry(options);
    if (!this.sequential) return;
    if (this.ready) this.startInitial();
    else this.recovery('Loading the stanzas. Retry if loading fails.');
  }

  startInitial() {
    if (this.player.active) return;
    this.sequential = true;
    this.recovery('');
    this.render();
    this.player.startInitial();
  }

  stop() {
    this.entered = false;
    this.piano.setEnabled(false);
    this.player.stop();
    this.reveal(null);
  }

  reveal(index) {
    this.poemSheets?.forEach((sheet, i) => {
      const active = (this.sequential || !this.listened) && i === index;
      sheet.classList.toggle('is-reading', active);
      sheet.setAttribute('aria-hidden', String(!active));
    });
    this.panels.forEach((panel, i) => {
      panel.classList.toggle('is-sharp', (this.solved && !this.sequential) || i === index);
      panel.classList.toggle('is-playing', i === index);
    });
  }

  recovery(message) {
    document.getElementById('stanza-recovery').hidden = !message;
    document.getElementById('stanza-status').textContent = message;
  }

  render() {
    const enabled = !!this.listened && !this.sequential;
    document.getElementById('puzzle').classList.toggle('initial-listening', this.sequential || !this.listened);
    document.getElementById('stanza-readalong').hidden = !this.sequential && !!this.listened;
    this.piano?.setEnabled(enabled && this.entered);
    this.buttons.forEach(button => { button.disabled = !enabled || !this.ready; });
    document.getElementById('complete-line').disabled = !enabled || this.solved;
    document.getElementById('final-victory').hidden = !this.solved || this.sequential;
    this.reveal(this.player?.phase === 'playing' ? this.player.index : null);
  }

  save() {
    try {
      this.storage.setItem(this.settings.storageKey, JSON.stringify({listened: !!this.listened, solved: !!this.solved}));
    } catch {
      const status = document.getElementById('save-status');
      status.hidden = false;
      status.textContent = 'Progress could not be saved in this browser. Keep this page open.';
    }
  }
}
