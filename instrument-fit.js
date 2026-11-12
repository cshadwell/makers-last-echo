// Scale the complete instrument as one unit, including its proportional key regions.
export function fitInstrument(root) {
  let queued = false;
  const fit = () => {
    queued = false;
    if (!root.offsetWidth || !root.offsetHeight) return;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const scale = Math.min(1, (width - 24) / root.offsetWidth, (height - 24) / root.offsetHeight);
    root.style.setProperty('--instrument-scale', String(Math.max(.01, scale)));
  };
  const schedule = () => {
    if (!queued) { queued = true; requestAnimationFrame(fit); }
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(root);
  new MutationObserver(schedule).observe(root, {attributes: true, attributeFilter: ['class', 'hidden']});
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  schedule();
}
