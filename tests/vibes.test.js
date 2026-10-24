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
