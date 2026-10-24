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
import { closingSlide, paint, slidesFor } from './slides.js';
import { makeSample } from './sample.js';
import { esc, fmtDay, nf } from './format.js';
import { dayMessages, guessMe, renderChat } from './chat.js';
import { dayKey } from './stats.js';
import { DEFAULT_HIDE, PRIVATE_SLIDES, readHide } from './privacy.js';
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

let current = null, currentMsgs = [], allMsgs = [], source = '', ranges = [], shownRange = 'all', screen = 'landing', storyFrom = 'landing';

// What saved images hide, remembered on this device. Results cards show the slides as they
// will be saved, so what you see there is exactly what ends up in the image.
const HIDE_KEY = 'our-wrapped-hide';
let hide = { ...DEFAULT_HIDE };
try { hide = readHide(localStorage.getItem(HIDE_KEY)); } catch { /* storage blocked: defaults */ }
const forSaving = () => ({ ...current, hide });

// The note is a draft on this device only; it never goes anywhere else.
const DRAFT = 'our-wrapped-note';
try {
  const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
  if (d) { note.value = d.note || ''; signed.value = d.signed || ''; }
} catch { /* storage blocked: start empty */ }

function slideList() {
  const text = note.value.trim();
  const list = slidesFor(current);
  return text ? [...list, closingSlide(text, signed.value.trim())] : list;
}

const summaryLine = (s) => t('loaded', nf(s.total), esc(s.A), esc(s.B), s.days) + (s.group ? t('group') : '') + t('private');

// Every slide as a static card: count-ups render at their final value, no entrance.
function renderGallery() {
  const list = slideList();
  gallery.innerHTML = list.map((slide, i) => {
    let html;
    try { html = slide.render(forSaving()); } catch { html = `<div class="k">${t('oops')}</div><div class="mid">${t('noData')}</div><div></div>`; }
    const priv = PRIVATE_SLIDES.includes(slide.id)
      ? `<label class="priv"><input type="checkbox" id="hide-${slide.id}" data-hide="${slide.id}"${hide[slide.id] ? ' checked' : ''}> ${esc(t(`hide_${slide.id}`))}</label>` : '';
    return `<figure class="tile"><div class="tile-frame"><div class="card" data-pal="${slide.pal}">${html}</div></div>${priv}`
      + `<button class="btn" type="button" data-save="${i}">${esc(t('saveSlide'))}</button></figure>`;
  }).join('');
  gallery.querySelectorAll('.card[data-pal]').forEach((c) => paint(c, c.dataset.pal));
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
  currentMsgs = msgs;
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
  preview.load(sampleStats, slidesFor(sampleStats));
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
  if (e.key !== 'Escape') return;
  if (!chat.hidden) closeChat();
  else if (screen === 'story') leaveStory();
});
// Buttons on the story sit inside its tap zone: keep their taps from turning the slide.
for (const type of ['pointerdown', 'pointerup']) $('sBar').addEventListener(type, (e) => e.stopPropagation());
for (const type of ['pointerdown', 'pointerup', 'keydown']) {
  $('sCard').addEventListener(type, (e) => { if (e.target.closest('[data-act]')) e.stopPropagation(); });
}

// Read that day: the loudest day as bubbles, over the story or results. It gets its own
// history entry (same URL), so the phone's Back closes it instead of leaving the story.
// My bubbles go on the right: a swap the user made on this device, else whoever the export
// shows as its owner, else the bigger sender.
const chat = $('chat'), ME_KEY = 'our-wrapped-me';
let chatReturn = null, chatDay = [], chatMe = null, chatMark = null;
function pickMe(people) {
  let saved = null;
  try { saved = localStorage.getItem(ME_KEY); } catch { /* storage blocked */ }
  return people.includes(saved) ? saved : guessMe(currentMsgs, people) ?? people[0];
}
// Opens on the loudest day, or with what = 'rant' on the day of the featured rant, highlighted
// and scrolled into view.
function openChat(from, what = 'busy') {
  if (!current || !chat.hidden) return;
  const people = [current.A, current.B], f = current.bubbles.feature;
  const rant = what === 'rant' && f?.kind === 'rant';
  const key = rant ? dayKey(f.start) : current.busy;
  chatDay = dayMessages(currentMsgs, key, people);
  chatMe = pickMe(people);
  chatMark = rant ? { who: f.who, first: f.first, last: f.last } : null;
  $('chatDay').textContent = fmtDay(key);
  $('chatCount').textContent = t('chatCount', nf(chatDay.length));
  const log = $('chatLog');
  log.innerHTML = renderChat(chatDay, chatMe, chatMark);
  chatReturn = from;
  chat.hidden = false;
  document.body.classList.add('locked');
  story.setHeld(true);
  history.pushState({ chat: true }, '', location.href);
  const mark = log.querySelector('.chat-mark');
  log.scrollTop = mark ? mark.offsetTop - log.offsetTop - 12 : 0;
  $('chatClose').focus({ preventScroll: true });
}
function hideChat() {
  if (chat.hidden) return;
  chat.hidden = true;
  document.body.classList.toggle('locked', screen === 'story');
  story.setHeld(false);
  chatReturn?.focus({ preventScroll: true });
}
const closeChat = () => (history.state?.chat ? history.back() : hideChat());
addEventListener('popstate', () => { if (!history.state?.chat) hideChat(); });
$('chatClose').addEventListener('click', closeChat);
$('chatSwap').addEventListener('click', () => {
  chatMe = chatMe === current.A ? current.B : current.A;
  try { localStorage.setItem(ME_KEY, chatMe); } catch { /* ignore */ }
  const log = $('chatLog'), top = log.scrollTop;
  log.innerHTML = renderChat(chatDay, chatMe, chatMark);
  log.scrollTop = top;
});
$('sCard').addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a) openChat(a, a.dataset.act === 'rant' ? 'rant' : 'busy');
});

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
  // The story shows everything; the saved image still follows the hide-on-save choices.
  const { slide } = story.current();
  saveSlide(slide, forSaving(), e.currentTarget, story.setHeld);
});
gallery.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a) return openChat(a, a.dataset.act === 'rant' ? 'rant' : 'busy');
  const b = e.target.closest('[data-save]');
  if (b) saveSlide(slideList()[+b.dataset.save], forSaving(), b);
});
gallery.addEventListener('change', (e) => {
  const box = e.target.closest('[data-hide]');
  if (!box) return;
  hide = { ...hide, [box.dataset.hide]: box.checked };
  try { localStorage.setItem(HIDE_KEY, JSON.stringify(hide)); } catch { /* ignore */ }
  renderGallery();
  $(box.id)?.focus({ preventScroll: true });
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
