import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { firstTexter, longestStreak, median, replySpeed, stats, talker } from '../src/stats.js';
import { formatReply } from '../src/format.js';
import { makeSample } from '../src/sample.js';

describe('stats helpers', () => {
  it('median handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('longestStreak counts consecutive days across a month boundary', () => {
    expect(longestStreak(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-03']).days).toBe(3);
  });

  it('firstTexter ignores messages before 5am', () => {
    const msgs = parse('2/1/26, 02:00 - B: still up\n2/1/26, 07:00 - A: morning\n2/1/26, 07:05 - B: pagi');
    expect(firstTexter(msgs, ['A', 'B'])).toEqual({ A: 1, B: 0 });
  });
});

describe('stats on the example chat', () => {
  const S = stats(parse(makeSample()));

  it('finds the two people and the first message', () => {
    expect([S.A, S.B].sort()).toEqual(['Me', 'Sayang']);
    expect(S.first.text).toMatch(/lent me a pen/);
  });

  it('counts emoji as whole graphemes', () => {
    expect(S.emo[S.A].length).toBeGreaterThan(0);
    for (const e of [...S.emo[S.A], ...S.emo[S.B]]) expect(e).not.toBe('‍');
  });

  it('keeps every slide stat defined', () => {
    for (const k of ['total', 'days', 'streak', 'late', 'busy', 'busyN', 'peak']) expect(S[k]).toBeDefined();
    expect(S.hours).toHaveLength(24);
  });
});

describe('reply speed', () => {
  it('measures sub-minute replies when the export has seconds', () => {
    const msgs = parse('[1/1/26, 10:00:05] A: hi\n[1/1/26, 10:00:41] B: hey\n[1/1/26, 10:01:11] A: lunch?');
    const r = replySpeed(msgs, ['A', 'B']);
    expect(r.precise).toBe(true);
    expect(r.B.median).toBeCloseTo(36 / 60);
    expect(r.A.median).toBeCloseTo(30 / 60);
  });

  it('marks minute-only exports as imprecise and still gives useful numbers', () => {
    const msgs = parse('1/1/26, 10:00 - A: hi\n1/1/26, 10:00 - B: hey\n1/1/26, 10:01 - A: lunch?\n1/1/26, 10:01 - B: yes\n1/1/26, 12:30 - A: ok');
    const r = replySpeed(msgs, ['A', 'B']);
    expect(r.precise).toBe(false);
    expect(r.B.within5).toBe(100);
    expect(r.A.leftOnRead).toBe(1); // the 2.5h gap
  });
});

describe('formatReply', () => {
  it('never shows 0s; minute-only data under a minute reads as under 1 min', () => {
    expect(formatReply(0, false)).toBe('< 1 min');
    expect(formatReply(0.6, true)).toBe('36 sec');
    expect(formatReply(4, false)).toBe('4 min');
    expect(formatReply(90, false)).toBe('1.5 hr');
    expect(formatReply(null, false)).toBe('—');
  });
});

describe('talker', () => {
  it('counts words and double texts after 10+ minutes without a reply', () => {
    const msgs = parse('1/1/26, 10:00 - A: hello there you\n1/1/26, 10:15 - A: hello??\n1/1/26, 10:16 - B: hi\n1/1/26, 10:17 - A: <Media omitted>');
    const t = talker(msgs, ['A', 'B']);
    expect(t.words).toEqual({ A: 4, B: 1 });
    expect(t.doubles).toEqual({ A: 1, B: 0 });
    expect(t.avg.A).toBe(2);
  });
});
