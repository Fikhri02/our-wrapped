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
import { closingSlide, SLIDES } from './slides.js';
import { makeSample } from './sample.js';
import { esc, nf } from './format.js';
import { renderSlidePng, saveOrShare, shareFileName } from './share.js';
import { filterRange, rangeOptions } from './range.js';
import { getLang, LANGS, setLang, t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const SAMPLE = Symbol('sample');
const status = $('status'), note = $('note'), signed = $('signed');
const player = createPlayer({ screen: $('screen'), card: $('card'), bars: $('bars'), pauseButton: $('pause') });
let current = null, allMsgs = [], source = '', ranges = [];
const rangeSel = $('range');

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

function play(range) {
  const msgs = filterRange(allMsgs, range);
  if (msgs.length < 10) {
    status.className = 'status err';
    status.innerHTML = t('tooFew', msgs.length, esc(range.label));
    return false;
  }
  current = { ...stats(msgs), range: range.id === 'all' ? null : range.label };
  status.className = 'status';
  status.innerHTML = `<b>${esc(source === SAMPLE ? t('sampleLabel') : source)}</b>${current.range ? ` · ${esc(current.range)}` : ''}: `
    + t('loaded', nf(current.total), esc(current.A), esc(current.B), current.days)
    + (current.group ? t('group') : '') + t('private');
  player.load(current, slideList());
  return true;
}

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
  play(ranges[0]);
}

let shownRange = 'all';
function fillRanges() {
  ranges = rangeOptions(allMsgs);
  rangeSel.innerHTML = ranges.map((r) => `<option value="${r.id}">${esc(r.label)}</option>`).join('');
}
rangeSel.addEventListener('change', () => {
  const r = ranges.find((x) => x.id === rangeSel.value);
  if (r && play(r)) shownRange = r.id;
  else rangeSel.value = shownRange; // too few messages: keep the story that is playing, and say so
});

$('file').addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => run(String(rd.result), f.name);
  rd.onerror = () => { status.className = 'status err'; status.innerHTML = t('readFailed'); };
  rd.readAsText(f, 'utf-8');
  e.target.value = ''; // let the same file be picked again
});
$('sample').addEventListener('click', () => run(makeSample(), SAMPLE));
$('restart').addEventListener('click', () => player.restart());

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
  if (current) player.load(current, slideList());
});

const saveBtn = $('saveSlide'), shareStatus = $('shareStatus');
saveBtn.addEventListener('click', async () => {
  const { slide, stats: s } = player.current();
  if (!slide) return;
  saveBtn.disabled = true;
  player.setHeld(true);
  shareStatus.textContent = t('making');
  try {
    const blob = await renderSlidePng(slide, s);
    const result = await saveOrShare(blob, shareFileName(slide.id));
    shareStatus.textContent = { shared: t('shared'), downloaded: t('downloaded'), cancelled: '' }[result];
  } catch (err) {
    console.error('[our-wrapped] share card failed', err);
    shareStatus.textContent = t('shareFailed');
  } finally {
    saveBtn.disabled = false;
    player.setHeld(false);
  }
});

// Language: saved choice, else Malay when the device is set to Malay, else English.
const LANG_KEY = 'our-wrapped-lang';
function applyLang(l) {
  setLang(l);
  document.documentElement.lang = getLang();
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  player.relabel();
}
let saved = null;
try { saved = localStorage.getItem(LANG_KEY); } catch { /* storage blocked */ }
applyLang(LANGS.includes(saved) ? saved : (navigator.language || '').toLowerCase().startsWith('ms') ? 'ms' : 'en');

for (const b of document.querySelectorAll('[data-lang]')) {
  b.addEventListener('click', () => {
    if (b.dataset.lang === getLang()) return;
    applyLang(b.dataset.lang);
    try { localStorage.setItem(LANG_KEY, getLang()); } catch { /* ignore */ }
    if (!allMsgs.length) return;
    fillRanges(); // month names change language
    rangeSel.value = shownRange;
    play(ranges.find((r) => r.id === shownRange) || ranges[0]);
  });
}

run(makeSample(), SAMPLE);
