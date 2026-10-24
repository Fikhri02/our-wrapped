// One pure function per slide's data. stats() bundles them for the player.

const STOP = new Set(
  ("the and you for that this with are was but not have just what yes okay its it's can will dah tak nak ada yang ini itu kat dengan untuk lagi pun tu ni la lah je jer kan ke dia aku saya you i me my your we our ok oke haha hahaha hahahaha omitted media deleted message was too lol kau so dont don't then them they how why when who where tengah boleh nanti esok tadi"
    // everyday Malay and English fillers that otherwise top every chat
    + " tapi kalau apa macam orang sebab sbb pergi buat kena baru balik sikit dekat mana bila siapa kenapa camne cemana tau tahu tengok cakap rasa memang jugak juga dari pada sampai masa harini semalam takde tiada okey haah ye ya eh oh weh wei hmm kita korang diorang awak dulu lepas nanti jadi betul banyak sama ingat like think said she her his him he know really yeah yep got get going gonna want would could should also than there their about because cause from into been were very much more some still even only one well thing things people time now later back see say told tell make made need right sure maybe kot sangat bukan selalu jangan nampak did already today good"
    // texting short forms
    + " mcm dgn gak pastu lepastu nnti skrg sekarang tgk ckp jgn nk tk xde pukul don didn doesn isn won"
  ).split(' '),
);
const SORRY = /\b(sorry|sori|sory|sry|soz|maaf|mianhae)\b/i;
const LOVE = /\b(love you|love u|luv u|ily|sayang you|sayang u|rindu|miss you|miss u)\b|❤|🥰|😘/i;
// A sign-off is a whole message made only of these (plus punctuation and emoji).
const BYE = "ok+|okay+|okie+|okey|oki|kk?|alright+|aight|noted|thanks?|thx|thank (?:you|u)|thankyou|ty|tq|sure|baik(?:lah)?|yelah|takpe|takpa|isokay|bye+|okbye|gn|good ?night|night|nite|rest well|have a good rest|take care|see (?:you|u)|you too|too|sweet dreams|selamat malam|slmt mlm|aye aye|sir";
const SIGNOFF = new RegExp(`^(?:${BYE})(?:[\\s,.!~]+(?:${BYE}))*$`, 'i');
const LINK = /https?:\/\//;
const GREETING = /^(hey+|hi+|hai+|hello+|helo|salam|assalam\w*|morning\w*|good morning|pagi|selamat (pagi|tengahari|petang))\b/i;
// "Tidur lah" and "go to sleep" are left out: in real chats they're mostly advice.
const GOODNIGHT = /\b(good ?nigh+t+|gn|nite|night night|nighty|rest well|good rest|good sleep|sleep well|sleep tight|sweet dreams|selamat malam|slmt mlm|tidur dulu|nak tidur (dah|dh|dulu|bye)|bye nak tidur|i go sleep|need to (go to )?sleep|sleep first)\b|^nigh+t+\b/i;
const LAUGH = /^(?:h+[aeiu]+|[aeiu]+h+)+h*$/i;
const PICT = /\p{Extended_Pictographic}/u;
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const graphemes = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
const top = (obj, n) => Object.keys(obj).sort((a, b) => obj[b] - obj[a]).slice(0, n);

export function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

// Each person's 6-hour window with the fewest messages, read off their own hourly
// counts so a night owl's sleep lands where it really is. Too little data: 1am-7am.
export function quietHours(msgs, people) {
  const out = {};
  for (const p of people) {
    const hist = new Array(24).fill(0);
    let n = 0;
    for (const m of msgs) if (m.who === p) { hist[m.when.getHours()]++; n++; }
    if (n < 30) { out[p] = { start: 1, end: 7 }; continue; }
    let best = 1, low = Infinity;
    for (let s = 0; s < 24; s++) {
      let sum = 0;
      for (let i = 0; i < 6; i++) sum += hist[(s + i) % 24];
      // Ties go to the window centred nearest 4am.
      const off = (x) => Math.min(Math.abs(x + 3 - 4), 24 - Math.abs(x + 3 - 4));
      if (sum < low || (sum === low && off(s) < off(best))) { low = sum; best = s; }
    }
    out[p] = { start: best, end: (best + 6) % 24 };
  }
  return out;
}

// A gap of 1-18h that crosses the middle of the replier's quiet window: they were
// asleep, not ignoring anyone.
export function sleptOn(p, q, quiet) {
  const gap = (q.when - p.when) / 6e4;
  if (!quiet || gap < 60 || gap > 18 * 60) return false;
  const mid = new Date(p.when);
  mid.setHours((quiet.start + 3) % 24, 0, 0, 0);
  if (mid <= p.when) mid.setDate(mid.getDate() + 1);
  return mid <= q.when;
}

export function signOff(m) {
  if (m.media) return false;
  const t = m.text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, '').replace(/[\s.,!~]+$/, '').trim();
  return t !== '' && SIGNOFF.test(t);
}
const isQuestion = (m) => !m.media && m.text.slice(-8).includes('?');

// Does q carry on p's conversation? Rules read off six real chats (see the method
// write-up): under an hour is always together; a late reply joins only if something
// was still open and it came within 6h, across the replier's sleep, or to a question.
// A greeting opens a new conversation unless it fronts the answer to a question.
export function sameConversation(p, q, quiet) {
  const gap = (q.when - p.when) / 6e4;
  if (gap < 60) return true;
  if (q.who === p.who) return gap < 120 && !signOff(p);
  if (gap > 18 * 60) return false;
  if (signOff(p) || LINK.test(q.text) || (GREETING.test(q.text) && !isQuestion(p))) return false;
  return gap < 360 || sleptOn(p, q, quiet[q.who]) || isQuestion(p);
}

export function conversations(msgs, quiet) {
  const out = [];
  msgs.forEach((m, j) => {
    if (j && sameConversation(msgs[j - 1], m, quiet)) out[out.length - 1].push(m);
    else out.push([m]);
  });
  return out;
}

// Who starts (a conversation the other answered), who reached out with no answer,
// and who had the last word.
export function convoStats(convs, people) {
  const zero = () => Object.fromEntries(people.map((p) => [p, 0]));
  const starts = zero(), reachedOut = zero(), lastWord = zero();
  for (const c of convs) {
    if (!(c[0].who in starts)) continue;
    if (c.every((m) => m.who === c[0].who)) { reachedOut[c[0].who]++; continue; }
    const last = c[c.length - 1];
    starts[c[0].who]++;
    if (last.who in lastWord) lastWord[last.who]++;
  }
  return { starts, reachedOut, lastWord, total: convs.length };
}

// Who says goodnight first, once per night (8pm to 5am belongs to the evening it
// started on).
export function goodnightFirst(msgs, people) {
  const seen = new Set();
  const tally = Object.fromEntries(people.map((p) => [p, 0]));
  for (const m of msgs) {
    const h = m.when.getHours();
    if (m.media || (h >= 5 && h < 20) || !(m.who in tally) || !GOODNIGHT.test(m.text)) continue;
    const night = new Date(m.when);
    if (h < 5) night.setDate(night.getDate() - 1);
    const k = dayKey(night);
    if (seen.has(k)) continue;
    seen.add(k);
    tally[m.who]++;
  }
  return tally;
}

// Nights the conversation carried on into the morning: a reply slept on that still
// belonged to the same conversation.
export function carriedNights(msgs, quiet) {
  const days = new Set();
  for (let j = 1; j < msgs.length; j++) {
    const p = msgs[j - 1], q = msgs[j];
    if (p.who !== q.who && sleptOn(p, q, quiet[q.who]) && sameConversation(p, q, quiet)) days.add(dayKey(q.when));
  }
  return days.size;
}

// The most recent night that carried on into the morning: who sent the last message of
// the night and when, and who picked it up in the morning and when. Times only, no text.
export function carriedExample(msgs, quiet) {
  for (let j = msgs.length - 1; j > 0; j--) {
    const p = msgs[j - 1], q = msgs[j];
    if (p.who !== q.who && sleptOn(p, q, quiet[q.who]) && sameConversation(p, q, quiet)) {
      return { nightWho: p.who, night: p.when, morningWho: q.who, morning: q.when };
    }
  }
  return null;
}

// The first new conversation each morning (5am to noon). A morning reply to last
// night's message is a continuation, so it doesn't count as texting first.
export function firstTexter(msgs, people, quiet = quietHours(msgs, people)) {
  const seen = new Set();
  const tally = Object.fromEntries(people.map((p) => [p, 0]));
  msgs.forEach((m, j) => {
    if (m.when.getHours() < 5 || m.when.getHours() >= 12) return;
    const k = dayKey(m.when);
    if (seen.has(k) || (j && sameConversation(msgs[j - 1], m, quiet))) return;
    seen.add(k);
    tally[m.who]++;
  });
  return tally;
}

// Each person's words: ones they use at least 1.5x as often as the other (as a share of
// everything each writes, so the chattier person doesn't win every word), at least 3 times.
// Ranked by count weighted by how much the word is theirs.
export function signatureWords(counts, people, n = 5) {
  const total = Object.fromEntries(people.map((p) => [p, Object.values(counts[p] || {}).reduce((a, b) => a + b, 0) || 1]));
  return Object.fromEntries(people.map((p) => {
    const o = people.find((x) => x !== p);
    const scored = Object.entries(counts[p] || {}).filter(([, c]) => c >= 3).map(([w, c]) => {
      const mine = c / total[p], theirs = o ? ((counts[o] || {})[w] || 0) / total[o] : 0;
      const share = mine / (mine + theirs);
      return [w, c * share, share];
    }).filter(([, , share]) => share >= 0.6);
    return [p, scored.sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w)];
  }));
}

// How you talk, on two axes: back-and-forths on a day you talk (a change of sender, so one
// thought split into five bubbles still counts once) and the share of days you talk at all.
// A chat under a month old is "new": how often doesn't mean much yet. A chat whose latest
// message is over a week old is "past", and gets talked about in the past tense.
export function pace(msgs, dayKeys, now = new Date()) {
  let turns = msgs.length ? 1 : 0;
  for (let j = 1; j < msgs.length; j++) if (msgs[j].who !== msgs[j - 1].who) turns++;
  const num = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const span = dayKeys.length ? num(dayKeys[dayKeys.length - 1]) - num(dayKeys[0]) + 1 : 0;
  const perDay = dayKeys.length ? Math.round(turns / dayKeys.length) : 0;
  const share = span ? Math.round((dayKeys.length / span) * 100) : 0;
  const often = share >= 50, alot = perDay >= 30;
  const kind = often ? (alot ? 'inseparable' : 'steady') : (alot ? 'bursts' : 'occasional');
  const past = msgs.length > 0 && now - msgs[msgs.length - 1].when > 7 * 864e5;
  return { turns: perDay, share, span, kind, isNew: span < 30, past };
}

export function longestStreak(dayKeys) {
  const nums = dayKeys.map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 864e5;
  });
  let best = 1, cur = 1, endIdx = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] - nums[i - 1] === 1) {
      cur++;
      if (cur > best) { best = cur; endIdx = i; }
    } else cur = 1;
  }
  return { days: best, startKey: dayKeys[endIdx - best + 1], endKey: dayKeys[endIdx] };
}

// Reply speed per person: gaps where the sender changes inside one conversation. A
// reply the replier slept on is counted as `slept` instead. Android exports have
// minute precision only, so the median is usually 0; `within1` and `mean` tell two
// people apart.
export function replySpeed(msgs, people, quiet = quietHours(msgs, people)) {
  const gaps = Object.fromEntries(people.map((p) => [p, []]));
  const slept = Object.fromEntries(people.map((p) => [p, 0]));
  for (let j = 1; j < msgs.length; j++) {
    const p = msgs[j - 1], q = msgs[j];
    if (p.who === q.who || !gaps[q.who]) continue;
    if (!sameConversation(p, q, quiet)) continue;
    if (sleptOn(p, q, quiet[q.who])) { slept[q.who]++; continue; }
    const gap = (q.when - p.when) / 6e4;
    if (gap >= 0) gaps[q.who].push(gap);
  }
  const out = { precise: msgs.some((m) => m.when.getSeconds() !== 0) };
  for (const p of people) {
    const g = gaps[p];
    out[p] = {
      median: median(g),
      mean: g.length ? g.reduce((a, b) => a + b, 0) / g.length : null,
      within1: g.length ? Math.round((g.filter((x) => x <= 1).length / g.length) * 100) : 0,
      slow: g.filter((x) => x >= 60).length,
      slept: slept[p],
    };
  }
  return out;
}

// Who carries the chat: words sent, and "double texts" (messaging again after 10+ min
// with no reply in between).
export function talker(msgs, people) {
  const words = Object.fromEntries(people.map((p) => [p, 0]));
  const texts = Object.fromEntries(people.map((p) => [p, 0]));
  const doubles = Object.fromEntries(people.map((p) => [p, 0]));
  msgs.forEach((m, j) => {
    if (!(m.who in words)) return;
    if (!m.media && !m.deleted) {
      words[m.who] += (m.text.match(/\S+/g) || []).length;
      texts[m.who]++;
    }
    const prev = msgs[j - 1];
    if (prev && prev.who === m.who && (m.when - prev.when) / 6e4 >= 10) doubles[m.who]++;
  });
  const avg = Object.fromEntries(people.map((p) => [p, texts[p] ? words[p] / texts[p] : 0]));
  return { words, doubles, avg };
}

// Who plays which part. The talker sends more messages (a split wider than 53/47), the
// storyteller writes longer ones, the chaser double texts more per message sent, so the busier
// sender doesn't win it on volume alone. Within 10% of each other, the role is shared (null).
export function talkRoles(count, talk, people) {
  const [A, B] = people;
  const lead = (x, y) => (x === y ? null : x >= y * 1.1 ? A : y >= x * 1.1 ? B : null);
  const ca = count[A] || 0, cb = count[B] || 0, pa = ca / (ca + cb || 1);
  return {
    talker: Math.abs(pa - 0.5) < 0.03 ? null : pa > 0.5 ? A : B,
    storyteller: lead(talk.avg[A] || 0, talk.avg[B] || 0),
    chaser: lead(ca ? (talk.doubles[A] || 0) / ca : 0, cb ? (talk.doubles[B] || 0) / cb : 0),
  };
}

// Who uses emoji more, per message each sends (so the chattier one doesn't win on volume),
// how many times more, and a favourite the two share.
export function emojiVs(emo, count, people) {
  const [A, B] = people;
  const total = Object.fromEntries(people.map((p) => [p, Object.values(emo[p] || {}).reduce((a, b) => a + b, 0)]));
  const rate = (p) => total[p] / (count[p] || 1);
  const hi = rate(A) >= rate(B) ? A : B, lo = hi === A ? B : A;
  const ratio = rate(lo) ? rate(hi) / rate(lo) : Infinity;
  const fav = (p) => Object.keys(emo[p] || {}).sort((a, b) => emo[p][b] - emo[p][a])[0];
  return { hi, lo, ratio, total, count: { [A]: count[A] || 0, [B]: count[B] || 0 }, fav: fav(A) && fav(A) === fav(B) ? fav(A) : null };
}

// Bubbles per turn: a turn is a run of messages from one person with no reply in between,
// broken by a 10+ minute gap (that counts as a double text, not the same burst). Media,
// deleted and blank messages are left out, so a photo dump doesn't read as a long burst.
// The featured burst: a rant (8+ messages and 60+ words: a story, venting, thinking out loud)
// if there is one, the wordiest; else the longest, a spree at 8+ (excited short reactions) or
// normal below that. 99% of real turns are 10 messages or fewer; a typical one is 2. A burst
// where photos and videos outnumber the typed messages is sharing, not ranting.
const RANT_MSGS = 8, RANT_WORDS = 60;
// What kind of texter someone is, from the shape of their turns. Thresholds set against
// real chats: a ranter bursts 6+ bubbles on 8% of turns or usually sends 3 or more; a
// one-liner sends a single bubble on 45%+ of turns and almost never bursts.
export const texterType = ({ usual, single, burst }) =>
  burst >= 8 || usual >= 3 ? 'ranter' : single >= 45 && burst <= 3 ? 'oneliner' : 'normal';

export function bubbles(msgs, people) {
  const turns = Object.fromEntries(people.map((p) => [p, []]));
  let longest = { who: null, n: 0, when: null }, rant = null, top = null;
  let run = null;
  const close = () => {
    if (!run || !turns[run.who]) return;
    turns[run.who].push(run.n);
    if (run.n > longest.n) { longest = { who: run.who, n: run.n, when: run.start }; top = run; }
    if (run.n >= RANT_MSGS && run.words >= RANT_WORDS && run.media < run.n && (!rant || run.words > rant.words)) rant = run;
  };
  for (const m of msgs) {
    if (m.media || m.deleted || !m.text.trim()) {
      if (run && run.who === m.who) run.media++; // counted against a rant, never as a message
      continue;
    }
    const words = (m.text.match(/\S+/g) || []).length;
    if (run && run.who === m.who && (m.when - run.last) / 6e4 < 10) {
      run.n++;
      run.words += words;
      run.last = m.when;
      run.lastMsg = m;
    } else {
      close();
      run = { who: m.who, n: 1, words, media: 0, start: m.when, last: m.when, firstMsg: m, lastMsg: m };
    }
  }
  close();
  const pick = rant || top;
  const feature = pick && {
    kind: rant ? 'rant' : pick.n >= RANT_MSGS ? 'spree' : 'normal',
    who: pick.who, n: pick.n, words: pick.words, start: pick.start, end: pick.last, first: pick.firstMsg, last: pick.lastMsg,
  };
  const avg = Object.fromEntries(people.map((p) => {
    const t = turns[p];
    return [p, t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0];
  }));
  // How each person's turns spread: the usual turn (the middle one, the lower of two), how
  // often it's a single bubble, how often 6 or more, and the share in each of 1, 2, 3, 4-5, 6+.
  const bucket = (n) => (n >= 6 ? 4 : n >= 4 ? 3 : n - 1);
  const shape = Object.fromEntries(people.map((p) => {
    const t = turns[p].slice().sort((a, b) => a - b), n = t.length;
    if (!n) return [p, { usual: 0, single: 0, burst: 0, dist: [0, 0, 0, 0, 0], type: 'normal' }];
    const d = [0, 0, 0, 0, 0];
    for (const x of t) d[bucket(x)]++;
    const pc = (c) => Math.round((c / n) * 100);
    const sh = { usual: t[Math.floor((n - 1) / 2)], single: pc(d[0]), burst: pc(d[4]), dist: d.map(pc) };
    return [p, { ...sh, type: texterType(sh) }];
  }));
  // Twenty of each person's real turns, in proportion to how they text: each length band
  // (1, 2, 3, 4-5, 6+) gets its share of the twenty (largest remainder), picked evenly from
  // that band's turns, then put back in chat order. Fewer than twenty: all of them.
  const typical = (t, k = 20) => {
    if (t.length <= k) return t.slice();
    const bands = [[], [], [], [], []];
    t.forEach((n, i) => bands[bucket(n)].push(i));
    const exact = bands.map((b) => (b.length * k) / t.length), quota = exact.map(Math.floor);
    let left = k - quota.reduce((a, b) => a + b, 0);
    for (const [, b] of exact.map((x, b) => [x - quota[b], b]).sort((a, c) => c[0] - a[0])) if (left > 0) { quota[b]++; left--; }
    const from = (b, q) => Array.from({ length: q }, (_, i) => b[q === 1 ? Math.floor((b.length - 1) / 2) : Math.round((i * (b.length - 1)) / (q - 1))]);
    return bands.flatMap((b, j) => from(b, quota[j])).sort((a, b) => a - b).map((i) => t[i]);
  };
  const tape = Object.fromEntries(people.map((p) => [p, typical(turns[p])]));
  return { avg, shape, tape, longest, feature };
}

// The chat's arc: messages per week (a four-week rolling average) from the first message
// to now, its peak, its biggest cool-down, and where it is now. Timestamps only.
const WEEK = 7 * 864e5;
export function arc(msgs, now = new Date()) {
  const first = msgs[0]?.when, last = msgs.at(-1)?.when;
  if (!first || last - first < 8 * WEEK) return { eligible: false };
  const weeks = new Array(Math.max(1, Math.ceil((now - first) / WEEK))).fill(0);
  for (const m of msgs) { const i = Math.floor((m.when - first) / WEEK); if (i >= 0 && i < weeks.length) weeks[i]++; }
  const roll = weeks.map((_, i) => { const w = weeks.slice(Math.max(0, i - 3), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });
  const at = (i) => new Date(+first + i * WEEK);
  // The peak is the last week the pace was at its highest, so a long plateau counts from its end.
  const pk = roll.lastIndexOf(Math.max(...roll)), peak = roll[pk];
  let hi = 0, drop = { d: -1, hi: 0, lo: 0 };
  // The cool-down is measured up to the last message: the silence after it is "gone quiet", not more fall.
  const lastWeek = Math.floor((last - first) / WEEK);
  roll.slice(0, lastWeek + 1).forEach((v, i) => { if (v > roll[hi]) hi = i; if (roll[hi] - v > drop.d) drop = { d: roll[hi] - v, hi, lo: i }; });
  const cur = roll.at(-1), prev = roll[Math.max(0, roll.length - 5)], share = cur / peak, trend = prev ? cur / prev : 1;
  const phase = now - last > 30 * 864e5 ? 'quiet' : share > 0.8 ? 'peak' : trend > 1.3 ? 'warming' : trend < 0.7 ? 'cooling' : share > 0.4 ? 'steady' : 'simmer';
  // The temperature: on heat at half the peak pace or more, room temperature down to 15%,
  // ice cold below that or after a month of silence.
  const silentDays = Math.round((now - last) / 864e5);
  const temp = phase === 'quiet' || share < 0.15 ? 'cold' : share >= 0.5 ? 'hot' : 'room';
  // Any length fits the same strip: at most 52 bars, each the average of its weeks, scaled to the tallest.
  const n = Math.min(52, roll.length), size = roll.length / n;
  const raw = Array.from({ length: n }, (_, b) => { const w = roll.slice(Math.floor(b * size), Math.floor((b + 1) * size)); return w.reduce((a, c) => a + c, 0) / (w.length || 1); });
  const top = Math.max(...raw) || 1;
  return {
    eligible: true, start: first, bars: raw.map((v) => v / top), peakBar: Math.min(n - 1, Math.floor(pk / size)),
    peak: { week: at(pk), perWeek: Math.round(peak) },
    // A dip of under a quarter of the peak isn't a cool-down, just a week off.
    drop: drop.d >= peak / 4 ? { from: at(drop.hi), to: at(drop.lo), weeks: drop.lo - drop.hi } : null,
    now: { phase, temp, perWeek: Math.round(cur), dropPct: Math.round((1 - cur / peak) * 100), weeksSincePeak: roll.length - 1 - pk, silentDays },
  };
}

// The comebacks: every silence of two weeks or more, who broke it, and the longest one. The
// list keeps the twelve longest silences, in chat order, for the slide's bars. Needs eight
// weeks of chat, like the arc.
export function comebacks(msgs, pair) {
  const m = msgs.filter((x) => pair.includes(x.who));
  const first = m[0]?.when, last = m.at(-1)?.when;
  if (!first || last - first < 8 * WEEK) return { eligible: false };
  const by = Object.fromEntries(pair.map((p) => [p, 0])), all = [];
  let longest = null, longestGap = 0;
  for (let i = 1; i < m.length; i++) {
    const gap = m[i].when - m[i - 1].when, days = Math.round(gap / 864e5);
    longestGap = Math.max(longestGap, days);
    if (gap < 14 * 864e5) continue;
    by[m[i].who]++;
    all.push({ days, who: m[i].who, from: m[i - 1].when });
    if (!longest || days > longest.days) longest = { days, from: m[i - 1].when, to: m[i].when, who: m[i].who };
  }
  const keep = new Set(all.slice().sort((a, b) => b.days - a.days).slice(0, 12));
  return { eligible: true, count: all.length, by, longest, longestGap, silences: all.filter((x) => keep.has(x)) };
}

export function stats(all, now = new Date()) {
  const count = {};
  for (const m of all) count[m.who] = (count[m.who] || 0) + 1;
  const people = top(count, 2);
  const msgs = all.filter((m) => people.includes(m.who));
  const [A, B = '—'] = people;
  const pair = [A, B];

  const days = {};
  for (const m of msgs) { const k = dayKey(m.when); days[k] = (days[k] || 0) + 1; }
  const dk = Object.keys(days).sort();

  const hours = new Array(24).fill(0);
  for (const m of msgs) hours[m.when.getHours()]++;
  const quiet = quietHours(msgs, pair);
  const convs = conversations(msgs, quiet);

  // Word counts live in prototype-free objects: a chat that says "constructor" must not
  // find Object's own property there.
  const bag = () => Object.create(null);
  const emo = { [A]: {}, [B]: {} }, words = { [A]: bag(), [B]: bag() }, spelling = bag(), sorry = { [A]: 0, [B]: 0 }, love = { [A]: 0, [B]: 0 };
  const names = new Set(pair.join(' ').toLowerCase().split(/\s+/));
  const sorryFirst = {};
  for (const m of msgs) {
    if (m.media || m.deleted) continue;
    for (const g of graphemes(m.text)) {
      if (PICT.test(g)) { const e = g.replace(/️/g, ''); emo[m.who][e] = (emo[m.who][e] || 0) + 1; }
    }
    if (SORRY.test(m.text)) { sorry[m.who]++; sorryFirst[m.who] ??= m; }
    if (LOVE.test(m.text)) love[m.who]++;
    for (const w of m.text.toLowerCase().match(/[\p{L}']{3,}/gu) || []) {
      // Stretched spellings count as one word: "ohhh" and "ohhhh", "okiee" and "okie". A
      // stretched filler ("tapiii") is still a filler, but a stretched two-letter "oh" is voice.
      const k = w.replace(/(.)\1+/gu, '$1');
      if (STOP.has(w) || (k.length > 2 && STOP.has(k)) || names.has(w) || LAUGH.test(w) || !words[m.who]) continue;
      words[m.who][k] = (words[m.who][k] || 0) + 1;
      const sp = (spelling[k] ??= bag());
      sp[w] = (sp[w] || 0) + 1;
    }
  }
  const spelled = (k) => Object.keys(spelling[k]).sort((a, b) => spelling[k][b] - spelling[k][a])[0];

  // The first real message, and up to four more text messages from the opening conversation,
  // for the chat scene.
  const first = msgs.find((m) => !m.media && !m.deleted && m.text.trim()) || msgs[0];
  const opening = convs.find((c) => c.includes(first)) || [first];
  const firstReplies = opening.slice(opening.indexOf(first) + 1).filter((m) => !m.media && !m.deleted && m.text.trim()).slice(0, 4);
  // The very first reply: the other person's first message after it, and how long it took.
  const reply = msgs.slice(msgs.indexOf(first) + 1).find((m) => m.who !== first.who);
  const firstWait = reply ? { who: reply.who, mins: Math.round((reply.when - first.when) / 6e4) } : null;

  const busy = dk.reduce((b, k) => (days[k] > days[b] ? k : b), dk[0]);
  const streak = longestStreak(dk);

  return {
    A, B, group: Object.keys(count).length > 2, total: msgs.length, count,
    pace: pace(msgs, dk, now),
    days: dk.length, dayKeys: dk, first, firstReplies, firstWait, firstDate: msgs[0].when,
    // A streak that reaches today or yesterday is still going.
    streak: streak.days, streakStart: keyDate(streak.startKey), streakEnd: keyDate(streak.endKey),
    streakNow: [dayKey(now), dayKey(new Date(now - 864e5))].includes(streak.endKey),
    ft: firstTexter(msgs, pair, quiet),
    hours, peak: hours.indexOf(Math.max(...hours)),
    late: msgs.filter((m) => m.when.getHours() < 4).length,
    emo: { [A]: top(emo[A], 5), [B]: top(emo[B], 5) },
    emoN: { [A]: top(emo[A], 5).map((e) => emo[A][e]), [B]: top(emo[B], 5).map((e) => emo[B][e]) },
    emoVs: emojiVs(emo, count, pair),
    words: Object.fromEntries(pair.map((p) => [p, (signatureWords(words, pair)[p] || []).map(spelled)])), sorry, love, sorryFirst,
    reply: replySpeed(msgs, pair, quiet),
    convo: convoStats(convs, pair),
    goodnight: goodnightFirst(msgs, pair),
    carried: carriedNights(msgs, quiet),
    carriedEx: carriedExample(msgs, quiet),
    talk: (() => { const tk = talker(msgs, pair); return { ...tk, roles: talkRoles(count, tk, pair) }; })(),
    bubbles: bubbles(msgs, pair),
    busy, busyN: days[busy],
    media: msgs.filter((m) => m.media).length,
    arc: arc(msgs, now),
    comebacks: comebacks(msgs, pair),
  };
}
