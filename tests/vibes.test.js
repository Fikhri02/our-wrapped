import { describe, expect, it } from 'vitest';
import { creatures, styleSync } from '../src/vibes.js';

// A message on day `day` (from 1 Mar 2026) at "HH:MM".
const msg = (who, day, hm, text) => {
  const [h, m] = hm.split(':').map(Number);
  return { when: new Date(2026, 2, 1 + day, h, m), who, text, media: false, deleted: false };
};
const pair = ['A', 'B'];

// n messages alternating A, B, one per hour across days, with text from fn(who, i).
function alternate(n, fn) {
  return Array.from({ length: n }, (_, i) => {
    const who = i % 2 ? 'B' : 'A';
    return msg(who, Math.floor(i / 12), `${String(8 + (i % 12)).padStart(2, '0')}:00`, fn(who, i));
  });
}

describe('styleSync', () => {
  it('reads 100% alike when both type the same small words in the last third, and far apart in the first', () => {
    const msgs = alternate(300, (who, i) => {
      if (i < 100) return who === 'A' ? 'i and the so but my me' : 'aku kau lah je kan pun ke';
      if (i < 200) return 'filler words here';
      return 'kita lah and the we je so';
    });
    const r = styleSync(msgs, pair);
    expect(r.eligible).toBe(true);
    expect(r.now).toBe(100);
    expect(r.then).toBeLessThan(50);
    expect(r.delta).toBe(r.now - r.then);
  });

  it('is not eligible, and has no NaN, when one person barely uses small words', () => {
    const msgs = alternate(300, (who) => (who === 'A' ? 'i and the so but we lah' : 'ok'));
    const r = styleSync(msgs, pair);
    expect(r.eligible).toBe(false);
    expect(Object.values(r).some((v) => Number.isNaN(v))).toBe(false);
  });
});

describe('creatures', () => {
  // A sends long, loud, emoji bursts and starts every day; B answers once, short and flat.
  function loudAndQuiet() {
    const out = [];
    for (let d = 0; d < 60; d++) {
      out.push(msg('A', d, '09:00', 'WEHHH you will not believe what happened today at the office!! 😂😂'));
      out.push(msg('A', d, '09:01', 'like SERIOUSLY the whole floor heard it!! 🤯'));
      out.push(msg('A', d, '09:02', 'okay okay I am calm now 😭'));
      out.push(msg('B', d, '09:30', 'haha'));
    }
    return out;
  }

  it('scores the louder, longer, emoji-heavy texter higher, with the two scores summing to 100', () => {
    const r = creatures(loudAndQuiet(), pair);
    expect(r.eligible).toBe(true);
    expect(r.score.A).toBeGreaterThan(r.score.B);
    expect(Math.abs(r.score.A + r.score.B - 100)).toBeLessThanOrEqual(1);
    expect(r.high).toBe('A');
  });

  it('calls it matched energy (high: null) when both text the same way', () => {
    const msgs = [];
    // Same words, and they take turns opening the day.
    for (let d = 0; d < 60; d++) {
      const [x, y] = d % 2 ? ['B', 'A'] : ['A', 'B'];
      msgs.push(msg(x, d, '09:00', 'morning, how was sleep'));
      msgs.push(msg(y, d, '09:05', 'morning, how was sleep'));
    }
    expect(creatures(msgs, pair).high).toBe(null);
  });

  it('marks a night shift when a fifth of someone\'s messages are after midnight', () => {
    const msgs = [];
    for (let d = 0; d < 60; d++) {
      msgs.push(msg('A', d, d % 5 === 0 ? '01:30' : '14:00', 'still up'));
      msgs.push(msg('B', d, '14:10', 'go sleep'));
    }
    const r = creatures(msgs, pair);
    expect(r.night.A).toBe(true);
    expect(r.night.B).toBe(false);
  });

  it('is not eligible when one person has only a handful of messages', () => {
    const msgs = loudAndQuiet().filter((m) => m.who === 'A');
    for (let d = 0; d < 10; d++) msgs.push(msg('B', d, '10:00', 'ok'));
    expect(creatures(msgs, pair).eligible).toBe(false);
  });
});

import { emotions, languages, weather } from '../src/vibes.js';
import { LOVE_LEX } from '../src/lexicon.js';

// Lines from one person, one per day starting 1 Mar, all at noon.
const lines = (who, texts, from = 0) => texts.map((t, i) => msg(who, from + i, '12:00', t));
const times = (n, t) => Array(n).fill(t);

describe('languages', () => {
  it('gives each person a primary love language from the share of their affectionate messages', () => {
    const msgs = lines('A', [...times(8, 'dah makan?'), ...times(4, 'sayang')]);
    const r = languages(msgs, pair, LOVE_LEX).A;
    expect(r.eligible).toBe(true);
    expect(r.primary).toBe('service');
    expect(r.pct.service).toBe(67);
    expect(r.pct.words).toBe(33);
  });

  it('counts "nak i belikan" as acts of service, not gifts', () => {
    const msgs = lines('A', times(10, 'nak i belikan nasi lemak?'));
    expect(languages(msgs, pair, LOVE_LEX).A.pct).toMatchObject({ service: 100, gifts: 0 });
  });

  it('is not eligible, with no primary, on five affectionate messages', () => {
    const r = languages(lines('A', times(5, 'peluk')), pair, LOVE_LEX).A;
    expect(r.eligible).toBe(false);
    expect(r.primary).toBe(null);
  });
});

describe('emotions', () => {
  const base = [...lines('A', times(20, 'happy gila')), ...lines('B', times(20, 'rindu you'))];

  it('ignores negated words and the ambiguous 😭', () => {
    const r = emotions([...base, ...lines('A', ['tak sedih pun', '😭'], 40)], pair);
    expect(r.all.n).toBe(40);
    expect(r.all.pct.sadness).toBe(0);
  });

  it('splits a message carrying two emotions between them', () => {
    const r = emotions([...base, ...lines('B', times(40, 'haha omg'), 40)], pair);
    expect(r.B.pct.joy).toBe(r.B.pct.surprise);
    const sum = Object.values(r.all.pct).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(1);
  });

  it('is not eligible, and neither is the weather, on twenty emotional messages', () => {
    const msgs = lines('A', times(20, 'happy'));
    expect(emotions(msgs, pair).eligible).toBe(false);
    expect(weather(msgs, pair).eligible).toBe(false);
  });
});

describe('weather', () => {
  // March to early June: 70 laughing messages, then 30 plain ones.
  const sunny = lines('A', [...times(70, 'hahaha'), ...times(30, 'ok on my way')]);

  it('calls a mostly-joy chat sunshine', () => {
    const r = weather(sunny, pair);
    expect(r.eligible).toBe(true);
    expect(r.label).toBe('sunshine');
  });

  it('picks out a worried August as the standout month', () => {
    const aug = Array.from({ length: 25 }, (_, i) => ({ ...msg('B', 0, '12:00', 'risau la'), when: new Date(2026, 7, 1 + i, 12) }));
    const r = weather([...sunny, ...aug], pair);
    expect(r.label).toBe('sunshine');
    expect(r.standout.label).toBe('cloud');
    expect(r.standout.month.getMonth()).toBe(7);
  });
});
