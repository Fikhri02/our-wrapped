// Each slide: a palette, a render(stats) → HTML string, and optionally skip(stats) for
// when it has nothing to show. All copy comes from i18n.js.
import { clock, compact, esc, fmtDate, fmtDay, fmtRange, formatReply, hourLabel, nf } from './format.js';
import { t } from './i18n.js';

// [background, ink, tone]: the tone is a neighbour's colour, for the bubble shapes.
export const PALETTES = {
  pink: ['#ff4f9a', '#1a0612', '#ffe14d'],
  lemon: ['#ffe14d', '#241a00', '#ff4f9a'],
  cobalt: ['#2f4bff', '#ffffff', '#ffe14d'],
  mint: ['#3ee6b0', '#05231a', '#2f4bff'],
  plum: ['#2a1233', '#ffd6ec', '#ff4f9a'],
  tang: ['#ff7a3d', '#200800', '#2a1233'],
};

// Paints a card in a slide's palette. The tone colours the decorative bubbles.
export function paint(card, pal) {
  const [bg, fg, tone] = PALETTES[pal];
  card.style.background = bg;
  card.style.color = fg;
  card.style.setProperty('--tone', tone);
  card.style.setProperty('--bg', bg);
  card.style.setProperty('--fg', fg);
}

// A number the player counts up from 0 on entrance.
const count = (n, suffix = '', dec = 0) =>
  `<span data-count="${n}" data-suffix="${suffix}" data-dec="${dec}">${dec ? n.toFixed(dec) : nf(n)}${suffix}</span>`;

// Every slide: an optional decoration layer behind, then kicker, body and footer.
const frame = (kicker, body, foot, deco = '') =>
  `${deco}<div class="k">${kicker}</div><div class="body">${body}</div><div class="foot">${foot}</div>`;

// Text hidden for a saved image: dots in place of the words, roughly as long as the original,
// so the bubble keeps its shape without saying anything.
const hidden = (text) => Array(Math.max(1, Math.min(5, Math.round(text.length / 14)))).fill('•••').join(' ');

// Counting strips the emoji presentation selector, so a lone ❤ would draw as a black text
// heart. Put it back for display on single-symbol emoji.
const asEmoji = (e) => ([...e].length === 1 ? `${e}\uFE0F` : e);

// Decorative chat bubbles in the slide's tone, for slides with room to spare. The same two
// shapes in a few placements, so slides feel related without repeating exactly.
const decor = (v) => `<div class="decor decor-${v}" aria-hidden="true"><i></i><i></i></div>`;

// The streak as a calendar: Monday-first weeks around it, its days filled, its ends ringed,
// other days you talked shown faintly. Long streaks (over ten weeks) skip the calendar.
function streakCal(S) {
  const day = 864e5, start = S.streakStart, end = S.streakEnd;
  if ((end - start) / day > 70) return '';
  const from = new Date(start); from.setDate(from.getDate() - 3); from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = new Date(end); to.setDate(to.getDate() + 3); to.setDate(to.getDate() + (6 - ((to.getDay() + 6) % 7)));
  const talked = new Set(S.dayKeys || []), key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let cells = '', n = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const inRun = d >= start && d <= end, edge = +d === +start || +d === +end;
    cells += `<i class="${inRun ? 'on' : talked.has(key(d)) ? 'seen' : ''}${edge ? ' edge' : ''}" style="--i:${inRun ? n++ : 0}"></i>`;
  }
  return `<div class="cal-wd">${t('weekdays').split(' ').map((w) => `<span>${w}</span>`).join('')}</div><div class="cal">${cells}</div>`;
}

// Under the total: how much you talk on a day you talk, how often you talk, and what that
// says about you two. A new chat (under a month, whole chat only) gets its own line.
function paceRemark(S) {
  const p = S.pace, fresh = p.isNew && !S.range;
  const tense = p.past ? '_past' : ''; // a chat that's gone quiet for over a week
  return !fresh ? t(`pace_${p.kind}${tense}`) : S.days === p.span ? t(`paceNewEvery${tense}`, p.span) : t(`paceNewSome${tense}`, p.span, S.days);
}
function paceBlock(S) {
  const p = S.pace;
  if (!p) return '';
  const stat = p.isNew && !S.range ? t('paceTurns', p.turns) : t('paceStat', p.turns, p.share);
  return `<div class="pace"><div class="pace-stat">${stat}</div><div class="pace-remark">${paceRemark(S)}</div></div>`;
}

export const SLIDES = [
  { id: 'intro', pal: 'plum', render: (S) => frame('Our Wrapped',
    `<div class="big hero">${count(S.total)}</div><div class="line">${t('introLine', esc(S.A), esc(S.B), S.days)}</div>${paceBlock(S)}`,
    S.range ? t('rangeFrom', esc(S.range), fmtDate(S.firstDate)) : t('since', fmtDate(S.firstDate)), decor('hero')) },

  // The first message as a real chat: a date chip, the bubble with its time and ticks, and
  // up to two replies from the next hour.
  { id: 'first', pal: 'lemon', render: (S) => {
    const lead = S.first.who;
    const text = (m, i) => (S.hide?.first ? hidden(m.text) : esc(m.text.slice(0, i ? 70 : 140)));
    const bubble = (m, i) => `<div class="cb ${m.who === lead ? 'l' : 'r'}${i ? '' : ' lead'}" style="--i:${i}">${text(m, i)}<small>${clock(m.when)}${i ? '' : ' ✓✓'}</small></div>`;
    return frame(S.range ? t('rangeFirst', esc(S.range)) : t('whereStarted'),
      `<div class="scene"><div class="date-chip">${fmtDate(S.first.when)}</div><div class="cb-who">${esc(lead)}</div>${[S.first, ...(S.firstReplies || [])].map(bubble).join('')}</div>`,
      t('messageOf', nf(S.total)));
  } },

  { id: 'share', pal: 'pink', render: (S) => {
    const a = S.count[S.A], b = S.count[S.B] || 0, pa = Math.round((a / (a + b)) * 100);
    const [w, l] = pa >= 50 ? [S.A, S.B] : [S.B, S.A];
    const tk = S.talk, past = !!S.pace?.past;
    const row = (label, x, y) => `<div class="tr"><span>${label}</span><b>${nf(x)}</b><b>${nf(y)}</b></div>`;
    return frame(t('talker'),
      `<div class="mid">${!tk.roles.talker ? t('matched') : t(past ? 'carriesPast' : 'carries', esc(w))}</div>
       <div class="big">${count(Math.max(pa, 100 - pa), '%')}</div>
       <div class="line roles">${t('rolesLine', tk.roles, esc(S.A), esc(S.B), past)}</div>
       <div class="split"><div style="width:${pa}%;background:#1a0612;color:#ff4f9a">${esc(S.A)}</div><div style="flex:1;background:#ffd0e3;color:#1a0612">${esc(S.B)}</div></div>
       <div class="tally"><div class="tr th"><span></span><b>${esc(S.A)}</b><b>${esc(S.B)}</b></div>
         ${row(t('rowMessages'), a, b)}${row(t('rowWords'), tk.words[S.A], tk.words[S.B])}${row(t('rowDoubles'), tk.doubles[S.A], tk.doubles[S.B])}</div>`,
      t('rolesKey'));
  } },

  { id: 'bubble', pal: 'lemon', render: (S) => {
    const { avg, feature: f } = S.bubbles;
    const w = avg[S.A] >= avg[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    const x = Math.round(avg[w] * 10) / 10;
    // Roast only when it's earned: 3+ bubbles a turn, or half again as many as the other.
    const roast = x >= 3 || avg[w] >= avg[l] * 1.5;
    const stack = Array.from({ length: Math.min(8, Math.max(1, Math.round(x))) }, (_, i) =>
      `<i style="--i:${i};width:${[62, 84, 48, 76, 56, 90, 44, 70][i]}%"></i>`).join('');
    return frame(t('bubbleKicker'),
      `<div class="bubbles" aria-hidden="true">${stack}</div>
       <div class="big">${count(x, '', 1)}</div>
       <div class="line">${x < 1.5 ? t('bubbleBoth') : roast ? t('bubbleRoast', esc(w), x.toFixed(1)) : t('bubbleEven', esc(w), x.toFixed(1), esc(l))}</div>
       <div class="vs"><div><span>${esc(S.A)}</span><span>${avg[S.A].toFixed(1)}</span></div><div><span>${esc(S.B)}</span><span>${avg[S.B].toFixed(1)}</span></div></div>
       ${f ? `<div class="line burst">${f.kind === 'rant' ? t('burstRant', esc(f.who), f.n, nf(f.words), fmtDate(f.start))
         : f.kind === 'spree' ? t('burstSpree', esc(f.who), f.n, fmtDate(f.start)) : t('burstNormal', esc(f.who), f.n)}</div>` : ''}
       ${f?.kind === 'rant' ? `<button type="button" class="slide-act" data-act="rant">${t('rantButton')}</button>` : ''}`,
      t('bubbleKey'));
  } },

  { id: 'morning', pal: 'tang', render: (S) => {
    const w = S.ft[S.A] >= S.ft[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    return frame(t('firstThought'),
      `<div class="big">${count(S.ft[w])}</div><div class="line">${t('mornings', esc(w), esc(l), S.ft[l])}</div>`,
      t('morningFoot'), decor('a'));
  } },

  { id: 'starts', pal: 'mint', render: (S) => {
    const c = S.convo;
    const w = c.starts[S.A] >= c.starts[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    const g = S.goodnight, bye = g[S.A] >= g[S.B] ? S.A : S.B;
    // A goodnight claim needs a few nights behind it.
    const foot = g[bye] < 3 ? t('startsFoot') : g[S.A] === g[S.B] ? t('goodnightTie') : t('signOffFoot', esc(bye), g[bye]);
    return frame(t('startsKicker'),
      `<div class="big">${count(c.starts[w])}</div><div class="line">${t('startsLine', esc(w), esc(l), c.starts[l])}</div>`,
      foot, decor('b'));
  } },

  { id: 'night', pal: 'cobalt', skip: (S) => !S.late, render: (S) => {
    const mx = Math.max(...S.hours) || 1;
    // The busiest hour is the tallest bar; it gets its hour written above it.
    const bars = S.hours.map((v, h) => `<i class="${h === S.peak ? 'peak' : ''}" style="--i:${h};height:${Math.max(2, (v / mx) * 100)}%;background:${h < 4 || h >= 22 ? '#ffe14d' : '#ffffff88'}">${h === S.peak ? `<b>${hourLabel(h)}</b>` : ''}</i>`).join('');
    return frame(t('nightOwls'),
      `<div class="mid">${t('afterMidnight', nf(S.late))}</div>
       <div class="line">${t('busiestHour', hourLabel(S.peak))}</div>
       <div class="hours">${bars}</div>
       <div class="hours-x"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>`,
      t('nightFoot'));
  } },

  { id: 'carried', pal: 'plum', skip: (S) => !S.carried, render: (S) => frame(t('carriedKicker'),
    `<div class="big">${count(S.carried)}</div><div class="line">${t('carriedLine')}</div>`,
    t('carriedFoot', Math.max(1, Math.round((S.carried / S.days) * 100))), decor('c')) },

  { id: 'streak', pal: 'mint', render: (S) => frame(t('streak'),
    `<div class="big">${count(S.streak)}</div><div class="line">${t('streakLine')}</div>
     <div class="mid streak-range">${S.streakNow ? t('streakToday', fmtDate(S.streakStart)) : fmtRange(S.streakStart, S.streakEnd)}</div>
     ${streakCal(S)}`,
    t('streakVibe', S.streak, S.streakNow)) },

  { id: 'emoji', pal: 'lemon', skip: (S) => !S.emo[S.A].length && !S.emo[S.B].length, render: (S) => frame(t('emojiKicker'),
    `<div class="mid">${t('tenFaces')}</div>
     <div class="line">${t('emojiDiff', { ...S.emoVs, hi: esc(S.emoVs.hi), lo: esc(S.emoVs.lo) }, !!S.pace?.past)}</div>
     <div class="emo">${(() => {
      // Stickers: sized by count against the biggest of both, tilted a little each.
      const max = Math.max(1, ...S.emoN[S.A], ...S.emoN[S.B]), tilt = [-10, 8, -5, 12, -8];
      return [S.A, S.B].map((p, side) => `<div>${esc(p)}<div class="e">${
        S.emo[p].map((e, i) => `<span class="ec" style="--s:${Math.round(22 + 20 * (S.emoN[p][i] / max))}px;--r:${side ? -tilt[i] : tilt[i]}deg;--i:${i * 2 + side}"><i>${asEmoji(e)}</i><b>${compact(S.emoN[p][i])}</b></span>`).join('') || '—'}</div></div>`).join('');
    })()}</div>`,
    '') },

  { id: 'reply', pal: 'pink', render: (S) => {
    const r = S.reply, A = r[S.A], B = r[S.B];
    // Minute-precision exports make the median 0 for everyone, so rank by the share
    // of replies inside a minute, then by the average.
    const fast = A.within1 !== B.within1 ? (A.within1 > B.within1 ? S.A : S.B) : ((A.mean ?? Infinity) <= (B.mean ?? Infinity) ? S.A : S.B);
    const slow = fast === S.A ? S.B : S.A;
    return frame(t('replyKicker'),
      `<div class="mid">${t('repliesFaster', esc(fast))}</div>
       <div class="lanes">${[fast, slow].map((p) => `<div class="lane"><div class="lane-who"><span>${esc(p)}</span><b>${r[p].within1}%</b></div><div class="dots">${
         Array.from({ length: 100 }, (_, i) => `<i${i < r[p].within1 ? ` class="on" style="--i:${i}"` : ''}></i>`).join('')}</div></div>`).join('')}</div>
       <div class="line">${t('replyLine', esc(fast), r[fast].within1, formatReply(r[fast].mean, r.precise), esc(slow), r[slow].slow)}</div>`,
      t('replyFoot'));
  } },

  { id: 'sorry', pal: 'plum', render: (S) => {
    const w = S.sorry[S.A] >= S.sorry[S.B] ? S.A : S.B;
    return frame(t('apologies'),
      `<div class="mid">${t('saidSorry', esc(w), S.sorry[w])}</div><div class="line">${!S.sorryFirst[w] ? t('noSorry') : S.hide?.sorry ? t('firstSorryHidden') : t('firstSorry', esc(S.sorryFirst[w].text.slice(0, 70)))}</div>`,
      `${esc(S.A)} ${S.sorry[S.A]} · ${esc(S.B)} ${S.sorry[S.B]}`, decor('a'));
  } },

  { id: 'love', pal: 'tang', skip: (S) => !(S.love[S.A] + S.love[S.B]), render: (S) => frame(t('loveKicker'),
    `<div class="big">${count(S.love[S.A] + S.love[S.B])}</div><div class="line">${t('loveLine', esc(S.A), S.love[S.A], esc(S.B), S.love[S.B])}</div>`,
    t('loveFoot'), decor('b')) },

  { id: 'words', pal: 'mint', skip: (S) => !S.words[S.A].length && !S.words[S.B].length, render: (S) => frame(t('vocab'),
    `<div class="mid">${t('yourWords')}</div>
     <div class="wcols">${[S.A, S.B].map((p, side) => `<div><div class="wname">${esc(p)}</div><div class="words ${side ? 'wb' : 'wa'}">${S.words[p].map((w, i) => `<span style="--i:${i * 2 + side}">${S.hide?.words ? '•••' : esc(w)}</span>`).join('') || '—'}</div></div>`).join('')}</div>`,
    t('wordsFoot')) },

  { id: 'busy', pal: 'cobalt', render: (S) => frame(t('loudest'),
    `<div class="mid">${fmtDay(S.busy)}</div><div class="big" style="margin-top:10px">${count(S.busyN)}</div><div class="line">${t('loudLine')}</div>
     <button type="button" class="slide-act" data-act="chat">${t('chatButton')}</button>`,
    t(S.pace?.past ? 'allWritten' : 'stillWriting', nf(S.total)), decor('c')) },

  // The keepsake: two bubbles with your initials, both names, the years, three headline
  // numbers and a line about you two. Saved without names it reads "You two".
  { id: 'finale', pal: 'plum', render: (S) => {
    const anon = S.hide?.finale, dots = '<i></i><i></i><i></i>';
    const initial = (n) => esc([...n.trim()][0]?.toUpperCase() || '?');
    const y0 = S.firstDate.getFullYear(), y1 = +(S.dayKeys?.[S.dayKeys.length - 1] || String(y0)).slice(0, 4);
    const stat = (n, label) => `<div><b>${count(n)}</b><small>${label}</small></div>`;
    return frame(t('finaleKicker', y0 === y1 ? y0 : `${y0} – ${y1}`),
      `<div class="duo" aria-hidden="true"><span class="db a">${anon ? dots : initial(S.A)}</span><span class="db b">${anon ? dots : initial(S.B)}</span></div>
       <div class="mid fnames">${anon ? t('youTwo') : `${esc(S.A)} &amp; ${esc(S.B)}`}</div>
       <div class="fstats">${stat(S.total, t('finMessages'))}${stat(S.days, t('finDays'))}${stat(S.streak, t('finStreak'))}</div>
       ${S.pace ? `<div class="line">${paceRemark(S)}</div>` : ''}`,
      t('finaleFoot'));
  } },
];

export const slidesFor = (S) => SLIDES.filter((s) => !s.skip?.(S));

// The last slide: a message the sender types before playing.
export const closingSlide = (note, signed) => ({
  id: 'closing', pal: 'plum',
  render: () => frame(t('oneMore'),
    `<div class="quote note">${esc(note).replace(/\n/g, '<br>')}</div>`,
    signed ? t('withLoveFrom', esc(signed)) : t('withLove')),
});
