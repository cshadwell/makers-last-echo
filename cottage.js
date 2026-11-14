// Slow independent firelight, confined by image-coordinate SVG masks.
export function cottageLightLevels(seconds) {
  const light = (phase, rate) => .55 + .10 * Math.sin(seconds * .71 * rate + phase)
    + .055 * Math.sin(seconds * 1.19 * rate + phase * 2)
    + .025 * Math.sin(seconds * 1.83 * rate + .4 + phase);
  return [light(0, 1), light(2.1, .87)];
}
// Three broad patches rise through the glass with soft entry/exit, never a visible reset.
export function cottagePatchState(seconds, windowIndex, patchIndex) {
  const phase = patchIndex / 3 + windowIndex * .17;
  const rate = .14 + patchIndex * .017 + windowIndex * .009;
  const progress = ((seconds * rate + phase) % 1 + 1) % 1;
  const eddy = seconds * .83 + patchIndex * 2.3 + windowIndex * 1.7;
  const flicker = .92 + .045 * Math.sin(seconds * 3.1 + phase * 5)
    + .035 * Math.sin(seconds * 5.7 + patchIndex * 2);
  return {
    x: (windowIndex ? 1358 : 318) + 45 * Math.sin(eddy) + 12 * Math.sin(seconds * 1.31 + phase),
    y: 510 - progress * 400,
    rx: 85 + 22 * Math.sin(eddy * .73 + 1),
    ry: 105 + 30 * Math.cos(eddy * .61),
    opacity: Math.pow(Math.sin(Math.PI * progress), .55) * flicker,
  };
}
export class CottageAtmosphere {
  constructor(root) {
    this.root = root;
    this.groups = [...root.querySelectorAll('[data-window]')];
    this.patchGroups = [...root.querySelectorAll('[data-fire-window]')].map(group => [...group.querySelectorAll('.fire-patch')]);
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
    this.patchGroups.forEach((patches, windowIndex) => {
      let reflectedEnergy = 0;
      patches.forEach((patch, patchIndex) => {
        const state = cottagePatchState(this.preference.matches ? 0 : seconds, windowIndex, patchIndex);
        reflectedEnergy += state.opacity * Math.max(0, 1 - Math.abs(state.y - 330) / 260);
        for (const [attribute, value] of Object.entries(state)) {
          patch.setAttribute(attribute === 'x' ? 'cx' : attribute === 'y' ? 'cy' : attribute, value.toFixed(4));
        }
      });
      // Sill/stone reflection follows the same moving patches, at lower strength.
      const reflection = this.preference.matches ? .55 : .30 + reflectedEnergy / Math.max(1, patches.length) * .60;
      this.groups[windowIndex]?.style.setProperty('--window-light', reflection);
    });
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
