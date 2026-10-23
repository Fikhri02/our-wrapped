import './style.css';
import { parse } from './parser.js';
import { stats } from './stats.js';
import { createPlayer } from './player.js';
import { closingSlide, SLIDES } from './slides.js';
import { makeSample } from './sample.js';
import { esc, nf } from './format.js';

const $ = (id) => document.getElementById(id);
const status = $('status'), note = $('note'), signed = $('signed');
const player = createPlayer({ screen: $('screen'), card: $('card'), bars: $('bars'), pauseButton: $('pause') });
let current = null;

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

function run(text, label) {
  const msgs = parse(text);
  if (msgs.length < 10) {
    status.className = 'status err';
    status.innerHTML = '<b>That file has no messages I can read.</b> Export the chat as .txt "Without media", and unzip it first if you\'re on iPhone.';
    return;
  }
  current = stats(msgs);
  status.className = 'status';
  status.innerHTML = `<b>${esc(label)}</b>: ${nf(current.total)} messages between ${esc(current.A)} and ${esc(current.B)} over ${current.days} days.`
    + (current.group ? ' This is a group chat, so only the two biggest senders are used.' : '')
    + ' Nothing left this device.';
  player.load(current, slideList());
}

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

run(makeSample(), 'Example chat (made up)');
