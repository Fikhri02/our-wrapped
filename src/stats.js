// One pure function per slide's data. stats() bundles them for the player.

const STOP = new Set(
  "the and you for that this with are was but not have just what yes okay its it's can will dah tak nak ada yang ini itu kat dengan untuk lagi pun tu ni la lah je jer kan ke dia aku saya you i me my your we our ok oke haha hahaha hahahaha omitted media deleted message was too lol kau so dont don't then them they how why when who where tengah boleh nanti esok tadi".split(' '),
);
const SORRY = /\b(sorry|sori|sory|sry|soz|maaf|mianhae)\b/i;
const LOVE = /\b(love you|love u|luv u|ily|sayang you|sayang u|rindu|miss you|miss u)\b|❤|🥰|😘/i;
const PICT = /\p{Extended_Pictographic}/u;
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const graphemes = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
const top = (obj, n) => Object.keys(obj).sort((a, b) => obj[b] - obj[a]).slice(0, n);

export function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export function firstTexter(msgs, people) {
  const seen = new Set();
  const tally = Object.fromEntries(people.map((p) => [p, 0]));
  for (const m of msgs) {
    if (m.when.getHours() < 5) continue;
    const k = dayKey(m.when);
    if (seen.has(k)) continue;
    seen.add(k);
    tally[m.who]++;
  }
  return tally;
}

export function longestStreak(dayKeys) {
  const nums = dayKeys.map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 864e5;
  });
  let best = 1, cur = 1, end = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] - nums[i - 1] === 1) {
      cur++;
      if (cur > best) { best = cur; end = nums[i]; }
    } else cur = 1;
  }
  return { days: best, end: new Date(end * 864e5) };
}

// Reply speed per person: gaps where the sender changes. Gaps of 6h+ count as a new
// conversation, not a reply. Android exports have minute precision only, so `precise`
// tells the slide whether sub-minute numbers mean anything.
export function replySpeed(msgs, people) {
  const gaps = Object.fromEntries(people.map((p) => [p, []]));
  for (let j = 1; j < msgs.length; j++) {
    const p = msgs[j - 1], q = msgs[j];
    if (p.who === q.who || !gaps[q.who]) continue;
    const gap = (q.when - p.when) / 6e4;
    if (gap >= 0 && gap < 360) gaps[q.who].push(gap);
  }
  const out = { precise: msgs.some((m) => m.when.getSeconds() !== 0) };
  for (const p of people) {
    const g = gaps[p];
    out[p] = {
      median: median(g),
      within5: g.length ? Math.round((g.filter((x) => x <= 5).length / g.length) * 100) : 0,
      leftOnRead: g.filter((x) => x >= 60).length,
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

export function stats(all) {
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

  const emo = { [A]: {}, [B]: {} }, words = {}, sorry = { [A]: 0, [B]: 0 }, love = { [A]: 0, [B]: 0 };
  const names = new Set(pair.join(' ').toLowerCase().split(/\s+/));
  let sorryFirst = null;
  for (const m of msgs) {
    if (m.media || m.deleted) continue;
    for (const g of graphemes(m.text)) {
      if (PICT.test(g)) { const e = g.replace(/️/g, ''); emo[m.who][e] = (emo[m.who][e] || 0) + 1; }
    }
    if (SORRY.test(m.text)) { sorry[m.who]++; sorryFirst ??= m; }
    if (LOVE.test(m.text)) love[m.who]++;
    for (const w of m.text.toLowerCase().match(/[\p{L}']{3,}/gu) || []) {
      if (!STOP.has(w) && !names.has(w)) words[w] = (words[w] || 0) + 1;
    }
  }

  const busy = dk.reduce((b, k) => (days[k] > days[b] ? k : b), dk[0]);
  const streak = longestStreak(dk);

  return {
    A, B, group: Object.keys(count).length > 2, total: msgs.length, count,
    days: dk.length, first: msgs[0], firstDate: msgs[0].when,
    streak: streak.days, streakEnd: streak.end,
    ft: firstTexter(msgs, pair),
    hours, peak: hours.indexOf(Math.max(...hours)),
    late: msgs.filter((m) => m.when.getHours() < 4).length,
    emo: { [A]: top(emo[A], 5), [B]: top(emo[B], 5) },
    words: top(words, 6), sorry, love, sorryFirst,
    reply: replySpeed(msgs, pair),
    talk: talker(msgs, pair),
    busy, busyN: days[busy],
    media: msgs.filter((m) => m.media).length,
  };
}
