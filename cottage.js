// Slow independent firelight, confined by image-coordinate SVG masks.
export function cottageLightLevels(seconds) {
  const light = (phase, rate) => .55 + .10 * Math.sin(seconds * .71 * rate + phase)
    + .055 * Math.sin(seconds * 1.19 * rate + phase * 2)
    + .025 * Math.sin(seconds * 1.83 * rate + .4 + phase);
  return [light(0, 1), light(2.1, .87)];
}
export class CottageAtmosphere {
  constructor(root) {
    this.root = root;
    this.groups = [...root.querySelectorAll('[data-window]')];
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.active = false;
    this.frame = 0;
    this.update = () => { if (this.active) this.start(); };
    this.preference.addEventListener('change', this.update);
    document.addEventListener('visibilitychange', this.update);
  }
  render(seconds) {
    const values = this.preference.matches ? [.55, .55] : cottageLightLevels(seconds);
    this.groups.forEach((group, index) => group.style.setProperty('--window-light', values[index]));
  }
  start() {
    cancelAnimationFrame(this.frame);
    this.active = true;
    this.render(performance.now() / 1000);
    if (this.preference.matches || document.hidden) return;
    const tick = now => {
      if (!this.active) return;
      if (!this.last || now - this.last > 50) { this.render(now / 1000); this.last = now; }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  stop() { this.active = false; cancelAnimationFrame(this.frame); this.frame = 0; }
}
