// Playful "who are you in this chat" stats: how alike you type, how loud each of you
// texts. Heuristics over the parsed messages; the slides hedge every reading.
import { EMO_LEX, FRIEND_LEX, LOVE_LEX } from './lexicon.js';
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
const PICTS = /\p{Extended_Pictographic}/gu;
const emojiCount = (text) => (text.match(PICTS) || []).length;

// Texting expressiveness, scored between the two of you: each feature is your share of
// the pair's total, and the score is the average share. The biggest gap names the set of
// archetypes the slide uses. stats() passes the conversations it already has.
export function creatures(msgs, pair, convs = null) {
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
  for (const c of convs || conversations(t, quietHours(t, pair))) {
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

// A negator right before a match, in the same clause, cancels it: "tak sedih", "jangan
// risau", "tak pernah sedih". One softener may sit between ("not very happy"). A comma ends
// the clause, so "tak kisah, sayang" keeps its sayang, and so does "tak pe sayang".
const NEG = new Set(['tak', 'not', 'no', 'bukan', 'x', 'tidak', 'takde', 'tiada', 'jangan', 'jgn', 'dont', "don't", 'don’t', 'never']);
const SOFT = new Set(['very', 'that', 'so', 'too', 'really', 'ever', 'pernah', 'sangat', 'terlalu']);
const negatedAt = (toks, i) => {
  let j = i - 1;
  if (j > 0 && SOFT.has(toks[j])) j--;
  return j >= 0 && NEG.has(toks[j]);
};

// Words (and each emoji) of one clause at a time. Matching on tokens, not regexes over the
// raw text, keeps a 50,000-message chat fast.
const TOKEN = /[\p{L}\p{N}'’]+|\p{Extended_Pictographic}/gu;
const toClauses = (text) => text.toLowerCase().split(/[,.!?;\n]/).map((c) => c.match(TOKEN) || []);
// Tokenised once per message, however many word lists read it.
const seen = new WeakMap();
const clauses = (m) => { if (!seen.has(m)) seen.set(m, toClauses(m.text)); return seen.get(m); };

// A matcher for a word list ({ category: [phrase or RegExp] }): for each category, the
// length of its longest un-negated phrase in a message. A RegExp is tested against single
// words; phrases match whole words, up to four in a row.
function matcher(cats) {
  const phrases = new Map(), patterns = [];
  let span = 1;
  for (const [c, list] of Object.entries(cats)) {
    for (const p of list) {
      if (p instanceof RegExp) { patterns.push([c, new RegExp(`^(?:${p.source.replace(/\\b/g, '')})$`, 'iu')]); continue; }
      const key = (p.toLowerCase().match(TOKEN) || []).join(' ');
      if (!phrases.has(key)) phrases.set(key, c);
      span = Math.max(span, key.split(' ').length);
    }
  }
  return (m) => {
    const out = {};
    const hit = (c, len, toks, i) => { if (len > (out[c] || 0) && !negatedAt(toks, i)) out[c] = len; };
    for (const toks of clauses(m)) {
      for (let i = 0; i < toks.length; i++) {
        for (const [c, re] of patterns) if (re.test(toks[i])) hit(c, toks[i].length, toks, i);
        let key = '';
        for (let n = 1; n <= span && i + n <= toks.length; n++) {
          key = n === 1 ? toks[i] : `${key} ${toks[i + n - 1]}`;
          const c = phrases.get(key);
          if (c) hit(c, key.length, toks, i);
        }
      }
    }
    return out;
  };
}

const pcts = (counts, n) => Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, n ? Math.round((v / n) * 100) : 0]));

// Love (or friendship) languages: each affectionate message counts once, under the
// category of its longest matching phrase.
const compiled = new WeakMap();
export function languages(msgs, pair, lex) {
  const cats = Object.keys(lex);
  if (!compiled.has(lex)) compiled.set(lex, matcher(lex));
  const match = compiled.get(lex);
  const out = Object.fromEntries(pair.map((p) => [p, Object.fromEntries(cats.map((c) => [c, 0]))]));
  for (const m of texts(msgs)) {
    if (!out[m.who]) continue;
    const h = match(m);
    const pick = Object.keys(h).reduce((a, c) => (!a || h[c] > h[a] ? c : a), null);
    if (pick) out[m.who][pick]++;
  }
  return Object.fromEntries(pair.map((p) => {
    const counts = out[p], n = Object.values(counts).reduce((a, b) => a + b, 0), eligible = n >= 10;
    const primary = eligible ? cats.reduce((a, c) => (counts[c] > counts[a] ? c : a), cats[0]) : null;
    return [p, { eligible, n, pct: pcts(counts, n), primary }];
  }));
}

const EMOS = Object.keys(EMO_LEX);
const emoMatch = matcher(Object.fromEntries(EMOS.map((e) => [e, [...EMO_LEX[e].words, ...EMO_LEX[e].emoji]])));
const emosIn = (m) => { const h = emoMatch(m); return EMOS.filter((e) => h[e]); };

// Each text message with the emotions it carries, worked out once and shared by the
// playlist and the weather.
const tag = (msgs) => texts(msgs).map((m) => ({ m, es: emosIn(m) }));

// A message carrying k emotions adds 1/k to each.
function mix(tagged) {
  const acc = Object.fromEntries(EMOS.map((e) => [e, 0]));
  let n = 0;
  for (const { es } of tagged) {
    if (!es.length) continue;
    n++;
    for (const e of es) acc[e] += 1 / es.length;
  }
  return { n, pct: pcts(acc, n) };
}

export function emotions(msgs, pair, tagged = tag(msgs)) {
  const all = mix(tagged);
  return { eligible: all.n >= 30, all, ...Object.fromEntries(pair.map((p) => [p, mix(tagged.filter((x) => x.m.who === p))])) };
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
export function weather(msgs, pair, tagged = tag(msgs)) {
  const t = tagged.filter((x) => pair.includes(x.m.who)), all = mix(t);
  if (all.n < 30) return { eligible: false, label: null, standout: null };
  const overall = forecast(all.pct).label;
  const months = new Map();
  for (const x of t) {
    const k = `${x.m.when.getFullYear()}-${x.m.when.getMonth()}`;
    if (!months.has(k)) months.set(k, []);
    months.get(k).push(x);
  }
  let standout = null;
  for (const xs of months.values()) {
    const mx = mix(xs);
    if (mx.n < 20) continue;
    const f = forecast(mx.pct), w = xs[0].m.when;
    if (f.label !== overall && (!standout || f.top > standout.top)) standout = { month: new Date(w.getFullYear(), w.getMonth(), 1), label: f.label, top: f.top };
  }
  return { eligible: true, label: overall, standout: standout && { month: standout.month, label: standout.label } };
}

// All five, sharing the work: emotions are tagged once, conversations come from stats().
export function vibes(msgs, pair, { convs = null } = {}) {
  const tagged = tag(msgs);
  return {
    sync: styleSync(msgs, pair), creatures: creatures(msgs, pair, convs),
    loveLang: languages(msgs, pair, LOVE_LEX), friendLang: languages(msgs, pair, FRIEND_LEX),
    emotions: emotions(msgs, pair, tagged), weather: weather(msgs, pair, tagged),
  };
}
