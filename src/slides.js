// Each slide: a palette, a render(stats) → HTML string, and optionally skip(stats) for
// when it has nothing to show. All copy comes from i18n.js.
import { esc, fmtDate, fmtDay, fmtRange, formatReply, hourLabel, nf } from './format.js';
import { t } from './i18n.js';

export const PALETTES = {
  pink: ['#ff4f9a', '#1a0612'],
  lemon: ['#ffe14d', '#241a00'],
  cobalt: ['#2f4bff', '#ffffff'],
  mint: ['#3ee6b0', '#05231a'],
  plum: ['#2a1233', '#ffd6ec'],
  tang: ['#ff7a3d', '#200800'],
};

// A number the player counts up from 0 on entrance.
const count = (n, suffix = '', dec = 0) =>
  `<span data-count="${n}" data-suffix="${suffix}" data-dec="${dec}">${dec ? n.toFixed(dec) : nf(n)}${suffix}</span>`;

const frame = (kicker, body, foot) =>
  `<div class="k">${kicker}</div><div>${body}</div><div class="foot">${foot}</div>`;

// Under the total: how much you talk on a day you talk, how often you talk, and what that
// says about you two. A new chat (under a month, whole chat only) gets its own line.
function paceBlock(S) {
  const p = S.pace;
  if (!p) return '';
  const fresh = p.isNew && !S.range;
  const stat = fresh ? t('paceTurns', p.turns) : t('paceStat', p.turns, p.share);
  const tense = p.past ? '_past' : ''; // a chat that's gone quiet for over a week
  const remark = !fresh ? t(`pace_${p.kind}${tense}`) : S.days === p.span ? t(`paceNewEvery${tense}`, p.span) : t(`paceNewSome${tense}`, p.span, S.days);
  return `<div class="pace"><div class="pace-stat">${stat}</div><div class="pace-remark">${remark}</div></div>`;
}

export const SLIDES = [
  { id: 'intro', pal: 'plum', render: (S) => frame('Our Wrapped',
    `<div class="big">${count(S.total)}</div><div class="line">${t('introLine', esc(S.A), esc(S.B), S.days)}</div>${paceBlock(S)}`,
    S.range ? t('rangeFrom', esc(S.range), fmtDate(S.firstDate)) : t('since', fmtDate(S.firstDate))) },

  { id: 'first', pal: 'lemon', render: (S) => frame(S.range ? t('rangeFirst', esc(S.range)) : t('whereStarted'),
    `<div class="quote">“${esc(S.first.text.slice(0, 140))}”</div><div class="line">${esc(S.first.who)}, ${fmtDate(S.first.when)}, ${hourLabel(S.first.when.getHours())}</div>`,
    t('messageOf', nf(S.total))) },

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
      t('morningFoot'));
  } },

  { id: 'starts', pal: 'mint', render: (S) => {
    const c = S.convo;
    const w = c.starts[S.A] >= c.starts[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    const g = S.goodnight, bye = g[S.A] >= g[S.B] ? S.A : S.B;
    // A goodnight claim needs a few nights behind it.
    const foot = g[bye] < 3 ? t('startsFoot') : g[S.A] === g[S.B] ? t('goodnightTie') : t('signOffFoot', esc(bye), g[bye]);
    return frame(t('startsKicker'),
      `<div class="big">${count(c.starts[w])}</div><div class="line">${t('startsLine', esc(w), esc(l), c.starts[l])}</div>`,
      foot);
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
    t('carriedFoot', Math.max(1, Math.round((S.carried / S.days) * 100)))) },

  { id: 'streak', pal: 'mint', render: (S) => frame(t('streak'),
    `<div class="big">${count(S.streak)}</div><div class="line">${t('streakLine')}</div>
     <div class="mid streak-range">${S.streakNow ? t('streakToday', fmtDate(S.streakStart)) : fmtRange(S.streakStart, S.streakEnd)}</div>`,
    t('streakVibe', S.streak, S.streakNow)) },

  { id: 'emoji', pal: 'lemon', skip: (S) => !S.emo[S.A].length && !S.emo[S.B].length, render: (S) => frame(t('emojiKicker'),
    `<div class="mid">${t('tenFaces')}</div><div class="emo"><div>${esc(S.A)}<div class="e">${S.emo[S.A].join('') || '—'}</div></div><div>${esc(S.B)}<div class="e">${S.emo[S.B].join('') || '—'}</div></div></div>`,
    t('emojiFoot')) },

  { id: 'reply', pal: 'pink', render: (S) => {
    const r = S.reply, A = r[S.A], B = r[S.B];
    // Minute-precision exports make the median 0 for everyone, so rank by the share
    // of replies inside a minute, then by the average.
    const fast = A.within1 !== B.within1 ? (A.within1 > B.within1 ? S.A : S.B) : ((A.mean ?? Infinity) <= (B.mean ?? Infinity) ? S.A : S.B);
    const slow = fast === S.A ? S.B : S.A;
    return frame(t('replyKicker'),
      `<div class="mid">${t('repliesFaster', esc(fast))}</div>
       <div class="vs"><div><span>${esc(S.A)}</span><span>${A.within1}%</span></div><div><span>${esc(S.B)}</span><span>${B.within1}%</span></div></div>
       <div class="line">${t('replyLine', esc(fast), r[fast].within1, formatReply(r[fast].mean, r.precise), esc(slow), r[slow].slow)}</div>`,
      t('replyFoot'));
  } },

  { id: 'sorry', pal: 'plum', render: (S) => {
    const w = S.sorry[S.A] >= S.sorry[S.B] ? S.A : S.B;
    return frame(t('apologies'),
      `<div class="mid">${t('saidSorry', esc(w), S.sorry[w])}</div><div class="line">${S.sorryFirst[w] ? t('firstSorry', esc(S.sorryFirst[w].text.slice(0, 70))) : t('noSorry')}</div>`,
      `${esc(S.A)} ${S.sorry[S.A]} · ${esc(S.B)} ${S.sorry[S.B]}`);
  } },

  { id: 'love', pal: 'tang', skip: (S) => !(S.love[S.A] + S.love[S.B]), render: (S) => frame(t('loveKicker'),
    `<div class="big">${count(S.love[S.A] + S.love[S.B])}</div><div class="line">${t('loveLine', esc(S.A), S.love[S.A], esc(S.B), S.love[S.B])}</div>`,
    t('loveFoot')) },

  { id: 'words', pal: 'mint', skip: (S) => !S.words[S.A].length && !S.words[S.B].length, render: (S) => frame(t('vocab'),
    `<div class="mid">${t('yourWords')}</div>
     <div class="wcols">${[S.A, S.B].map((p) => `<div><div class="wname">${esc(p)}</div><div class="words">${S.words[p].map((w) => `<span>${esc(w)}</span>`).join('') || '—'}</div></div>`).join('')}</div>`,
    t('wordsFoot')) },

  { id: 'busy', pal: 'cobalt', render: (S) => frame(t('loudest'),
    `<div class="mid">${fmtDay(S.busy)}</div><div class="big" style="margin-top:10px">${count(S.busyN)}</div><div class="line">${t('loudLine')}</div>
     <button type="button" class="slide-act" data-act="chat">${t('chatButton')}</button>`,
    t('stillWriting', nf(S.total))) },
];

export const slidesFor = (S) => SLIDES.filter((s) => !s.skip?.(S));

// The last slide: a message the sender types before playing.
export const closingSlide = (note, signed) => ({
  id: 'closing', pal: 'plum',
  render: () => frame(t('oneMore'),
    `<div class="quote note">${esc(note).replace(/\n/g, '<br>')}</div>`,
    signed ? t('withLoveFrom', esc(signed)) : t('withLove')),
});
