// Parses a WhatsApp "Export chat → Without media" .txt into a message list.
// Handles Android ("23/10/2026, 23:09 - Me: hi") and iPhone ("[23/10/2026, 23:09:41] Me: hi"),
// 12/24-hour clocks, day-first or month-first dates, and multi-line messages.

const HEAD = /^\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:([ap]\.?\s?m\.?)(?=\]|\s-\s))?\]?\s*(?:-\s)?([^:]+?):\s([\s\S]*)$/i;
const SYSTEM = /^\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}:\d{2}/;
const MEDIA = /<Media omitted>|^(image|video|audio|sticker|GIF|document) omitted$/i;
const DELETED = /^(This message was deleted|You deleted this message)\.?$/i;

export function clean(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[‎‏‪-‮﻿]/g, '')
    .replace(/[  ]/g, ' ');
}

export function parse(text) {
  const raw = [];
  for (const line of clean(text).split('\n')) {
    const m = line.match(HEAD);
    if (m && m[8].length < 40) {
      raw.push({ a: +m[1], b: +m[2], y: +m[3], h: +m[4], mi: +m[5], s: +(m[6] || 0), ap: m[7], who: m[8].trim(), text: m[9] });
    } else if (SYSTEM.test(line)) {
      continue;
    } else if (raw.length) {
      raw[raw.length - 1].text += '\n' + line;
    }
  }

  // Day-first unless a second field above 12 proves month-first.
  const sawA = raw.some((x) => x.a > 12);
  const sawB = raw.some((x) => x.b > 12);
  const dayFirst = !( !sawA && sawB );

  return raw
    .map((x) => {
      const d = dayFirst ? x.a : x.b;
      const mo = dayFirst ? x.b : x.a;
      const y = x.y < 100 ? 2000 + x.y : x.y;
      let h = x.h;
      if (x.ap) {
        const pm = /p/i.test(x.ap);
        if (pm && h < 12) h += 12;
        if (!pm && h === 12) h = 0;
      }
      const text = x.text.replace(/<This message was edited>/i, '').trim();
      return {
        when: new Date(y, mo - 1, d, h, x.mi, x.s),
        who: x.who,
        text,
        media: MEDIA.test(text),
        deleted: DELETED.test(text),
      };
    })
    .filter((m) => !isNaN(m.when));
}
