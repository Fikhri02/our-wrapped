// One day of the chat as bubbles, for the "read that day" viewer. My bubbles sit on the
// right and theirs on the left; each run of messages gets its label once.
import { dayKey } from './stats.js';
import { clock, esc, hourLabel } from './format.js';
import { t } from './i18n.js';

export const dayMessages = (msgs, key, people) =>
  msgs.filter((m) => people.includes(m.who) && dayKey(m.when) === key);

// WhatsApp writes "You deleted this message" only for whoever exported the chat; the other
// person's deletions read "This message was deleted". Null when there's no such clue.
export function guessMe(msgs, people) {
  const m = msgs.find((x) => people.includes(x.who) && /^You deleted this message/i.test(x.text));
  return m ? m.who : null;
}

// `mark` ({ who, first, last }) highlights a run of one person's messages, like a rant, with a
// marker before its first bubble. It goes by the messages themselves, not their times: exports
// only record minutes, so a time range would sweep in earlier messages from the same minute.
export function renderChat(msgs, me, mark = null) {
  let html = '', hour = -1, who = null, marked = false, inside = false;
  for (const m of msgs) {
    if (mark && m === mark.first) inside = true;
    const hl = inside && m.who === mark.who;
    if (mark && m === mark.last) inside = false;
    if (hl && !marked) { html += `<div class="chat-mark">${t('chatRant')}</div>`; marked = true; who = null; }
    const h = m.when.getHours();
    if (h !== hour) {
      html += `<div class="chat-hour">${hourLabel(h)}</div>`;
      hour = h;
      who = null; // a new hour restarts the run, so the label shows again under the marker
    }
    const side = m.who === me ? 'me' : 'them';
    if (m.who !== who) {
      html += `<div class="chat-who ${side}">${side === 'me' ? '' : `${esc(m.who)} · `}${clock(m.when)}</div>`;
      who = m.who;
    }
    // Export placeholders read as notes, not as something anyone typed.
    const cls = `chat-b ${side}${hl ? ' hl' : ''}`;
    if (m.deleted) html += `<div class="${cls} ph">${t('chatDeleted')}</div>`;
    else if (m.media || !m.text.trim()) html += `<div class="${cls} ph">${t('chatMedia')}</div>`;
    else html += `<div class="${cls}">${esc(m.text)}</div>`;
  }
  return html;
}
