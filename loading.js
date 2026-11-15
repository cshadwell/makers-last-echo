// Activate deferred sources explicitly: hidden scenes must not start downloads on arrival.
export async function loadImage(image) {
  if (!image) return;
  if (image.dataset?.src) image.src = image.dataset.src;
  let timeout;
  try {
    await Promise.race([
      image.decode(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('Image unavailable')), 20000); }),
    ]);
  } finally { clearTimeout(timeout); }
}
export async function fetchRecording(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(path, {signal: controller.signal});
    if (!response.ok) throw Error('Recording unavailable');
    const blob = await response.blob();
    if (!blob.size) throw Error('Empty recording');
    return blob;
  } finally { clearTimeout(timeout); }
}
export async function loadEntrance({image, frames, setupLighting, prepareSound, onReady, load = loadImage}) {
  await load(image);
  await setupLighting();
  for (const frame of frames) await load(frame);
  await prepareSound();
  onReady();
}
