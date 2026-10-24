// One day of the chat as bubbles, for the "read that day" viewer. My bubbles sit on the
// right and theirs on the left; each run of messages gets its label once.
import { dayKey } from './stats.js';
import { esc, hourLabel } from './format.js';
import { t } from './i18n.js';

export const dayMessages = (msgs, key, people) =>
  msgs.filter((m) => people.includes(m.who) && dayKey(m.when) === key);

// WhatsApp writes "You deleted this message" only for whoever exported the chat; the other
// person's deletions read "This message was deleted". Null when there's no such clue.
export function guessMe(msgs, people) {
  const m = msgs.find((x) => people.includes(x.who) && /^You deleted this message/i.test(x.text));
  return m ? m.who : null;
}

const clock = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'am' : 'pm'}`;

export function renderChat(msgs, me) {
  let html = '', hour = -1, who = null;
  for (const m of msgs) {
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
    if (m.deleted) html += `<div class="chat-b ${side} ph">${t('chatDeleted')}</div>`;
    else if (m.media || !m.text.trim()) html += `<div class="chat-b ${side} ph">${t('chatMedia')}</div>`;
    else html += `<div class="chat-b ${side}">${esc(m.text)}</div>`;
  }
  return html;
}
