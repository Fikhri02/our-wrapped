import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { bubbles, texterType, carriedNights, conversations, convoStats, firstTexter, goodnightFirst, longestStreak, median, quietHours, replySpeed, sameConversation, signatureWords, signOff, stats, talker, talkRoles } from '../src/stats.js';
import { setLang, t } from '../src/i18n.js';
import { SLIDES, slidesFor } from '../src/slides.js';
import { compact, fmtRange, formatReply } from '../src/format.js';
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

  it('longestStreak knows where the streak started and ended', () => {
    const s = longestStreak(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-03']);
    expect([s.startKey, s.endKey]).toEqual(['2026-07-30', '2026-08-01']);
  });

  it('formats a streak as a date range, as short as it can be', () => {
    const d = (y, m, day) => new Date(y, m - 1, day);
    expect(fmtRange(d(2025, 7, 1), d(2025, 7, 22))).toBe('1 – 22 Jul 2025');
    expect(fmtRange(d(2025, 6, 28), d(2025, 7, 9))).toBe('28 Jun – 9 Jul 2025');
    expect(fmtRange(d(2024, 12, 28), d(2025, 1, 15))).toBe('28 Dec 2024 – 15 Jan 2025');
    expect(fmtRange(d(2025, 7, 9), d(2025, 7, 9))).toBe('9 Jul 2025');
  });

  it('gives the streak a verdict, past tense once it ended', () => {
    setLang('en');
    const say = (d, now = false) => t('streakVibe', d, now);
    expect(say(2)).toBe('Pretty low-key. You two clearly don\'t need daily check-ins.');
    expect(say(5)).toBe('Pretty normal. A few good days in a row.');
    expect(say(10)).toBe('Okay, you two were kinda something.');
    expect(say(10, true)).toBe('Okay, you two are kinda something.');
    expect(say(22)).toBe('You two were properly hooked.');
    expect(say(45)).toBe('Clingy. In the best way.');
    expect(say(120)).toBe('At that point it wasn\'t a streak, it was a lifestyle.');
    expect(say(120, true)).toBe('At this point it\'s not a streak, it\'s a lifestyle.');
  });

  it('knows when the longest streak is still going', () => {
    const msgs = parse(['1/3/26, 10:00 - A: hi', '2/3/26, 10:00 - B: hi', '3/3/26, 10:00 - A: hi', ...Array(10).fill('3/3/26, 11:00 - B: ok')].join('\n'));
    expect(stats(msgs, new Date(2026, 2, 4, 9)).streakNow).toBe(true);
    expect(stats(msgs, new Date(2026, 2, 9)).streakNow).toBe(false);
  });

  it('firstTexter ignores messages before 5am', () => {
    const msgs = parse('2/1/26, 02:00 - A: still up\n2/1/26, 07:00 - A: morning\n2/1/26, 07:05 - B: pagi');
    expect(firstTexter(msgs, ['A', 'B'])).toEqual({ A: 1, B: 0 });
  });

  it('firstTexter does not credit a morning reply to last night\'s message', () => {
    const msgs = parse('1/1/26, 09:00 - A: morning\n1/1/26, 23:30 - A: you up?\n2/1/26, 07:30 - B: sorry tertidur\n2/1/26, 07:31 - A: haha ok');
    expect(firstTexter(msgs, ['A', 'B'])).toEqual({ A: 1, B: 0 });
  });

  it('firstTexter credits good morning after the night ended on goodnight', () => {
    const said = (gn) => parse(`1/1/26, 09:00 - A: morning\n1/1/26, 23:00 - B: ngantuk\n1/1/26, 23:01 - A: ${gn}\n2/1/26, 07:30 - B: morning`);
    for (const gn of ['goodnight!', 'ok gn', 'selamat malam', 'sweet dreams 😴']) {
      expect(firstTexter(said(gn), ['A', 'B'])).toEqual({ A: 1, B: 1 });
    }
  });

  it('firstTexter counts a goodnight from the replier earlier in the night', () => {
    const msgs = parse('1/1/26, 09:00 - A: morning\n1/1/26, 23:00 - B: tidur dulu\n1/1/26, 23:02 - A: ok sayang\n2/1/26, 07:30 - B: pagi');
    expect(firstTexter(msgs, ['A', 'B'])).toEqual({ A: 1, B: 1 });
  });

  it('firstTexter only counts mornings', () => {
    const msgs = parse('1/1/26, 15:00 - B: hey\n1/1/26, 15:01 - A: hi\n2/1/26, 09:00 - A: morning\n2/1/26, 09:01 - B: pagi');
    expect(firstTexter(msgs, ['A', 'B'])).toEqual({ A: 1, B: 0 });
  });

  it('quietHours falls back to 1am-7am when there is too little data', () => {
    expect(quietHours(parse('1/1/26, 10:00 - A: hi'), ['A'])).toEqual({ A: { start: 1, end: 7 } });
  });

  it('quietHours finds a night owl\'s sleep from their own messages', () => {
    const lines = [];
    for (let d = 1; d <= 5; d++) {
      for (let h = 0; h < 24; h++) if (h < 4 || h >= 10) lines.push(`${d}/1/26, ${String(h).padStart(2, '0')}:00 - A: hi`);
    }
    expect(quietHours(parse(lines.join('\n')), ['A'])).toEqual({ A: { start: 4, end: 10 } });
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
    for (const k of ['total', 'days', 'streak', 'late', 'busy', 'busyN', 'peak', 'convo']) expect(S[k]).toBeDefined();
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
    expect(r.B.within1).toBe(100);
    expect(r.A.slow).toBe(1); // the 2.5h gap
  });

  it('a reply after sleeping is neither a reply time nor left on read', () => {
    const msgs = parse('1/1/26, 01:00 - A: you still up?\n1/1/26, 06:00 - B: yes sorry fell asleep\n1/1/26, 23:30 - A: you up?\n2/1/26, 07:30 - B: sorry');
    const r = replySpeed(msgs, ['A', 'B']);
    expect(r.B.median).toBeNull();
    expect(r.B.slow).toBe(0);
    expect(r.B.slept).toBe(2);
  });

  it('a long daytime gap still counts as left on read', () => {
    const msgs = parse('1/1/26, 14:00 - A: lunch?\n1/1/26, 17:00 - B: sorry busy');
    const r = replySpeed(msgs, ['A', 'B']);
    expect(r.B.slow).toBe(1);
    expect(r.B.slept).toBe(0);
  });

  it('uses the replier\'s own quiet hours, so a night owl awake at 3am is not asleep', () => {
    const msgs = parse('1/1/26, 03:00 - A: still up?\n1/1/26, 05:00 - B: yeah');
    expect(replySpeed(msgs, ['A', 'B']).B.slept).toBe(1);
    const owl = replySpeed(msgs, ['A', 'B'], { A: { start: 1, end: 7 }, B: { start: 4, end: 10 } });
    expect(owl.B).toMatchObject({ slept: 0, slow: 1 });
  });
});

describe('reply speed inside conversations', () => {
  it('does not count the opener of a new conversation as a reply', () => {
    const msgs = parse('1/1/26, 10:00 - A: lunch?\n1/1/26, 10:01 - B: yes\n1/1/26, 10:02 - A: ok\n1/1/26, 13:00 - B: https://example.com/reel');
    const r = replySpeed(msgs, ['A', 'B']);
    expect(r.B.slow).toBe(0);
    expect(r.A.mean).toBe(1);
  });

  it('counts the share of replies within a minute and the average', () => {
    const msgs = parse('1/1/26, 10:00 - A: a\n1/1/26, 10:00 - B: b\n1/1/26, 10:10 - A: c\n1/1/26, 10:11 - B: d\n1/1/26, 10:20 - A: e\n1/1/26, 10:30 - B: f');
    const r = replySpeed(msgs, ['A', 'B']);
    expect(r.B.within1).toBe(67);
    expect(r.B.mean).toBeCloseTo(11 / 3);
  });
});

describe('where a conversation ends', () => {
  const pair = (text, quiet) => {
    const [p, q] = parse(text);
    return sameConversation(p, q, quiet ?? quietHours([], ['A', 'B']));
  };

  it('keeps anything under an hour together', () => {
    expect(pair('1/1/26, 10:00 - A: ok\n1/1/26, 10:59 - B: hey')).toBe(true);
  });

  it('treats a late answer to something open as the same conversation', () => {
    expect(pair('1/1/26, 15:00 - A: dah sampai rumah\n1/1/26, 17:30 - B: nice, penat tak')).toBe(true);
  });

  it('treats a reply across the night as the same conversation', () => {
    expect(pair('1/1/26, 23:30 - A: esok jadi tak\n2/1/26, 07:30 - B: jadi')).toBe(true);
  });

  it('answers a question even after a long day', () => {
    expect(pair('1/1/26, 09:00 - A: dinner where?\n1/1/26, 17:00 - B: mamak')).toBe(true);
  });

  it('starts fresh after a sign-off', () => {
    expect(pair('1/1/26, 15:00 - A: alright thanks\n1/1/26, 17:30 - B: eh tengok ni')).toBe(false);
  });

  it('starts fresh with a link or a greeting', () => {
    expect(pair('1/1/26, 15:00 - A: dah sampai rumah\n1/1/26, 17:30 - B: https://example.com/x')).toBe(false);
    expect(pair('1/1/26, 15:00 - A: dah sampai rumah\n1/1/26, 17:30 - B: hey')).toBe(false);
  });

  it('does not treat a laugh as a sign-off', () => {
    expect(pair('1/1/26, 15:00 - A: hahaha\n1/1/26, 17:00 - B: so how was it')).toBe(true);
  });

  it('lets someone carry on their own thread for under 2 hours', () => {
    expect(pair('1/1/26, 23:00 - B: dah tidur ke\n2/1/26, 00:30 - B: u sleep?')).toBe(true);
    expect(pair('1/1/26, 12:00 - A: nak makan apa\n1/1/26, 15:00 - A: eh lupa nak cakap')).toBe(false);
  });

  it('starts fresh after a long daytime silence with nothing open', () => {
    expect(pair('1/1/26, 09:00 - A: dah sampai office\n1/1/26, 17:00 - B: balik dah')).toBe(false);
  });

  it('starts fresh after 18 hours whatever was said', () => {
    expect(pair('1/1/26, 09:00 - A: dinner where?\n2/1/26, 04:00 - B: mamak')).toBe(false);
  });

  it('does not let a greeting in front of an answer start a new conversation', () => {
    expect(pair('1/1/26, 07:19 - A: you kerja tak harini?\n1/1/26, 08:46 - B: morning')).toBe(true);
    expect(pair('1/1/26, 00:08 - B: dah sampai?\n1/1/26, 07:37 - A: Hello, dah sampai semalam')).toBe(true);
    expect(pair('1/1/26, 15:00 - A: dah sampai rumah\n1/1/26, 17:30 - B: hello')).toBe(false);
  });

  it('recognises sign-offs as whole messages only', () => {
    for (const s of ['ok', 'Okay!', 'alright thanks', 'ok gn', 'goodnight 😴', 'rest well', 'selamat malam', 'noted', 'you too']) {
      expect(signOff({ text: s })).toBe(true);
    }
    for (const s of ['Okay text u later, boarding', 'hahaha', '😂', 'ok so what now', 'thanks for coming, nanti kita jumpa lagi']) {
      expect(signOff({ text: s })).toBe(false);
    }
  });

  it('counts who says goodnight first, once per night', () => {
    const msgs = parse([
      '1/1/26, 23:00 - B: ok goodnight', '1/1/26, 23:01 - A: goodnight, rest well',
      '2/1/26, 23:30 - A: gn', '3/1/26, 00:31 - B: night night',
      '3/1/26, 14:00 - A: had a good night?', '3/1/26, 22:00 - A: last night was fun',
    ].join('\n'));
    expect(goodnightFirst(msgs, ['A', 'B'])).toEqual({ A: 1, B: 1 });
  });

  it('hears goodnight in its everyday forms, but not a question about sleep', () => {
    const night = (text) => goodnightFirst(parse(`1/1/26, 23:00 - A: ${text}`), ['A', 'B']).A;
    for (const s of ['night', 'night irfan', 'goodnightt', 'nak tidur dah', 'i nak tidur dh', 'tidur dulu', 'i go sleep first', 'alright, I need to sleep']) expect(night(s), s).toBe(1);
    for (const s of ['you tidur pukul berapa?', 'last night was fun', 'tonight?', 'tidur jelah kalau taknak dahaga', 'then just go to sleep man']) expect(night(s), s).toBe(0);
  });

  it('counts nights the conversation carried on into the morning', () => {
    const msgs = parse('1/1/26, 23:30 - A: esok jadi tak\n2/1/26, 07:30 - B: jadi\n2/1/26, 23:00 - B: ok goodnight\n3/1/26, 08:00 - A: morning');
    expect(carriedNights(msgs, quietHours(msgs, ['A', 'B']))).toBe(1);
  });

  it('counts who starts and who has the last word', () => {
    const msgs = parse([
      '1/1/26, 10:00 - A: hey', '1/1/26, 10:01 - B: hi', '1/1/26, 10:05 - A: ok bye',
      '1/1/26, 20:00 - B: https://example.com/a', '1/1/26, 20:02 - A: hahaha', '1/1/26, 20:03 - B: goodnight',
      '2/1/26, 21:00 - A: hello?',
    ].join('\n'));
    const quiet = quietHours(msgs, ['A', 'B']);
    const c = convoStats(conversations(msgs, quiet), ['A', 'B']);
    expect(c.starts).toEqual({ A: 1, B: 1 });
    expect(c.reachedOut).toEqual({ A: 1, B: 0 });
    expect(c.lastWord).toEqual({ A: 1, B: 1 });
  });
});

describe('pace', () => {
  // A chat over `span` days that talks on `talk` of them, with `turns` back-and-forths each time.
  const chat = (span, talk, turns) => {
    const lines = [];
    for (let d = 0; d < span; d++) {
      if (d % Math.round(span / talk) !== 0 && d !== span - 1) continue;
      const day = new Date(2026, 0, 1 + d);
      const date = `${day.getDate()}/${day.getMonth() + 1}/26`;
      for (let i = 0; i < turns; i++) lines.push(`${date}, ${String(9 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')} - ${i % 2 ? 'A' : 'B'}: hi`);
    }
    return stats(parse(lines.join('\n'))).pace;
  };

  it('tells a lot-every-day chat from a rare-but-heavy one', () => {
    expect(chat(60, 60, 40)).toMatchObject({ kind: 'inseparable', isNew: false });
    expect(chat(60, 12, 40)).toMatchObject({ kind: 'bursts', isNew: false });
  });

  it('tells a little-every-day chat from an every-now-and-then one', () => {
    expect(chat(60, 60, 10).kind).toBe('steady');
    expect(chat(60, 12, 10).kind).toBe('occasional');
  });

  it('counts back-and-forths, not bubbles, and the share of days talked', () => {
    const p = chat(60, 60, 40);
    expect(p.turns).toBe(40);
    expect(p.share).toBe(100);
    expect(p.span).toBe(60);
  });

  it('turns past tense when the latest message is more than a week old', () => {
    const msgs = parse(Array.from({ length: 20 }, (_, i) => `1/3/26, 10:${String(i).padStart(2, '0')} - ${i % 2 ? 'A' : 'B'}: hi`).join('\n'));
    expect(stats(msgs, new Date(2026, 2, 5)).pace.past).toBe(false);
    expect(stats(msgs, new Date(2026, 2, 9)).pace.past).toBe(true);
  });

  it('marks a chat under a month old as new', () => {
    expect(chat(8, 8, 40)).toMatchObject({ isNew: true, span: 8 });
  });
});

describe('talker roles', () => {
  const talk = (avgA, avgB, dA, dB) => ({ avg: { A: avgA, B: avgB }, doubles: { A: dA, B: dB } });

  it('gives each role to whoever clearly leads it, double texts per message sent', () => {
    expect(talkRoles({ A: 60, B: 40 }, talk(4, 6, 6, 2), ['A', 'B'])).toEqual({ talker: 'A', storyteller: 'B', chaser: 'A' });
  });

  it('shares a role when the two are close', () => {
    expect(talkRoles({ A: 51, B: 49 }, talk(4.1, 4, 5, 5), ['A', 'B'])).toEqual({ talker: null, storyteller: null, chaser: null });
  });

  it('does not let the busier sender win chaser just by sending more', () => {
    expect(talkRoles({ A: 200, B: 100 }, talk(4, 4, 20, 10), ['A', 'B']).chaser).toBeNull();
  });

  it('describes the roles in a sentence, past tense once the chat has gone quiet', () => {
    setLang('en');
    expect(t('rolesLine', { talker: 'B', storyteller: 'A', chaser: 'A' }, 'A', 'B', false)).toBe('B is the talker. A is the storyteller and the chaser.');
    expect(t('rolesLine', { talker: 'B', storyteller: null, chaser: 'A' }, 'A', 'B', false)).toBe('B is the talker. A is the chaser. You write about the same length.');
    expect(t('rolesLine', { talker: 'A', storyteller: 'A', chaser: 'A' }, 'A', 'B', false)).toBe('A is the talker, the storyteller and the chaser. B gets a word in.');
    expect(t('rolesLine', { talker: null, storyteller: null, chaser: null }, 'A', 'B', false)).toBe('Evenly matched on every count.');
    expect(t('rolesLine', { talker: 'B', storyteller: 'A', chaser: null }, 'A', 'B', true)).toBe('B was the talker. A was the storyteller. You both texted again about as often.');
  });
});

describe('emoji counts', () => {
  it('counts each top emoji, in the same order as the list', () => {
    const S = stats(parse(['1/1/26, 10:00 - A: 😭😭😭 🥰', '1/1/26, 10:01 - B: 😂', ...Array(10).fill('1/1/26, 10:02 - B: ok')].join('\n')));
    expect(S.emo.A).toEqual(['😭', '🥰']);
    expect(S.emoN.A).toEqual([3, 1]);
    expect(S.emoN.B).toEqual([1]);
  });

  it('puts the count under each emoji on the slide', () => {
    const S = stats(parse(['1/1/26, 10:00 - A: 😭😭😭', ...Array(10).fill('1/1/26, 10:02 - B: ok')].join('\n')));
    expect(SLIDES.find((x) => x.id === 'emoji').render(S)).toMatch(/<i>😭\uFE0F?<\/i><b>3<\/b>/);
  });

  it('draws a lone heart as a colour emoji, not a black text heart', () => {
    const S = stats(parse(['1/1/26, 10:00 - A: ❤️❤️', ...Array(10).fill('1/1/26, 10:02 - B: ok')].join('\n')));
    expect(SLIDES.find((x) => x.id === 'emoji').render(S)).toContain('<i>❤\uFE0F</i>');
  });

  it('compares how often each uses emoji, per message sent', () => {
    const lines = [...Array(10).fill('1/1/26, 10:00 - A: hi 😭😭'), ...Array(10).fill('1/1/26, 10:01 - B: hi'), ...Array(5).fill('1/1/26, 10:02 - B: 😭')];
    const S = stats(parse(lines.join('\n')), new Date(2026, 0, 2));
    expect(S.emoVs).toMatchObject({ hi: 'A', lo: 'B', fav: '😭' });
    expect(S.emoVs.ratio).toBeCloseTo((20 / 10) / (5 / 15));
    setLang('en');
    expect(t('emojiDiff', S.emoVs, false)).toBe('A basically talks in emoji, about 6 times as often as B. You both can\'t stop using 😭.');
  });

  it('describes the difference in plain, fun words', () => {
    setLang('en');
    // A sends 30 emoji in 100 messages; B's rate is set by the ratio.
    const vs = (ratio, totLo = 5, fav = null, count = 100) => ({ hi: 'A', lo: 'B', ratio, total: { A: 30, B: totLo }, count: { A: count, B: count }, fav });
    expect(t('emojiDiff', vs(2.5), false)).toBe('A drops emoji twice as often as B. B prefers words.');
    expect(t('emojiDiff', vs(2.9), true)).toBe('A dropped emoji three times as often as B. B preferred words.');
    expect(t('emojiDiff', vs(1.7), false)).toBe('A is the emoji fan here. B is a bit more stingy.');
    expect(t('emojiDiff', vs(1.3), true)).toBe('A snuck in a few more emoji than B.');
    expect(t('emojiDiff', vs(1.1, 28), false)).toBe('You two are equally emoji-happy.');
    expect(t('emojiDiff', vs(1.1, 5, null, 1000), false)).toBe('Neither of you is big on emoji.');
    // Close, and judged on the whole chat: 22 emoji over 200 messages is 11 per 100.
    expect(t('emojiDiff', { hi: 'A', lo: 'B', ratio: 1.2, total: { A: 12, B: 10 }, count: { A: 100, B: 100 }, fav: null }, false)).toBe('You two are equally emoji-happy.');
    expect(t('emojiDiff', { hi: 'A', lo: 'B', ratio: 1.2, total: { A: 12, B: 10 }, count: { A: 150, B: 150 }, fav: null }, false)).toBe('Neither of you is big on emoji.');
    expect(t('emojiDiff', vs(Infinity, 0), false)).toBe('B has never sent a single emoji. Not one.');
    expect(t('emojiDiff', vs(1.1, 28, '😭'), true)).toBe('You two were equally emoji-happy. You both couldn\'t stop using 😭.');
  });

  it('shortens big counts so five emoji still fit a column', () => {
    expect([compact(845), compact(1000), compact(1234), compact(12345)]).toEqual(['845', '1k', '1.2k', '12k']);
  });
});

describe('visual refresh data', () => {
  it('keeps the next couple of messages after the first one, for the chat scene', () => {
    const S = stats(parse(['1/1/26, 21:14 - A: hi there', '1/1/26, 21:19 - B: hey', '1/1/26, 21:20 - B: <Media omitted>', '1/1/26, 21:22 - B: who is this', '1/1/26, 23:59 - A: me', ...Array(8).fill('2/1/26, 10:00 - A: ok')].join('\n')));
    expect(S.firstReplies.map((m) => m.text)).toEqual(['hey', 'who is this']);
  });

  it('only keeps replies that came within the hour', () => {
    const S = stats(parse(['1/1/26, 21:14 - A: hi there', '1/1/26, 23:00 - B: late', ...Array(8).fill('2/1/26, 10:00 - A: ok')].join('\n')));
    expect(S.firstReplies).toEqual([]);
  });

  it('exposes the days you talked, for the streak calendar', () => {
    const S = stats(parse(['1/1/26, 10:00 - A: hi', '3/1/26, 10:00 - B: hi', ...Array(8).fill('3/1/26, 11:00 - A: ok')].join('\n')));
    expect(S.dayKeys).toEqual(['2026-01-01', '2026-01-03']);
  });
});

describe('slide content', () => {
  it('speaks about a finished chat in the past tense', () => {
    const msgs = parse(Array.from({ length: 20 }, (_, i) => `1/3/26, 10:${String(i).padStart(2, '0')} - ${i % 2 ? 'A' : 'B'}: hi`).join('\n'));
    const intro = (now) => slidesFor(stats(msgs, now))[0].render(stats(msgs, now));
    expect(intro(new Date(2026, 2, 2))).toMatch(/you've talked every single day/);
    expect(intro(new Date(2026, 5, 1))).toMatch(/you talked every single day/);
  });

  it('skips blank lines for the first message', () => {
    const S = stats(parse('1/1/26, 10:00 - B: \n1/1/26, 10:01 - B: helloo\n1/1/26, 10:02 - A: hi\n' + '1/1/26, 10:03 - A: ok\n'.repeat(10)));
    expect(S.first.text).toBe('helloo');
  });

  it('quotes the first apology of each person', () => {
    const S = stats(parse('1/1/26, 10:00 - B: sorry late\n1/1/26, 10:01 - A: maaf tadi\n1/1/26, 10:02 - A: sorry again\n' + '1/1/26, 10:03 - A: ok\n'.repeat(10)));
    expect(S.sorryFirst.A.text).toBe('maaf tadi');
    expect(S.sorryFirst.B.text).toBe('sorry late');
  });

  it('keeps everyday Malay and English fillers out of the vocabulary', () => {
    const S = stats(parse(Array.from({ length: 20 }, (_, i) => `1/1/26, 10:${String(i).padStart(2, '0')} - ${i % 2 ? 'A: tapi kalau macam orang sebab like think said hahahahaha hehehe badminton' : 'B: tapi kalau macam orang sebab boba'}`).join('\n')));
    expect(S.words).toEqual({ A: ['badminton'], B: ['boba'] });
  });

  it('survives words that are also built-in object names', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `1/1/26, 10:${String(i).padStart(2, '0')} - ${i % 2 ? 'A: badminton' : 'B: boba'}`);
    lines.push('1/1/26, 11:00 - A: the constructor came today');
    expect(stats(parse(lines.join('\n'))).words).toEqual({ A: ['badminton'], B: ['boba'] });
  });

  it('merges stretched spellings and shows the most common one', () => {
    const said = ['ohhh', 'ohhhh', 'ohhh', 'okiee', 'okie', 'okiee', 'tapiii'];
    const lines = Array.from({ length: 21 }, (_, i) => `1/1/26, 10:${String(i).padStart(2, '0')} - ${i % 3 ? 'A: ' + said[i % 7] : 'B: boba'}`);
    expect(stats(parse(lines.join('\n'))).words.A).toEqual(['ohhh', 'okiee']);
  });

  it('gives each person the words they use more than the other', () => {
    const counts = {
      A: { badminton: 6, makan: 5, kerja: 4, nasi: 2 },
      B: { makan: 5, boba: 4, kerja: 1, sedap: 7 }, // same 17 words in total, so makan is even
    };
    expect(signatureWords(counts, ['A', 'B'])).toEqual({ A: ['badminton', 'kerja'], B: ['sedap', 'boba'] });
  });

  it('hides slides with nothing to show', () => {
    const S = stats(parse(Array.from({ length: 20 }, (_, i) => `1/1/26, 10:${String(i).padStart(2, '0')} - ${i % 2 ? 'A' : 'B'}: hello`).join('\n')));
    const ids = slidesFor(S).map((s) => s.id);
    for (const id of ['love', 'night', 'emoji', 'carried']) expect(ids).not.toContain(id);
    expect(ids).toContain('reply');
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

describe('bubbles', () => {
  it('averages messages per turn and finds the longest burst', () => {
    const msgs = parse([
      '1/1/26, 10:00 - A: hey', '1/1/26, 10:00 - A: so', '1/1/26, 10:01 - A: guess what', '1/1/26, 10:01 - A: !!',
      '1/1/26, 10:02 - B: what',
      '1/1/26, 10:03 - A: ok', '1/1/26, 10:03 - A: tell u later',
      '1/1/26, 10:05 - B: ok',
    ].join('\n'));
    const b = bubbles(msgs, ['A', 'B']);
    expect(b.avg.A).toBe(3); // turns of 4 and 2
    expect(b.avg.B).toBe(1);
    expect(b.longest).toMatchObject({ who: 'A', n: 4 });
  });

  it('describes each person\'s turns by their usual length and spread, not an average', () => {
    // A's turns: 1, 1, 2, 3, 7 bubbles. B answers once in between.
    const sizes = [1, 1, 2, 3, 7], lines = [];
    sizes.forEach((n, i) => {
      for (let k = 0; k < n; k++) lines.push(`1/1/26, ${10 + i}:0${k} - A: msg ${k}`);
      lines.push(`1/1/26, ${10 + i}:30 - B: ok`);
    });
    const s = bubbles(parse(lines.join('\n')), ['A', 'B']).shape;
    expect(s.A).toEqual({ usual: 2, single: 40, burst: 20, dist: [40, 20, 20, 0, 20], type: 'ranter' });
    expect(s.B).toEqual({ usual: 1, single: 100, burst: 0, dist: [100, 0, 0, 0, 0], type: 'oneliner' });
  });

  it('keeps a tape of real turns: up to 20, evenly across the chat, in order', () => {
    // A's turns are 1, 2, 3, ... 40 bubbles (one per hour), B answers once between each.
    const lines = [];
    for (let i = 1; i <= 40; i++) {
      const day = String(1 + Math.floor(i / 20)).padStart(2, '0'), h = String(i % 20).padStart(2, '0');
      for (let k = 0; k < i; k++) lines.push(`${day}/01/26, ${h}:00 - A: m`);
      lines.push(`${day}/01/26, ${h}:30 - B: ok`);
    }
    const tape = bubbles(parse(lines.join('\n')), ['A', 'B']).tape;
    expect(tape.A).toHaveLength(20);
    expect(tape.A[0]).toBe(1);
    expect(tape.A).toEqual([...tape.A].sort((a, b) => a - b)); // still in chat order
    expect(tape.A.at(-1)).toBeGreaterThanOrEqual(38);
    expect(tape.B.every((n) => n === 1)).toBe(true);
  });

  it('picks the tape in proportion to how the person texts', () => {
    // A: 40 turns, a quarter of them 8 bubbles long, sitting on every other turn early on,
    // right where evenly spaced picks would land, so even spacing would show twice as many.
    const lines = [];
    const turn = (d, n) => {
      const day = String(1 + Math.floor(d / 20)).padStart(2, '0'), h = String(d % 20).padStart(2, '0');
      for (let k = 0; k < n; k++) lines.push(`${day}/01/26, ${h}:00 - A: m`);
      lines.push(`${day}/01/26, ${h}:30 - B: ok`);
    };
    for (let i = 0; i < 40; i++) turn(i, i < 20 && i % 2 === 0 ? 8 : 1);
    const tape = bubbles(parse(lines.join('\n')), ['A', 'B']).tape.A;
    expect(tape.filter((n) => n === 8)).toHaveLength(5); // 25% of 20
    expect(tape.filter((n) => n === 1)).toHaveLength(15);
    expect(tape.indexOf(8)).toBe(0); // still in chat order: the long ones come first
    expect(tape.slice(-10).every((n) => n === 1)).toBe(true); // the late, single-bubble stretch comes last
  });

  it('keeps every turn on the tape when there are fewer than 20', () => {
    const lines = ['1/1/26, 10:00 - A: a', '1/1/26, 10:00 - A: b', '1/1/26, 10:30 - B: ok', '1/1/26, 11:00 - A: c'];
    expect(bubbles(parse(lines.join('\n')), ['A', 'B']).tape).toEqual({ A: [2, 1], B: [1] });
  });

  it('types each texter: ranter, one-liner, or normal', () => {
    expect(texterType({ usual: 3, single: 25, burst: 4 })).toBe('ranter'); // usually 3
    expect(texterType({ usual: 2, single: 31, burst: 9 })).toBe('ranter'); // bursts on 9% of turns
    expect(texterType({ usual: 2, single: 49, burst: 3 })).toBe('oneliner');
    expect(texterType({ usual: 2, single: 39, burst: 3 })).toBe('normal');
    expect(texterType({ usual: 2, single: 46, burst: 6 })).toBe('normal'); // many one-liners, but bursts too
  });

  it('uses the lower middle turn as usual when the count is even', () => {
    const lines = ['1/1/26, 10:00 - A: a', '1/1/26, 10:00 - A: b', '1/1/26, 10:00 - A: c', '1/1/26, 10:00 - A: d', '1/1/26, 10:30 - B: ok',
      '1/1/26, 11:00 - A: a', '1/1/26, 11:00 - A: b', '1/1/26, 11:30 - B: ok'];
    expect(bubbles(parse(lines.join('\n')), ['A', 'B']).shape.A.usual).toBe(2); // turns of 4 and 2
  });

  it('leaves media out of a burst, so a photo dump is not a long burst', () => {
    const lines = ['1/1/26, 10:00 - A: look'];
    for (let i = 0; i < 20; i++) lines.push('1/1/26, 10:01 - A: <Media omitted>');
    lines.push('1/1/26, 10:02 - B: wow');
    expect(bubbles(parse(lines.join('\n')), ['A', 'B']).longest).toMatchObject({ who: 'A', n: 1 });
  });

  // `n` messages from A one minute apart, each `words` words long.
  const burst = (n, words, startMin = 0) => Array.from({ length: n }, (_, i) =>
    `1/1/26, 10:${String(startMin + i).padStart(2, '0')} - A: ${Array(words).fill('kata').join(' ')}`);

  it('calls a long, wordy burst a rant', () => {
    const msgs = parse([...burst(10, 8), '1/1/26, 10:30 - B: ok'].join('\n'));
    expect(bubbles(msgs, ['A', 'B']).feature).toMatchObject({ kind: 'rant', who: 'A', n: 10, words: 80 });
  });

  it('calls a long burst of short reactions a spree, and a short one normal', () => {
    expect(bubbles(parse([...burst(12, 2), '1/1/26, 10:30 - B: ok'].join('\n')), ['A', 'B']).feature).toMatchObject({ kind: 'spree', n: 12 });
    expect(bubbles(parse([...burst(3, 8), '1/1/26, 10:30 - B: ok'].join('\n')), ['A', 'B']).feature).toMatchObject({ kind: 'normal', n: 3 });
  });

  it('does not call a photo dump with deletions a rant', () => {
    const dump = [];
    for (let i = 0; i < 40; i++) dump.push(`1/1/26, 10:${String(Math.floor(i / 2)).padStart(2, '0')} - A: ${i % 2 ? 'You deleted this message' : '<Media omitted>'}`);
    const f = bubbles(parse([...dump, '1/1/26, 10:30 - B: wow'].join('\n')), ['A', 'B']).feature;
    expect(f.kind).not.toBe('rant');
  });

  it('does not call a burst a rant when photos outnumber the typed messages', () => {
    const lines = [];
    for (let i = 0; i < 10; i++) lines.push(`1/1/26, 10:${String(i).padStart(2, '0')} - A: kata kata kata kata kata kata kata kata`, `1/1/26, 10:${String(i).padStart(2, '0')} - A: <Media omitted>`, `1/1/26, 10:${String(i).padStart(2, '0')} - A: <Media omitted>`);
    expect(bubbles(parse([...lines, '1/1/26, 10:30 - B: ok'].join('\n')), ['A', 'B']).feature.kind).toBe('spree');
  });

  it('features the biggest rant over a longer spree', () => {
    const msgs = parse([...burst(15, 2), '1/1/26, 10:20 - B: ok', ...burst(9, 8, 30), '1/1/26, 10:50 - B: ok'].join('\n'));
    expect(bubbles(msgs, ['A', 'B']).feature).toMatchObject({ kind: 'rant', n: 9, words: 72 });
  });

  it('starts a new turn after a 10+ minute gap', () => {
    const msgs = parse('1/1/26, 10:00 - A: hi\n1/1/26, 10:20 - A: hello?\n1/1/26, 10:21 - B: sorry');
    expect(bubbles(msgs, ['A', 'B']).avg.A).toBe(1);
  });
});

import { arc } from '../src/stats.js';

describe('arc: how the chat rose and settled', () => {
  const DAY = 864e5, start = new Date(2026, 0, 5, 12);
  // perWeek[i] messages spread across week i, alternating sender.
  const chat = (perWeek) => perWeek.flatMap((n, w) => Array.from({ length: n }, (_, i) => ({
    who: i % 2 ? 'B' : 'A', text: 'hi', media: false, deleted: false, when: new Date(+start + w * 7 * DAY + (i % 7) * DAY),
  })));
  const after = (weeks) => new Date(+start + weeks * 7 * DAY);

  it('finds the peak week and calls a long silence gone quiet', () => {
    const a = arc(chat([300, 250, 120, 60, 20, 10, 5, 2, 1, 1]), after(40));
    expect(a.eligible).toBe(true);
    expect(a.peak.week).toEqual(start);
    expect(a.now.phase).toBe('quiet');
    expect(a.drop.from).toEqual(start);
  });

  it('takes the temperature: on heat, room temperature, ice cold', () => {
    expect(arc(chat([20, 30, 40, 60, 80, 90, 100, 100, 100, 100, 100, 100]), after(12)).now.temp).toBe('hot');
    expect(arc(chat([100, 100, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]), after(12)).now.temp).toBe('hot');
    expect(arc(chat([100, 100, 100, 100, 100, 100, 100, 100, 50, 30, 20, 20]), after(12)).now.temp).toBe('room');
    expect(arc(chat([300, 100, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]), after(12)).now.temp).toBe('cold');
    expect(arc(chat([300, 250, 120, 60, 20, 10, 5, 2, 1, 1]), after(40)).now.temp).toBe('cold'); // gone quiet
  });

  it('says how long it has been cooling, and by how much', () => {
    const a = arc(chat([100, 100, 100, 100, 100, 100, 100, 100, 50, 30, 20, 20]), after(12));
    expect(a.now.dropPct).toBe(70); // 30 a week now against a peak of 100
    expect(a.now.weeksSincePeak).toBe(4); // the four-week average last peaked in week 7
    const q = arc(chat([300, 250, 120, 60, 20, 10, 5, 2, 1, 1]), after(40));
    expect(q.now.silentDays).toBeGreaterThanOrEqual(30 * 7 - 70);
    expect(q.drop.weeks).toBeGreaterThan(0);
  });

  it('has no cool-down when the pace never fell by a quarter of the peak', () => {
    expect(arc(chat([100, 100, 90, 95, 100, 85, 90, 100, 95, 100, 90, 100]), after(12)).drop).toBe(null);
  });

  it('ends the biggest cool-down by the last message, not in the silence after it', () => {
    const msgs = chat([300, 250, 120, 60, 20, 10, 5, 2, 1, 1]);
    const a = arc(msgs, after(40));
    expect(+a.drop.to).toBeLessThanOrEqual(+msgs.at(-1).when);
  });

  it('reads a chat still near its best as at the peak', () => {
    const a = arc(chat([20, 30, 40, 60, 80, 90, 100, 100, 100, 100, 100, 100]), after(12));
    expect(a.now.phase).toBe('peak');
  });

  it('reads a recent fall as cooling down, and a recent rise as warming up', () => {
    expect(arc(chat([100, 100, 100, 100, 100, 100, 100, 100, 50, 30, 20, 20]), after(12)).now.phase).toBe('cooling');
    expect(arc(chat([100, 100, 100, 60, 20, 10, 10, 10, 10, 20, 30, 40]), after(12)).now.phase).toBe('warming');
  });

  it('reads an even pace well below the peak as steady or a simmer', () => {
    expect(arc(chat([100, 100, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]), after(12)).now.phase).toBe('steady');
    expect(arc(chat([300, 100, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]), after(12)).now.phase).toBe('simmer');
  });

  it('is not eligible under eight weeks, and fits any length into the same bars', () => {
    expect(arc(chat([200, 100, 50]), after(3)).eligible).toBe(false);
    const long = arc(chat(Array(150).fill(40)), after(150));
    expect(long.bars.length).toBeLessThanOrEqual(52);
    expect(Math.max(...long.bars)).toBe(1);
  });
});

import { comebacks } from '../src/stats.js';

describe('comebacks: the silences and who broke them', () => {
  const DAY = 864e5, t0 = new Date(2026, 0, 1, 12);
  // One message a day on each listed day, alternating sender unless one is given.
  const days = (list) => list.map(([d, who]) => ({ who, text: 'hi', media: false, deleted: false, when: new Date(+t0 + d * DAY) }));
  const daily = (from, to, who) => Array.from({ length: to - from + 1 }, (_, i) => [from + i, who ?? (i % 2 ? 'B' : 'A')]);

  it('counts silences of two weeks or more and who came back', () => {
    const msgs = days([...daily(0, 10), [30, 'B'], ...daily(31, 40), [55, 'A'], ...daily(56, 70)]);
    const c = comebacks(msgs, ['A', 'B']);
    expect(c.eligible).toBe(true);
    expect(c.count).toBe(2);
    expect(c.by).toEqual({ A: 1, B: 1 });
    expect(c.longest).toMatchObject({ days: 20, who: 'B' });
    expect(c.longest.from).toEqual(new Date(+t0 + 10 * DAY));
  });

  it('lays the chat out as active stretches and the comebacks between them', () => {
    const msgs = days([...daily(0, 10), [30, 'B'], ...daily(31, 70)]);
    const c = comebacks(msgs, ['A', 'B']);
    expect(c.spans).toHaveLength(2);
    expect(c.spans[0].from).toBe(0);
    expect(c.spans.at(-1).to).toBe(1);
    expect(c.marks).toEqual([{ at: c.spans[1].from, who: 'B' }]);
  });

  it('says how long the longest gap was even when it never went dark', () => {
    const c = comebacks(days([...daily(0, 30), ...daily(40, 70)]), ['A', 'B']);
    expect(c.count).toBe(0);
    expect(c.longest).toBe(null);
    expect(c.longestGap).toBe(10);
  });

  it('is not eligible under eight weeks', () => {
    expect(comebacks(days(daily(0, 40)), ['A', 'B']).eligible).toBe(false);
  });
});
