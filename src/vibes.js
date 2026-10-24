// Playful "who are you in this chat" stats: how alike you type, how loud each of you
// texts. Heuristics over the parsed messages; the slides hedge every reading.
import { conversations, quietHours } from './stats.js';

// Small words people use without thinking. How often each one shows up is a fingerprint
// of writing style (language style matching), English and Malay together.
export const FUNCTION_WORDS = 'i you we me my your our and but so the a to aku kau awak saya kita kami dia lah je kan pun ke tak nak dah ni tu yang dengan'.split(' ');
const FW = new Set(FUNCTION_WORDS);

const texts = (msgs) => msgs.filter((m) => !m.media && !m.deleted && m.text.trim());
const words = (text) => text.toLowerCase().match(/[\p{L}']+/gu) || [];

// Each person's share of function words, word by word, within one stretch of messages.
function fingerprint(msgs, who) {
  const counts = Object.create(null);
  let n = 0;
  for (const m of msgs) {
    if (m.who !== who) continue;
    for (const w of words(m.text)) if (FW.has(w)) { counts[w] = (counts[w] || 0) + 1; n++; }
  }
  return { n, f: (w) => (n ? (counts[w] || 0) / n : 0) };
}

// 1 − half the total difference between the two fingerprints: 100 means identical.
function likeness(a, b) {
  let diff = 0;
  for (const w of FUNCTION_WORDS) diff += Math.abs(a.f(w) - b.f(w));
  return Math.round((1 - diff / 2) * 100);
}

// Early third against late third of the chat: did you start typing alike?
export function styleSync(msgs, pair) {
  const t = texts(msgs), third = Math.floor(t.length / 3);
  const windows = [t.slice(0, third), t.slice(t.length - third)];
  const prints = windows.map((w) => pair.map((p) => fingerprint(w, p)));
  const eligible = third > 0 && prints.every((ps) => ps.every((x) => x.n >= 150));
  if (!eligible) return { eligible, then: 0, now: 0, delta: 0 };
  const [then, now] = prints.map(([a, b]) => likeness(a, b));
  return { eligible, then, now, delta: now - then };
}

const LOUD = /!!|\p{Lu}{3,}/u;
const PICT = /\p{Extended_Pictographic}/u;
const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const emojiCount = (text) => [...seg.segment(text)].filter((g) => PICT.test(g.segment)).length;

// Texting expressiveness, scored between the two of you: each feature is your share of
// the pair's total, and the score is the average share. The biggest gap names the set of
// archetypes the slide uses.
export function creatures(msgs, pair) {
  const t = texts(msgs);
  const feat = Object.fromEntries(pair.map((p) => [p, { n: 0, words: 0, turns: 0, loud: 0, emoji: 0, starts: 0, night: 0 }]));
  let prev = null;
  for (const m of t) {
    const f = feat[m.who];
    if (!f) continue;
    f.n++;
    f.words += words(m.text).length;
    if (LOUD.test(m.text)) f.loud++;
    f.emoji += emojiCount(m.text);
    if (m.when.getHours() < 4) f.night++;
    if (!prev || prev.who !== m.who || (m.when - prev.when) / 6e4 >= 10) f.turns++;
    prev = m;
  }
  for (const c of conversations(t, quietHours(t, pair))) {
    if (feat[c[0].who] && c.some((m) => m.who !== c[0].who)) feat[c[0].who].starts++;
  }
  const eligible = pair.every((p) => feat[p].n >= 50);
  const night = Object.fromEntries(pair.map((p) => [p, feat[p].n > 0 && feat[p].night / feat[p].n >= 0.15]));
  if (!eligible) return { eligible, score: Object.fromEntries(pair.map((p) => [p, 50])), set: 'energy', high: null, night };

  const [A, B] = pair;
  const per = (p) => {
    const f = feat[p];
    return { length: f.words / f.n, turns: f.n / f.turns, loud: f.loud / f.n, emoji: f.emoji / f.n, starts: f.starts };
  };
  const a = per(A), b = per(B);
  const share = Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + b[k] ? a[k] / (a[k] + b[k]) : 0.5]));
  const mean = (Object.values(share).reduce((x, y) => x + y, 0) / 5) * 100;
  const score = { [A]: Math.round(mean), [B]: Math.round(100 - mean) };
  const gap = (...ks) => ks.reduce((x, k) => x + Math.abs(share[k] - 0.5), 0) / ks.length;
  const gaps = { length: gap('length', 'turns'), loud: gap('loud', 'emoji'), energy: gap('starts') };
  const set = Object.keys(gaps).reduce((x, k) => (gaps[k] > gaps[x] ? k : x), 'energy');
  const high = Math.abs(score[A] - score[B]) < 6 ? null : score[A] > score[B] ? A : B;
  return { eligible, score, set, high, night };
}
