// Story player: progress bars, tap or swipe left/right, hold to pause, arrow keys,
// space to pause, auto-advance, and an entrance animation per slide.
import { PALETTES } from './slides.js';
import { nf } from './format.js';

const DURATION = 5200;
const HOLD_MS = 220;
const SWIPE_PX = 40;
const COUNT_MS = 900;

export function createPlayer({ screen, card, bars, pauseButton }) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slides = [], fills = [], stats = null;
  let idx = 0, t0 = 0, elapsed = 0;
  let paused = reduceMotion, held = false;

  const syncPause = () => { pauseButton.textContent = paused ? 'Play' : 'Pause'; };
  syncPause();

  function countUp() {
    if (reduceMotion) return;
    for (const el of card.querySelectorAll('[data-count]')) {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '';
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / COUNT_MS);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = nf(Math.round(target * eased)) + suffix;
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
    const [bg, fg] = PALETTES[slide.pal];
    card.style.background = bg;
    card.style.color = fg;
    try {
      card.innerHTML = slide.render(stats);
    } catch (err) {
      console.error(`[our-wrapped] slide "${slide.id}" failed`, err);
      card.innerHTML = '<div class="k">Oops</div><div class="mid">Not enough data for this slide.</div><div></div>';
    }
    card.classList.remove('enter');
    void card.offsetWidth; // restart the CSS entrance
    card.classList.add('enter');
    countUp();
    fills.forEach((f, j) => { f.style.width = j < idx ? '100%' : '0%'; });
  }

  function loop(now) {
    if (stats && !paused && !held) {
      elapsed = now - t0;
      fills[idx].style.width = Math.min(100, (elapsed / DURATION) * 100) + '%';
      if (elapsed >= DURATION) show(idx + 1);
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
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? idx + 1 : idx - 1);
    else if (!wasHeld) {
      const r = screen.getBoundingClientRect();
      show(e.clientX - r.left < r.width * 0.33 ? idx - 1 : idx + 1);
    }
  });
  screen.addEventListener('pointercancel', () => { clearTimeout(holdTimer); held = false; down = null; });
  screen.addEventListener('contextmenu', (e) => e.preventDefault()); // long press on mobile

  screen.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(idx + 1);
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
    restart() { show(0); },
  };
}
