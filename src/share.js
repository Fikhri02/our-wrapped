// Share card: renders one slide into an offscreen 9:16 frame and saves it as a 1080×1920 PNG.
// On phones the share sheet opens (Save Image, Instagram, WhatsApp); elsewhere it downloads.
import { PALETTES } from './slides.js';

export const EXPORT = { width: 360, height: 640, pixelRatio: 3 };

const pad = (n) => (n < 10 ? '0' : '') + n;
export const shareFileName = (slideId, d = new Date()) =>
  `our-wrapped-${slideId}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.png`;

export async function renderSlidePng(slide, stats) {
  const { toBlob } = await import('html-to-image');
  const [bg, fg] = PALETTES[slide.pal];

  const frame = document.createElement('div');
  frame.className = 'export-frame';
  frame.style.width = `${EXPORT.width}px`;
  frame.style.height = `${EXPORT.height}px`;
  const card = document.createElement('div');
  card.className = 'card';
  card.style.background = bg;
  card.style.color = fg;
  card.innerHTML = slide.render(stats); // count-ups start at their final value, so no animation to wait for
  card.querySelectorAll('.slide-act').forEach((b) => b.remove()); // buttons belong on screen, not in the image
  const mark = document.createElement('div');
  mark.className = 'export-mark';
  mark.textContent = 'Our Wrapped';
  card.appendChild(mark);
  frame.appendChild(card);
  // Only the stage is moved offscreen. An offset on the captured node itself is copied into
  // the clone, and the image comes out as plain background.
  const stage = document.createElement('div');
  stage.className = 'export-stage';
  stage.appendChild(frame);
  document.body.appendChild(stage);

  try {
    await document.fonts.ready;
    return await toBlob(frame, {
      width: EXPORT.width,
      height: EXPORT.height,
      pixelRatio: EXPORT.pixelRatio,
      backgroundColor: bg,
    });
  } finally {
    stage.remove();
  }
}

// Phones get the share sheet (Save Image, Instagram, WhatsApp); desktops download, since a
// desktop share sheet is not where people expect a saved image to go.
export const prefersShareSheet = () => matchMedia('(pointer: coarse)').matches;

// Returns 'shared', 'downloaded' or 'cancelled'.
export async function saveOrShare(blob, name) {
  const file = new File([blob], name, { type: 'image/png' });
  if (prefersShareSheet() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Our Wrapped' });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // Share sheet refused (e.g. desktop browser quirks): fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
