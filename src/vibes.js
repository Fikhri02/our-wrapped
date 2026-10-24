// Playful "who are you in this chat" stats: how alike you type, how loud each of you
// texts. Heuristics over the parsed messages; the slides hedge every reading.
import { EMO_LEX } from './lexicon.js';
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

// A negator just before a match ("tak sedih", "not happy") cancels it.
const NEG = new Set(['tak', 'not', 'no', 'bukan', 'x', 'tidak', 'takde']);
const negated = (text, at) => (text.slice(0, at).toLowerCase().match(/[\p{L}']+/gu) || []).slice(-2).some((w) => NEG.has(w));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asRe = (p) => (p instanceof RegExp ? new RegExp(p.source, 'giu') : new RegExp(`(?<![\\p{L}\\p{N}])${esc(p)}(?![\\p{L}\\p{N}])`, 'giu'));

// The longest un-negated match of any phrase in the list, or 0.
function longest(text, res) {
  let best = 0;
  for (const re of res) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) if (m[0].length > best && !negated(text, m.index)) best = m[0].length;
  }
  return best;
}

const pcts = (counts, n) => Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, n ? Math.round((v / n) * 100) : 0]));

// Love (or friendship) languages: each affectionate message counts once, under the
// category of its longest matching phrase.
export function languages(msgs, pair, lex) {
  const cats = Object.keys(lex), res = Object.fromEntries(cats.map((c) => [c, lex[c].map(asRe)]));
  const out = Object.fromEntries(pair.map((p) => [p, Object.fromEntries(cats.map((c) => [c, 0]))]));
  for (const m of texts(msgs)) {
    if (!out[m.who]) continue;
    let pick = null, len = 0;
    for (const c of cats) { const l = longest(m.text, res[c]); if (l > len) { len = l; pick = c; } }
    if (pick) out[m.who][pick]++;
  }
  return Object.fromEntries(pair.map((p) => {
    const counts = out[p], n = Object.values(counts).reduce((a, b) => a + b, 0), eligible = n >= 10;
    const primary = eligible ? cats.reduce((a, c) => (counts[c] > counts[a] ? c : a), cats[0]) : null;
    return [p, { eligible, n, pct: pcts(counts, n), primary }];
  }));
}

const EMOS = Object.keys(EMO_LEX);
const EMO_RES = Object.fromEntries(EMOS.map((e) => [e, EMO_LEX[e].words.map(asRe)]));
const emosIn = (text) => EMOS.filter((e) => longest(text, EMO_RES[e]) || EMO_LEX[e].emoji.some((x) => text.includes(x) && !negated(text, text.indexOf(x))));

// A message carrying k emotions adds 1/k to each.
function mix(msgs) {
  const acc = Object.fromEntries(EMOS.map((e) => [e, 0]));
  let n = 0;
  for (const m of msgs) {
    const es = emosIn(m.text);
    if (!es.length) continue;
    n++;
    for (const e of es) acc[e] += 1 / es.length;
  }
  return { n, pct: pcts(acc, n) };
}

export function emotions(msgs, pair) {
  const t = texts(msgs), all = mix(t);
  return { eligible: all.n >= 30, all, ...Object.fromEntries(pair.map((p) => [p, mix(t.filter((m) => m.who === p))])) };
}

// The emotion mix as a forecast.
const FORECAST = { joy: 'sunshine', love: 'golden', surprise: 'thunder', worry: 'cloud', anger: 'storm', sadness: 'rain' };
function forecast(pct) {
  const [[e1, s1], [e2, s2]] = Object.entries(pct).sort((a, b) => b[1] - a[1]);
  if (new Set([e1, e2]).has('love') && new Set([e1, e2]).has('joy') && s2 >= 30) return { label: 'golden', top: s1 };
  if (s1 < 35) return { label: 'chaotic', top: s1 };
  return { label: FORECAST[e1], top: s1 };
}

// The whole chat's weather, and the month that broke from it most.
export function weather(msgs, pair) {
  const t = texts(msgs).filter((m) => pair.includes(m.who)), all = mix(t);
  if (all.n < 30) return { eligible: false, label: null, standout: null };
  const overall = forecast(all.pct).label;
  const months = new Map();
  for (const m of t) {
    const k = `${m.when.getFullYear()}-${m.when.getMonth()}`;
    if (!months.has(k)) months.set(k, []);
    months.get(k).push(m);
  }
  let standout = null;
  for (const ms of months.values()) {
    const x = mix(ms);
    if (x.n < 20) continue;
    const f = forecast(x.pct);
    if (f.label !== overall && (!standout || f.top > standout.top)) {
      standout = { month: new Date(ms[0].when.getFullYear(), ms[0].when.getMonth(), 1), label: f.label, top: f.top };
    }
  }
  return { eligible: true, label: overall, standout: standout && { month: standout.month, label: standout.label } };
}
