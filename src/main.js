import '@fontsource/bricolage-grotesque/500.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './style.css';
import { parse } from './parser.js';
import { stats } from './stats.js';
import { createPlayer } from './player.js';
import { closingSlide, PALETTES, SLIDES } from './slides.js';
import { makeSample } from './sample.js';
import { esc, nf } from './format.js';
import { renderSlidePng, saveOrShare, shareFileName } from './share.js';
import { filterRange, rangeOptions } from './range.js';
import { getLang, LANGS, setLang, t } from './i18n.js';
import { screenFor } from './route.js';

const $ = (id) => document.getElementById(id);
const status = $('status'), rangeStatus = $('rangeStatus'), note = $('note'), signed = $('signed');
const rangeSel = $('range'), gallery = $('gallery'), toast = $('toast');
// Section ids differ from the hashes on purpose: #results on an element id makes the browser scroll to it.
const sections = { landing: $('screen-landing'), story: $('screen-story'), results: $('screen-results') };

// The preview phone on Landing only ever plays the made-up example.
const preview = createPlayer({ screen: $('pScreen'), card: $('pCard'), bars: $('pBars'), pauseButton: $('pPause') });
const sampleStats = stats(parse(makeSample()));
// The real chat plays full screen, then hands over to Results.
const story = createPlayer({
  screen: $('sScreen'), card: $('sCard'), bars: $('sBars'), pauseButton: $('sPause'),
  onEnd: () => leaveStory(),
});

let current = null, allMsgs = [], source = '', ranges = [], shownRange = 'all', screen = 'landing', storyFrom = 'landing';

// The note is a draft on this device only; it never goes anywhere else.
const DRAFT = 'our-wrapped-note';
try {
  const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
  if (d) { note.value = d.note || ''; signed.value = d.signed || ''; }
} catch { /* storage blocked: start empty */ }

function slideList() {
  const text = note.value.trim();
  return text ? [...SLIDES, closingSlide(text, signed.value.trim())] : SLIDES;
}

const summaryLine = (s) => t('loaded', nf(s.total), esc(s.A), esc(s.B), s.days) + (s.group ? t('group') : '') + t('private');

// Every slide as a static card: count-ups render at their final value, no entrance.
function renderGallery() {
  const list = slideList();
  gallery.innerHTML = list.map((slide, i) => {
    const [bg, fg] = PALETTES[slide.pal];
    let html;
    try { html = slide.render(current); } catch { html = `<div class="k">${t('oops')}</div><div class="mid">${t('noData')}</div><div></div>`; }
    return `<figure class="tile"><div class="tile-frame"><div class="card" style="background:${bg};color:${fg}">${html}</div></div>`
      + `<button class="btn" type="button" data-save="${i}">${esc(t('saveSlide'))}</button></figure>`;
  }).join('');
}

// Stats for a range, into the story player and the gallery. False when the range is too thin.
function build(range) {
  const msgs = filterRange(allMsgs, range);
  if (msgs.length < 10) {
    rangeStatus.className = 'status err';
    rangeStatus.innerHTML = t('tooFew', msgs.length, esc(range.label));
    return false;
  }
  current = { ...stats(msgs), range: range.id === 'all' ? null : range.label };
  rangeStatus.className = 'status';
  rangeStatus.textContent = '';
  $('pair').textContent = `${current.A} & ${current.B}`;
  $('summary').innerHTML = `<b>${esc(source)}</b>${current.range ? ` · ${esc(current.range)}` : ''}: ` + summaryLine(current);
  story.load(current, slideList());
  story.setActive(screen === 'story');
  renderGallery();
  return true;
}

function fillRanges() {
  ranges = rangeOptions(allMsgs);
  rangeSel.innerHTML = ranges.map((r) => `<option value="${r.id}">${esc(r.label)}</option>`).join('');
}
rangeSel.addEventListener('change', () => {
  const r = ranges.find((x) => x.id === rangeSel.value);
  if (r && build(r)) shownRange = r.id;
  else rangeSel.value = shownRange; // too few messages: keep the story as it was, and say so
});

function playSample() {
  preview.load(sampleStats, SLIDES);
  status.className = 'status';
  status.innerHTML = `<b>${esc(t('sampleLabel'))}</b>: ` + summaryLine(sampleStats);
}

// A picked chat goes straight into the full-screen story.
function run(text, label) {
  const msgs = parse(text);
  if (msgs.length < 10) {
    status.className = 'status err';
    status.innerHTML = t('unreadable');
    return;
  }
  allMsgs = msgs;
  source = label;
  fillRanges();
  rangeSel.value = shownRange = 'all';
  build(ranges[0]);
  go('story');
}

$('file').addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => run(String(rd.result), f.name);
  rd.onerror = () => { status.className = 'status err'; status.innerHTML = t('readFailed'); };
  rd.readAsText(f, 'utf-8');
  e.target.value = ''; // let the same file be picked again
});
$('sample').addEventListener('click', playSample);
$('pRestart').addEventListener('click', () => preview.restart());

// Screens. The hash is the source of truth, so Back and Forward step between them.
const go = (name) => { location.hash = name; };
// Leaving the story never leaves a history entry Back would replay: opened from Results, step
// back to it; opened from Landing, swap the story's entry for Results.
const leaveStory = () => (storyFrom === 'results' ? history.back() : location.replace('#results'));
function render() {
  const next = screenFor(location.hash, !!current);
  if (next === 'landing' && location.hash.length > 1) {
    history.replaceState(null, '', location.pathname + location.search); // a refresh on #story: no chat any more
  }
  const from = screen;
  screen = next;
  for (const [name, el] of Object.entries(sections)) el.hidden = name !== next;
  document.body.classList.toggle('locked', next === 'story');
  preview.setActive(next === 'landing');
  if (next === 'story') {
    if (from !== 'story') { storyFrom = from; story.restart(); }
    $('sScreen').focus({ preventScroll: true });
  } else {
    story.setActive(false);
  }
  if (next !== from && next !== 'story') window.scrollTo(0, 0);
}
addEventListener('hashchange', render);
$('sClose').addEventListener('click', leaveStory);
$('playStory').addEventListener('click', () => go('story'));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && screen === 'story') leaveStory();
});
// Buttons on the story sit inside its tap zone: keep their taps from turning the slide.
for (const type of ['pointerdown', 'pointerup']) $('sBar').addEventListener(type, (e) => e.stopPropagation());

let saveTimer = 0;
for (const el of [note, signed]) {
  el.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(DRAFT, JSON.stringify({ note: note.value, signed: signed.value })); } catch { /* ignore */ }
    }, 300);
  });
}
$('noteForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!current) return;
  story.load(current, slideList());
  story.setActive(false);
  renderGallery();
  say(t('noteAdded'));
});

let toastTimer = 0;
function say(text, sticky = false) {
  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.classList.toggle('on', !!text);
  if (text && !sticky) toastTimer = setTimeout(() => toast.classList.remove('on'), 2600);
}

async function saveSlide(slide, s, button, hold) {
  if (!slide || button.disabled) return;
  button.disabled = true;
  hold?.(true);
  say(t('making'), true);
  try {
    const blob = await renderSlidePng(slide, s);
    const result = await saveOrShare(blob, shareFileName(slide.id));
    say({ shared: t('shared'), downloaded: t('downloaded'), cancelled: '' }[result]);
  } catch (err) {
    console.error('[our-wrapped] share card failed', err);
    say(t('shareFailed'));
  } finally {
    button.disabled = false;
    hold?.(false);
  }
}
$('sSave').addEventListener('click', (e) => {
  const { slide, stats: s } = story.current();
  saveSlide(slide, s, e.currentTarget, story.setHeld);
});
gallery.addEventListener('click', (e) => {
  const b = e.target.closest('[data-save]');
  if (b) saveSlide(slideList()[+b.dataset.save], current, b);
});

// Language: saved choice, else Malay when the device is set to Malay, else English.
const LANG_KEY = 'our-wrapped-lang';
function applyLang(l) {
  setLang(l);
  document.documentElement.lang = getLang();
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll('[data-i18n-label]')) { el.title = t(el.dataset.i18nLabel); el.setAttribute('aria-label', el.title); }
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  preview.relabel();
  story.relabel();
}
let saved = null;
try { saved = localStorage.getItem(LANG_KEY); } catch { /* storage blocked */ }
applyLang(LANGS.includes(saved) ? saved : (navigator.language || '').toLowerCase().startsWith('ms') ? 'ms' : 'en');

for (const b of document.querySelectorAll('[data-lang]')) {
  b.addEventListener('click', () => {
    if (b.dataset.lang === getLang()) return;
    applyLang(b.dataset.lang);
    try { localStorage.setItem(LANG_KEY, getLang()); } catch { /* ignore */ }
    playSample();
    if (!allMsgs.length) return;
    fillRanges(); // month names change language
    rangeSel.value = shownRange;
    build(ranges.find((r) => r.id === shownRange) || ranges[0]);
  });
}

playSample();
render();
