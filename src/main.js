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

const $ = (id) => document.getElementById(id);
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
    status.innerHTML = `<b>Only ${msgs.length} messages in ${esc(range.label)}.</b> Pick a longer range.`;
    return false;
  }
  current = { ...stats(msgs), range: range.id === 'all' ? null : range.label };
  status.className = 'status';
  status.innerHTML = `<b>${esc(source)}</b>${current.range ? ` · ${esc(current.range)}` : ''}: ${nf(current.total)} messages between ${esc(current.A)} and ${esc(current.B)} over ${current.days} days.`
    + (current.group ? ' This is a group chat, so only the two biggest senders are used.' : '')
    + ' Nothing left this device.';
  player.load(current, slideList());
  return true;
}

function run(text, label) {
  const msgs = parse(text);
  if (msgs.length < 10) {
    status.className = 'status err';
    status.innerHTML = '<b>That file has no messages I can read.</b> Export the chat as .txt "Without media", and unzip it first if you\'re on iPhone.';
    return;
  }
  allMsgs = msgs;
  source = label;
  ranges = rangeOptions(msgs);
  rangeSel.innerHTML = ranges.map((r) => `<option value="${r.id}">${esc(r.label)}</option>`).join('');
  rangeSel.value = shownRange = 'all';
  play(ranges[0]);
}

let shownRange = 'all';
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
  rd.onerror = () => { status.className = 'status err'; status.innerHTML = '<b>Couldn\'t read that file.</b> Try exporting it again.'; };
  rd.readAsText(f, 'utf-8');
  e.target.value = ''; // let the same file be picked again
});
$('sample').addEventListener('click', () => run(makeSample(), 'Example chat (made up)'));
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
  shareStatus.textContent = 'Making the image…';
  try {
    const blob = await renderSlidePng(slide, s);
    const result = await saveOrShare(blob, shareFileName(slide.id));
    shareStatus.textContent = { shared: 'Shared.', downloaded: 'Saved to your downloads.', cancelled: '' }[result];
  } catch (err) {
    console.error('[our-wrapped] share card failed', err);
    shareStatus.textContent = "Couldn't make the image. Try again, or take a screenshot instead.";
  } finally {
    saveBtn.disabled = false;
    player.setHeld(false);
  }
});

run(makeSample(), 'Example chat (made up)');
