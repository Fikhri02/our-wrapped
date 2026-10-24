// Story player: progress bars, tap or swipe left/right, hold to pause, arrow keys,
// space to pause, auto-advance, and an entrance animation per slide. With onEnd, moving past the
// last slide calls it instead of looping back to the first.
import { paint } from './theme.js';
import { nf } from './format.js';
import { t } from './i18n.js';

const DURATION = 5200;
const HOLD_MS = 220;
const SWIPE_PX = 40;
const COUNT_MS = 900;

export function createPlayer({ screen, card, bars, pauseButton, onEnd = null }) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slides = [], fills = [], stats = null;
  let idx = 0, t0 = 0, elapsed = 0;
  let paused = reduceMotion, held = false, active = true;

  // A button marked data-icon shows a pause or play icon (labelled for screen readers);
  // others show the word.
  const ICON = {
    pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  };
  const syncPause = () => {
    const label = paused ? t('play') : t('pause');
    if (!pauseButton.hasAttribute('data-icon')) { pauseButton.textContent = label; return; }
    pauseButton.innerHTML = paused ? ICON.play : ICON.pause;
    pauseButton.setAttribute('aria-label', label);
    pauseButton.title = label;
  };
  syncPause();

  // Chat-scene slides open with a short "typing…" beat, borrowed from the chat itself; the
  // others go straight to their own reveal.
  const TYPING_MS = 550;
  let typingNow = false;

  function countUp() {
    if (reduceMotion) return;
    for (const el of card.querySelectorAll('[data-count]')) {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '', dec = +(el.dataset.dec || 0);
      const start = performance.now() + (typingNow ? TYPING_MS : 0);
      const step = (now) => {
        const p = Math.max(0, Math.min(1, (now - start) / COUNT_MS));
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (dec ? (target * eased).toFixed(dec) : nf(Math.round(target * eased))) + suffix;
        if (p < 1 && el.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  function show(i) {
    idx = (i + slides.length) % slides.length;
    elapsed = 0;
    t0 = performance.now();
    const slide = slides[idx];
    paint(card, slide.accent);
    screen.style.color = card.style.color; // controls laid over the slide take its colour
    try {
      card.innerHTML = slide.render(stats);
    } catch (err) {
      console.error(`[our-wrapped] slide "${slide.id}" failed`, err);
      card.innerHTML = `<div class="k">${t('oops')}</div><div class="mid">${t('noData')}</div><div></div>`;
    }
    typingNow = !reduceMotion && !!slide.typing;
    if (typingNow) card.insertAdjacentHTML('beforeend', '<div class="typing-in" aria-hidden="true"><span class="typing"><i></i><i></i><i></i></span></div>');
    card.classList.toggle('typing-on', typingNow);
    card.classList.remove('enter');
    void card.offsetWidth; // restart the CSS entrance
    card.classList.add('enter');
    countUp();
    fills.forEach((f, j) => { f.style.width = j < idx ? '100%' : '0%'; });
  }

  function next() {
    if (onEnd && idx === slides.length - 1) {
      active = false; // stop here until whoever handles the end starts it again
      fills[idx].style.width = '100%';
      onEnd();
    } else show(idx + 1);
  }

  function loop(now) {
    if (stats && active && !paused && !held) {
      elapsed = now - t0;
      fills[idx].style.width = Math.min(100, (elapsed / DURATION) * 100) + '%';
      if (elapsed >= DURATION) next();
    } else {
      t0 = now - elapsed;
    }
    requestAnimationFrame(loop);
  }

  const togglePause = () => { paused = !paused; syncPause(); };

  // Pointer: a short tap moves by position, a horizontal drag swipes, a long press pauses.
  let down = null, holdTimer = 0;
  screen.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
    holdTimer = setTimeout(() => { held = true; }, HOLD_MS);
  });
  screen.addEventListener('pointerup', (e) => {
    clearTimeout(holdTimer);
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const wasHeld = held;
    held = false;
    down = null;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next() : show(idx - 1));
    else if (!wasHeld) {
      const r = screen.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.33) show(idx - 1); else next();
    }
  });
  screen.addEventListener('pointercancel', () => { clearTimeout(holdTimer); held = false; down = null; });
  screen.addEventListener('contextmenu', (e) => e.preventDefault()); // long press on mobile

  screen.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === ' ') togglePause();
    else return;
    e.preventDefault();
  });
  pauseButton.addEventListener('click', togglePause);
  requestAnimationFrame(loop);

  return {
    load(s, list) {
      stats = s;
      slides = list;
      bars.innerHTML = slides.map(() => '<i><b></b></i>').join('');
      fills = Array.from(bars.querySelectorAll('b'));
      show(0);
    },
    restart() { active = true; show(0); },
    setActive(v) { active = v; },
    relabel() { syncPause(); },
    current() { return { slide: slides[idx], stats }; },
    setHeld(v) { held = v; },
  };
}
