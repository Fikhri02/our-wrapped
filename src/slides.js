// Each slide: a palette and a render(stats) → HTML string. All copy comes from i18n.js.
import { esc, fmtDate, fmtDay, formatReply, hourLabel, nf } from './format.js';
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
const count = (n, suffix = '') => `<span data-count="${n}" data-suffix="${suffix}">${nf(n)}${suffix}</span>`;

const frame = (kicker, body, foot) =>
  `<div class="k">${kicker}</div><div>${body}</div><div class="foot">${foot}</div>`;

export const SLIDES = [
  { id: 'intro', pal: 'plum', render: (S) => frame('Our Wrapped',
    `<div class="big">${count(S.total)}</div><div class="line">${t('introLine', esc(S.A), esc(S.B), S.days)}</div>`,
    S.range ? t('rangeFrom', esc(S.range), fmtDate(S.firstDate)) : t('since', fmtDate(S.firstDate))) },

  { id: 'first', pal: 'lemon', render: (S) => frame(S.range ? t('rangeFirst', esc(S.range)) : t('whereStarted'),
    `<div class="quote">“${esc(S.first.text.slice(0, 140))}”</div><div class="line">${esc(S.first.who)}, ${fmtDate(S.first.when)}, ${hourLabel(S.first.when.getHours())}</div>`,
    t('messageOf', nf(S.total))) },

  { id: 'share', pal: 'pink', render: (S) => {
    const a = S.count[S.A], b = S.count[S.B] || 0, pa = Math.round((a / (a + b)) * 100);
    const [w, l] = pa >= 50 ? [S.A, S.B] : [S.B, S.A];
    const tk = S.talk;
    const row = (label, x, y) => `<div class="tr"><span>${label}</span><b>${nf(x)}</b><b>${nf(y)}</b></div>`;
    const wordier = tk.avg[l] > tk.avg[w];
    return frame(t('talker'),
      `<div class="mid">${Math.abs(pa - 50) <= 5 ? t('matched') : t('carries', esc(w))}</div>
       <div class="big">${count(Math.max(pa, 100 - pa), '%')}</div>
       <div class="split"><div style="width:${pa}%;background:#1a0612;color:#ff4f9a">${esc(S.A)}</div><div style="flex:1;background:#ffd0e3;color:#1a0612">${esc(S.B)}</div></div>
       <div class="tally"><div class="tr th"><span></span><b>${esc(S.A)}</b><b>${esc(S.B)}</b></div>
         ${row(t('rowMessages'), a, b)}${row(t('rowWords'), tk.words[S.A], tk.words[S.B])}${row(t('rowDoubles'), tk.doubles[S.A], tk.doubles[S.B])}</div>`,
      wordier ? t('fewerLonger', esc(l), tk.avg[l].toFixed(1)) : t('alsoLonger', esc(w), tk.avg[w].toFixed(1)));
  } },

  { id: 'morning', pal: 'tang', render: (S) => {
    const w = S.ft[S.A] >= S.ft[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    return frame(t('firstThought'),
      `<div class="big">${count(S.ft[w])}</div><div class="line">${t('mornings', esc(w), esc(l), S.ft[l])}</div>`,
      t('morningFoot'));
  } },

  { id: 'night', pal: 'cobalt', render: (S) => {
    const mx = Math.max(...S.hours) || 1;
    const bars = S.hours.map((v, h) => `<i style="--i:${h};height:${Math.max(2, (v / mx) * 100)}%;background:${h < 4 || h >= 22 ? '#ffe14d' : '#ffffff88'}"></i>`).join('');
    return frame(t('nightOwls'),
      `<div class="mid">${t('afterMidnight', nf(S.late))}</div><div class="hours">${bars}</div>
       <div class="hours-x"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>`,
      t('busiestHour', hourLabel(S.peak)));
  } },

  { id: 'streak', pal: 'mint', render: (S) => frame(t('streak'),
    `<div class="big">${count(S.streak)}</div><div class="line">${t('streakLine')}</div>`,
    t('ended', fmtDate(S.streakEnd))) },

  { id: 'emoji', pal: 'lemon', render: (S) => frame(t('emojiKicker'),
    `<div class="mid">${t('tenFaces')}</div><div class="emo"><div>${esc(S.A)}<div class="e">${S.emo[S.A].join('') || '—'}</div></div><div>${esc(S.B)}<div class="e">${S.emo[S.B].join('') || '—'}</div></div></div>`,
    t('emojiFoot')) },

  { id: 'reply', pal: 'pink', render: (S) => {
    const r = S.reply, A = r[S.A], B = r[S.B];
    const fast = (A.median ?? Infinity) <= (B.median ?? Infinity) ? S.A : S.B;
    const slow = fast === S.A ? S.B : S.A;
    return frame(t('replyKicker'),
      `<div class="mid">${t('repliesFaster', esc(fast))}</div>
       <div class="vs"><div><span>${esc(S.A)}</span><span>${formatReply(A.median, r.precise)}</span></div><div><span>${esc(S.B)}</span><span>${formatReply(B.median, r.precise)}</span></div></div>
       <div class="line">${t('replyLine', esc(fast), r[fast].within5, esc(slow), r[slow].leftOnRead)}</div>`,
      esc(r.precise ? t('replyPrecise') : t('replyMinutes')));
  } },

  { id: 'sorry', pal: 'plum', render: (S) => {
    const w = S.sorry[S.A] >= S.sorry[S.B] ? S.A : S.B;
    return frame(t('apologies'),
      `<div class="mid">${t('saidSorry', esc(w), S.sorry[w])}</div><div class="line">${S.sorryFirst ? t('firstSorry', esc(S.sorryFirst.text.slice(0, 70))) : t('noSorry')}</div>`,
      `${esc(S.A)} ${S.sorry[S.A]} · ${esc(S.B)} ${S.sorry[S.B]}`);
  } },

  { id: 'love', pal: 'tang', render: (S) => frame(t('loveKicker'),
    `<div class="big">${count(S.love[S.A] + S.love[S.B])}</div><div class="line">${t('loveLine', esc(S.A), S.love[S.A], esc(S.B), S.love[S.B])}</div>`,
    t('loveFoot')) },

  { id: 'words', pal: 'mint', render: (S) => frame(t('vocab'),
    `<div class="mid">${t('yourWords')}</div><div class="words">${S.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>`,
    t('wordsFoot')) },

  { id: 'busy', pal: 'cobalt', render: (S) => frame(t('loudest'),
    `<div class="mid">${fmtDay(S.busy)}</div><div class="big" style="margin-top:10px">${count(S.busyN)}</div><div class="line">${t('loudLine')}</div>`,
    t('stillWriting', nf(S.total))) },
];

// The last slide: a message the sender types before playing.
export const closingSlide = (note, signed) => ({
  id: 'closing', pal: 'plum',
  render: () => frame(t('oneMore'),
    `<div class="quote note">${esc(note).replace(/\n/g, '<br>')}</div>`,
    signed ? t('withLoveFrom', esc(signed)) : t('withLove')),
});
