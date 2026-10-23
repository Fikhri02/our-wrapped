// Each slide: a palette and a render(stats) → HTML string.
import { esc, fmtDate, fmtDay, formatReply, hourLabel, nf } from './format.js';

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
    `<div class="big">${count(S.total)}</div><div class="line">messages between ${esc(S.A)} and ${esc(S.B)}, across ${S.days} days of talking.</div>`,
    `Since ${fmtDate(S.firstDate)}`) },

  { id: 'first', pal: 'lemon', render: (S) => frame('Where it started',
    `<div class="quote">“${esc(S.first.text.slice(0, 140))}”</div><div class="line">${esc(S.first.who)}, ${fmtDate(S.first.when)}, ${hourLabel(S.first.when.getHours())}</div>`,
    `Message #1 of ${nf(S.total)}`) },

  { id: 'share', pal: 'pink', render: (S) => {
    const a = S.count[S.A], b = S.count[S.B] || 0, pa = Math.round((a / (a + b)) * 100);
    const [w, l] = pa >= 50 ? [S.A, S.B] : [S.B, S.A];
    const t = S.talk;
    const row = (label, x, y) => `<div class="tr"><span>${label}</span><b>${nf(x)}</b><b>${nf(y)}</b></div>`;
    const wordier = t.avg[l] > t.avg[w];
    return frame('The talker',
      `<div class="mid">${Math.abs(pa - 50) <= 5 ? 'Perfectly matched. Almost.' : `${esc(w)} carries this chat.`}</div>
       <div class="big">${count(Math.max(pa, 100 - pa), '%')}</div>
       <div class="split"><div style="width:${pa}%;background:#1a0612;color:#ff4f9a">${esc(S.A)}</div><div style="flex:1;background:#ffd0e3;color:#1a0612">${esc(S.B)}</div></div>
       <div class="tally"><div class="tr th"><span></span><b>${esc(S.A)}</b><b>${esc(S.B)}</b></div>
         ${row('Messages', a, b)}${row('Words', t.words[S.A], t.words[S.B])}${row('Double texts', t.doubles[S.A], t.doubles[S.B])}</div>`,
      wordier
        ? `${esc(l)} sends fewer messages, but longer ones: ${t.avg[l].toFixed(1)} words each`
        : `${esc(w)} also writes longer messages: ${t.avg[w].toFixed(1)} words each`);
  } },

  { id: 'morning', pal: 'tang', render: (S) => {
    const w = S.ft[S.A] >= S.ft[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    return frame('First thought of the day',
      `<div class="big">${count(S.ft[w])}</div><div class="line">mornings where <b>${esc(w)}</b> texted first. ${esc(l)} got there first on ${S.ft[l]}.</div>`,
      'Counts the first message after 5:00am each day');
  } },

  { id: 'night', pal: 'cobalt', render: (S) => {
    const mx = Math.max(...S.hours) || 1;
    const bars = S.hours.map((v, h) => `<i style="--i:${h};height:${Math.max(2, (v / mx) * 100)}%;background:${h < 4 || h >= 22 ? '#ffe14d' : '#ffffff88'}"></i>`).join('');
    return frame('Night owls',
      `<div class="mid">${nf(S.late)} messages sent after midnight.</div><div class="hours">${bars}</div>
       <div class="hours-x"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>`,
      `Busiest hour: ${hourLabel(S.peak)}`);
  } },

  { id: 'streak', pal: 'mint', render: (S) => frame('Longest streak',
    `<div class="big">${count(S.streak)}</div><div class="line">days in a row without missing a single day.</div>`,
    `Ended ${fmtDate(S.streakEnd)}`) },

  { id: 'emoji', pal: 'lemon', render: (S) => frame('Your emoji, side by side',
    `<div class="mid">Two people, ten faces.</div><div class="emo"><div>${esc(S.A)}<div class="e">${S.emo[S.A].join('') || '—'}</div></div><div>${esc(S.B)}<div class="e">${S.emo[S.B].join('') || '—'}</div></div></div>`,
    'Ranked by count, left to right') },

  { id: 'reply', pal: 'pink', render: (S) => {
    const r = S.reply, A = r[S.A], B = r[S.B];
    const fast = (A.median ?? Infinity) <= (B.median ?? Infinity) ? S.A : S.B;
    const slow = fast === S.A ? S.B : S.A;
    return frame('Reply speed',
      `<div class="mid">${esc(fast)} replies faster.</div>
       <div class="vs"><div><span>${esc(S.A)}</span><span>${formatReply(A.median, r.precise)}</span></div><div><span>${esc(S.B)}</span><span>${formatReply(B.median, r.precise)}</span></div></div>
       <div class="line">${esc(fast)} answers within 5 minutes ${r[fast].within5}% of the time. ${esc(slow)} left ${esc(fast)} on read for an hour or more ${r[slow].leftOnRead} times.</div>`,
      r.precise ? 'Typical (median) reply, gaps over 6 hours ignored' : 'Your export only records minutes, so quick replies show as < 1 min');
  } },

  { id: 'sorry', pal: 'plum', render: (S) => {
    const w = S.sorry[S.A] >= S.sorry[S.B] ? S.A : S.B;
    return frame('Apologies',
      `<div class="mid">${esc(w)} said sorry ${S.sorry[w]} times.</div><div class="line">${S.sorryFirst ? `The first one: “${esc(S.sorryFirst.text.slice(0, 70))}”` : 'No apologies found.'}</div>`,
      `${esc(S.A)} ${S.sorry[S.A]} · ${esc(S.B)} ${S.sorry[S.B]}`);
  } },

  { id: 'love', pal: 'tang', render: (S) => frame('I love you, counted',
    `<div class="big">${count(S.love[S.A] + S.love[S.B])}</div><div class="line">times you said it in some form. ${esc(S.A)} ${S.love[S.A]}, ${esc(S.B)} ${S.love[S.B]}.</div>`,
    'Includes rindu, sayang you, miss you, ❤, 🥰') },

  { id: 'words', pal: 'mint', render: (S) => frame('Your vocabulary',
    `<div class="mid">The words that are yours.</div><div class="words">${S.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>`,
    'Common words in English and Malay are filtered out') },

  { id: 'busy', pal: 'cobalt', render: (S) => frame('Your loudest day',
    `<div class="mid">${fmtDay(S.busy)}</div><div class="big" style="margin-top:10px">${count(S.busyN)}</div><div class="line">messages in one day. Remember why?</div>`,
    `Still writing. ${nf(S.total)} and counting.`) },
];

// The last slide: a message the sender types before playing.
export const closingSlide = (note, signed) => ({
  id: 'closing', pal: 'plum',
  render: () => frame('One more thing',
    `<div class="quote note">${esc(note).replace(/\n/g, '<br>')}</div>`,
    signed ? `With love, ${esc(signed)}` : 'With love'),
});
