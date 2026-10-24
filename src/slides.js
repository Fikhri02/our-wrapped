// Each slide: a chapter (its colours; see theme.js), a render(stats) → HTML string, and optionally skip(stats) for
// when it has nothing to show and typing (a chat scene, so the story opens it with a
// "typing…" beat). All copy comes from i18n.js.
import { clock, compact, esc, fmtDate, fmtDay, fmtRange, formatReply, hourLabel, nf } from './format.js';
import { t } from './i18n.js';
import { texterType } from './stats.js';

// A number the player counts up from 0 on entrance.
const count = (n, suffix = '', dec = 0) =>
  `<span data-count="${n}" data-suffix="${suffix}" data-dec="${dec}">${dec ? n.toFixed(dec) : nf(n)}${suffix}</span>`;

// Every slide shares one layout: a header (what this slide is, and the brand), an
// illustration, then one big fact, a statement, a human remark and a callout card with one
// more thing worth knowing. Parts a slide doesn't need are left out. The big number shrinks
// with its length so 2,510 fits where 57 does.
const slide = ({ kicker, art = '', ctx = '', hero = null, stmt = '', remark = '', more = '', callout = '' }) =>
  `<div class="k ow-head"><span>${kicker}</span><span class="ow-brand">Our Wrapped</span></div>`
  + `<div class="body">${art ? `<div class="ow-art">${art}</div>` : ''}<div class="ow-text">`
  + `${ctx ? `<div class="ow-ctx">${ctx}</div>` : ''}`
  + `${hero ? `<div class="ow-hero" style="--len:${hero.label.length}">${count(hero.n, hero.suffix || '', hero.dec || 0)}</div>` : ''}`
  + `${stmt ? `<div class="ow-stmt">${stmt}</div>` : ''}${remark ? `<div class="ow-remark">${remark}</div>` : ''}${more}</div></div>`
  + `<div class="foot">${callout}</div>`;
const big = (n, suffix = '', dec = 0) => ({ n, suffix, dec, label: (dec ? n.toFixed(dec) : nf(n)) + suffix });
const callout = (num, text, cls = '') => `<div class="ow-call${cls ? ` ${cls}` : ''}">${num !== '' && num != null ? `<b>${num}</b> ` : ''}<span>${text}</span></div>`;

// Text hidden for a saved image: dots in place of the words, roughly as long as the original,
// so the bubble keeps its shape without saying anything.
const hidden = (text) => Array(Math.max(1, Math.min(5, Math.round(text.length / 14)))).fill('•••').join(' ');

// Counting strips the emoji presentation selector, so a lone ❤ would draw as a black text
// heart. Put it back for display on single-symbol emoji.
const asEmoji = (e) => ([...e].length === 1 ? `${e}️` : e);

// The illustration most slides open with: two flat speech bubbles, a translucent one in the
// ink colour and a solid one in the tone, each with lines of "text". Variants move them
// around; `inner` replaces the solid bubble's lines (love puts a heart there).
const talk = (v = '', inner = '<s></s><s></s><s></s>') =>
  `<div class="ow-bubs${v ? ` ow-bubs-${v}` : ''}" aria-hidden="true"><i><s></s><s></s><s></s></i><i>${inner}</i></div>`;

// Mornings: a sun in the illustration, rising in on the story and resting in place on
// still images.
const sun = '<div class="ow-sunbox" aria-hidden="true"><div class="sun"></div></div>';

// The streak as a calendar laid on its side: a column per week (Monday at the top), the
// streak's days filled, its ends ringed, other days you talked shown faintly. Seven rows
// whatever the length, so it never pushes the text off the card. Long streaks (over ten
// weeks) skip it.
function streakCal(S) {
  const day = 864e5, start = S.streakStart, end = S.streakEnd;
  if ((end - start) / day > 70) return '';
  const from = new Date(start); from.setDate(from.getDate() - 3); from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = new Date(end); to.setDate(to.getDate() + 3); to.setDate(to.getDate() + (6 - ((to.getDay() + 6) % 7)));
  const talked = new Set(S.dayKeys || []), key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let cells = '', n = 0, days = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1), days++) {
    const inRun = d >= start && d <= end, edge = +d === +start || +d === +end;
    cells += `<i class="${inRun ? 'on' : talked.has(key(d)) ? 'seen' : ''}${edge ? ' edge' : ''}" style="--i:${inRun ? n++ : 0}"></i>`;
  }
  return `<div class="cal" style="--weeks:${days / 7}">${t('weekdays').split(' ').map((w) => `<span>${w}</span>`).join('')}${cells}</div>`;
}

// Under the total: what how much and how often you talk says about you two. A new chat
// (under a month, whole chat only) gets its own line.
function paceRemark(S) {
  const p = S.pace, fresh = p.isNew && !S.range;
  const tense = p.past ? '_past' : ''; // a chat that's gone quiet for over a week
  return !fresh ? t(`pace_${p.kind}${tense}`) : S.days === p.span ? t(`paceNewEvery${tense}`, p.span) : t(`paceNewSome${tense}`, p.span, S.days);
}

// Everything the two of you wrote, as a book: novels at 90,000 words, then smaller books
// down to a short story, and how long it would take to read (230 words a minute).
function wordsCallout(S) {
  const w = (S.talk?.words?.[S.A] || 0) + (S.talk?.words?.[S.B] || 0);
  if (!w) return '';
  const book = w >= 90000 ? t('bookNovels', (w / 90000).toFixed(1)) : w >= 45000 ? t('bookMost') : w >= 17500 ? t('bookNovella') : w >= 7500 ? t('bookNovelette') : t('bookShort');
  const quip = t(w >= 90000 ? 'quipBig' : w >= 17500 ? 'quipMid' : 'quipSmall');
  const mins = Math.max(1, Math.round(w / 230));
  return callout(nf(w), t('wordsCall', book, mins >= 60 ? t('readHours', Math.round(mins / 60)) : t('readMins', mins), quip));
}

// How long the other person took to answer the very first message, with a line to match.
function firstWaitCallout(S) {
  const w = S.firstWait;
  if (!w) return '';
  const m = w.mins, h = Math.round(m / 60), d = Math.round(m / 1440);
  const when = m < 1 ? t('waitNow') : m < 60 ? t('waitMins', m) : m < 1440 ? t('waitHours', h) : t('waitDays', d);
  const quip = t(m <= 1 ? 'waitEager' : m < 15 ? 'waitSmooth' : m < 60 ? 'waitCool' : m < 1440 ? 'waitMade' : 'waitBold');
  return callout('', t('firstWait', esc(w.who), when, quip));
}

// A chapter's cover: its number, title, a line on what's in it, and its picture.
const cover = (n) => ({
  id: `ch${n}`, chapter: n, cover: true,
  render: () => `<div class="k ow-head"><span>${t('chapterK', n)}</span><span class="ow-brand">Our Wrapped</span></div>`
    + `<div class="body ch-body"><div class="ow-text"><div class="ch-num">${String(n).padStart(2, '0')}</div>`
    + `<div class="ch-title">${t(`ch${n}Title`)}</div><div class="ch-teaser">${t(`ch${n}Teaser`)}</div></div>`
    + `<img class="ch-art" src="./chapters/${n}.webp" alt="${t(`ch${n}Alt`)}"></div><div class="foot"></div>`,
});

export const SLIDES = [
  { id: 'intro', chapter: 1, render: (S) => {
    const p = S.pace;
    return slide({
      kicker: t('introKicker'), art: talk('hero'),
      ctx: S.range ? t('rangeFrom', esc(S.range), fmtDate(S.firstDate)) : t('since', fmtDate(S.firstDate)),
      hero: big(S.total), stmt: t('introStmt', esc(S.A), esc(S.B)),
      remark: p ? paceRemark(S) : '',
      callout: wordsCallout(S),
    });
  } },

  cover(1),

  // The first message as a real chat: a date chip, the bubble with its time and ticks, up to
  // four more messages from the opening conversation, and how long the first reply took.
  { id: 'first', chapter: 1, typing: true, render: (S) => {
    const lead = S.first.who;
    const text = (m, i) => (S.hide?.first ? hidden(m.text) : esc(m.text.slice(0, i ? 70 : 140)));
    const bubble = (m, i) => `<div class="cb ${m.who === lead ? 'l' : 'r'}${i ? '' : ' lead'}" style="--i:${i}">${text(m, i)}<small>${clock(m.when)}${i ? '' : ' ✓✓'}</small></div>`;
    return slide({
      kicker: S.range ? t('rangeFirst', esc(S.range)) : t('whereStarted'),
      art: `<div class="scene"><div class="date-chip">${fmtDate(S.first.when)}</div><div class="cb-who">${esc(lead)}</div>${[S.first, ...(S.firstReplies || [])].map(bubble).join('')}</div>`,
      stmt: t('firstStmt'), remark: t('firstRemark', !!S.pace?.past),
      callout: firstWaitCallout(S),
    });
  } },

  { id: 'starts', chapter: 1, render: (S) => {
    const c = S.convo;
    const w = c.starts[S.A] >= c.starts[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    const g = S.goodnight, bye = g[S.A] >= g[S.B] ? S.A : S.B;
    // A goodnight claim needs a few nights behind it.
    return slide({
      kicker: t('startsKicker'), art: talk('b'),
      hero: big(c.starts[w]), stmt: t('startsStmt', esc(w)), remark: t('startsRemark', esc(l), nf(c.starts[l])),
      callout: g[bye] < 3 ? callout('', t('startsFoot')) : g[S.A] === g[S.B] ? callout('', t('goodnightTie')) : callout(g[bye], t('goodnightCall', esc(bye))),
    });
  } },

  { id: 'morning', chapter: 1, render: (S) => {
    const w = S.ft[S.A] >= S.ft[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    return slide({
      kicker: t('firstThought'), art: sun,
      hero: big(S.ft[w]), stmt: t('mornings', esc(w)), remark: t('morningFoot'),
      callout: callout(S.ft[l], t('morningCall', esc(l))),
    });
  } },

  cover(2),

  { id: 'share', chapter: 2, render: (S) => {
    const a = S.count[S.A], b = S.count[S.B] || 0, pa = Math.round((a / (a + b)) * 100);
    const w = pa >= 50 ? S.A : S.B;
    const tk = S.talk, past = !!S.pace?.past;
    // Two stacks of bubbles, one bubble per tenth of the messages each sent.
    const stack = (p, pct, side) => `<div class="stack ${side}"><div class="pile">${Array.from({ length: Math.max(1, Math.round(pct / 10)) }, (_, i) =>
      `<i style="--i:${i};--w:${[78, 92, 64, 86, 70, 96, 60, 82, 74, 88][i]}%"></i>`).join('')}</div><b>${pct}%</b><span>${esc(p)}</span></div>`;
    // An even split (no clear talker) zips the two together instead: one column of
    // alternating bubbles, because nobody out-talks anybody.
    const zipper = `<div class="zipper">${Array.from({ length: 8 }, (_, i) =>
      `<i class="${i % 2 ? 'b' : 'a'}" style="--i:${i};--w:${[58, 66, 52, 72, 60, 54, 70, 62][i]}%"></i>`).join('')}<div class="zip-l"><span><b>${pa}%</b>${esc(S.A)}</span><span><b>${100 - pa}%</b>${esc(S.B)}</span></div></div>`;
    return slide({
      kicker: t('talker'),
      art: !tk.roles.talker ? zipper : `<div class="stacks">${stack(S.A, pa, 'a')}${stack(S.B, 100 - pa, 'b')}</div>`,
      stmt: !tk.roles.talker ? t('matched') : t('hadMore', esc(w)),
      remark: `<span class="roles">${t('rolesLine', tk.roles, esc(S.A), esc(S.B), past)}</span>`,
      callout: callout(`${nf(a)} · ${nf(b)}`, t('shareCall', esc(S.A), esc(S.B))),
    });
  } },

  // Bubble count: what kind of texters you two are, read off the shape of your turns (no
  // averages), named without hedging, over a tape of each person's real turns.
  { id: 'bubble', chapter: 2, typing: true, render: (S) => {
    const { shape: sh, feature: f } = S.bubbles;
    const type = (p) => sh[p].type || texterType(sh[p]);
    // The louder type leads: ranter, then one-liner, then normal. Same type: A leads.
    const rank = { ranter: 0, oneliner: 1, normal: 2 };
    const [x, y] = rank[type(S.B)] < rank[type(S.A)] ? [S.B, S.A] : [S.A, S.B];
    const key = { 'ranter-ranter': 'rr', 'ranter-oneliner': 'ro', 'ranter-normal': 'rn', 'oneliner-oneliner': 'oo', 'oneliner-normal': 'on', 'normal-normal': 'nn' }[`${type(x)}-${type(y)}`];
    // Which number backs the roast: bursts for ranters and normal pairs, single bubbles for one-liners.
    const num = { rr: ['burst', 'burst'], ro: ['burst', 'single'], rn: ['burst', 'burst'], oo: ['single', 'single'], on: ['single', 'single'], nn: ['burst', 'burst'] }[key];
    // The tape: a stack per real turn, a pill per bubble, darker as the turn gets longer.
    // Six pills at most; a longer turn is marked 6+.
    const stack = (n, i) => {
      const h = Math.min(n, 6);
      return `<div class="tp-stack${n >= 6 ? ' big' : ''}" style="--i:${i}">${Array.from({ length: h }, () => `<i class="b${h}"></i>`).join('')}</div>`;
    };
    const row = (p) => `<div class="tp-row"><div class="sp-who"><span>${esc(p)}</span><b>${t(`type_${type(p)}`)} · ${t('spUsual', sh[p].usual)}</b></div>`
      + `<div class="tp-line">${(S.bubbles.tape?.[p] || []).map(stack).join('')}</div></div>`;
    return slide({
      kicker: t('bubbleKicker'),
      art: `<div class="tape">${row(S.A)}${row(S.B)}<div class="tp-key">${t('tapeKey')}</div></div>`,
      stmt: t(`bv_${key}`, esc(x), esc(y)),
      remark: t(`bv_${key}_why`, esc(x), sh[x][num[0]], esc(y), sh[y][num[1]]),
      more: f?.kind === 'rant' ? `<button type="button" class="slide-act" data-act="rant">${t('rantButton')}</button>` : '',
      callout: !f ? '' : callout('', f.kind === 'rant' ? t('burstRant', esc(f.who), f.n, nf(f.words), fmtDate(f.start))
        : f.kind === 'spree' ? t('burstSpree', esc(f.who), f.n, fmtDate(f.start)) : t('burstNormal', esc(f.who), f.n)),
    });
  } },

  { id: 'reply', chapter: 2, render: (S) => {
    const r = S.reply, A = r[S.A], B = r[S.B];
    // Minute-precision exports make the median 0 for everyone, so rank by the share
    // of replies inside a minute, then by the average.
    const fast = A.within1 !== B.within1 ? (A.within1 > B.within1 ? S.A : S.B) : ((A.mean ?? Infinity) <= (B.mean ?? Infinity) ? S.A : S.B);
    const slow = fast === S.A ? S.B : S.A;
    // Too close to call: under 3 points apart on replies within a minute, and averages
    // within a quarter of each other.
    const ma = A.mean ?? 0, mb = B.mean ?? 0;
    const even = Math.abs(A.within1 - B.within1) < 3 && Math.max(ma, mb) <= 1.25 * Math.max(0.01, Math.min(ma, mb));
    return slide({
      kicker: t('replyKicker'),
      art: `<div class="lanes">${[fast, slow].map((p) => `<div class="lane"><div class="lane-who"><span>${esc(p)}</span><b>${r[p].within1}%</b></div><div class="dots">${
        Array.from({ length: 100 }, (_, i) => `<i${i < r[p].within1 ? ` class="on" style="--i:${i}"` : ''}></i>`).join('')}</div></div>`).join('')}</div>`,
      stmt: even ? t('repliesEven') : t('repliesFaster', esc(fast)),
      remark: t('replyLine', esc(fast), r[fast].within1, esc(slow), r[slow].slow),
      callout: callout(`${formatReply(r[fast].mean, r.precise)} · ${formatReply(r[slow].mean, r.precise)}`, t('replyCall', esc(fast), esc(slow))),
    });
  } },

  { id: 'emoji', chapter: 2, skip: (S) => !S.emo[S.A].length && !S.emo[S.B].length, render: (S) => {
    const v = S.emoVs, past = !!S.pace?.past;
    // Stickers: sized by count against the biggest of both, tilted a little each.
    const max = Math.max(1, ...S.emoN[S.A], ...S.emoN[S.B]), tilt = [-10, 8, -5, 12, -8];
    const emo = [S.A, S.B].map((p, side) => `<div>${esc(p)}<div class="e">${
      S.emo[p].map((e, i) => `<span class="ec" style="--s:${Math.round(22 + 20 * (S.emoN[p][i] / max))}px;--r:${side ? -tilt[i] : tilt[i]}deg;--i:${i * 2 + side}"><i>${asEmoji(e)}</i><b>${compact(S.emoN[p][i])}</b></span>`).join('') || '—'}</div></div>`).join('');
    return slide({
      kicker: t('emojiKicker'), art: `<div class="emo">${emo}</div>`,
      stmt: t('tenFaces'), remark: t('emojiDiff', { ...v, fav: null, hi: esc(v.hi), lo: esc(v.lo) }, past),
      callout: v.fav ? callout(asEmoji(v.fav), t('emojiFav', past)) : '',
    });
  } },

  { id: 'words', chapter: 2, skip: (S) => !S.words[S.A].length && !S.words[S.B].length, render: (S) => slide({
    kicker: t('vocab'),
    art: `<div class="wcols">${[S.A, S.B].map((p, side) => `<div><div class="wname">${esc(p)}</div><div class="words ${side ? 'wb' : 'wa'}">${S.words[p].map((w, i) => `<span style="--i:${i * 2 + side}">${S.hide?.words ? '•••' : esc(w)}</span>`).join('') || '—'}</div></div>`).join('')}</div>`,
    stmt: t('yourWords'), remark: t('wordsFoot'),
  }) },

  cover(3),

  { id: 'love', chapter: 3, skip: (S) => !(S.love[S.A] + S.love[S.B]), render: (S) => slide({
    kicker: t('loveKicker'), art: talk('love', '<em>♥</em>'),
    hero: big(S.love[S.A] + S.love[S.B]), stmt: t('loveStmt'), remark: t('loveRemark'),
    callout: callout(`${nf(S.love[S.A])} · ${nf(S.love[S.B])}`, t('loveCall', esc(S.A), esc(S.B))),
  }) },

  { id: 'sorry', chapter: 3, skip: (S) => !(S.sorry[S.A] + S.sorry[S.B]), render: (S) => {
    const w = S.sorry[S.A] >= S.sorry[S.B] ? S.A : S.B, l = w === S.A ? S.B : S.A;
    return slide({
      kicker: t('apologies'), art: talk('a'),
      hero: big(S.sorry[w]), stmt: t('saidSorry', esc(w)), remark: t('sorryRemark', esc(l), S.sorry[l]),
      callout: callout('', !S.sorryFirst[w] ? t('noSorry') : S.hide?.sorry ? t('firstSorryHidden') : t('firstSorry', esc(S.sorryFirst[w].text.slice(0, 70))), 'nudge'),
    });
  } },

  cover(4),

  { id: 'night', chapter: 4, skip: (S) => !S.late, render: (S) => {
    const mx = Math.max(...S.hours) || 1;
    // The busiest hour is the tallest bar; it gets its hour written above it.
    const bars = S.hours.map((v, h) => `<i class="${h === S.peak ? 'peak' : ''}" style="--i:${h};height:${Math.max(2, (v / mx) * 100)}%;background:${h < 4 || h >= 22 ? 'var(--accent)' : 'color-mix(in srgb, var(--fg) 35%, transparent)'}">${h === S.peak ? `<b>${hourLabel(h)}</b>` : ''}</i>`).join('');
    return slide({
      kicker: t('nightOwls'),
      art: `<div class="hours">${bars}</div><div class="hours-x"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>`,
      hero: big(S.late), stmt: t('afterMidnight'), remark: t('nightFoot'),
      callout: callout(hourLabel(S.peak), t('busiestHour')),
    });
  } },

  // A night that never closed: the last message of the night, the night passing, and the
  // morning reply. Real times, no text: the bubbles hold typing dots.
  { id: 'carried', chapter: 4, typing: true, skip: (S) => !S.carried, render: (S) => {
    const ex = S.carriedEx, dots = '<span class="dots3"><i></i><i></i><i></i></span>';
    const scene = ex ? `<div class="overnight" aria-hidden="true">
        <div class="on-b l" style="--i:0">${dots}<small>${esc(ex.nightWho)} · ${clock(ex.night)}</small></div>
        <div class="on-gap" style="--i:1"><span>☾</span><span>·</span><span>·</span><span>·</span><span>☀</span></div>
        <div class="on-b r" style="--i:2">${dots}<small>${esc(ex.morningWho)} · ${clock(ex.morning)}</small></div></div>` : '';
    return slide({
      kicker: t('carriedKicker'), art: scene,
      hero: big(S.carried), stmt: t('carriedLine'), remark: t('carriedHead'),
      callout: callout(`${Math.max(1, Math.round((S.carried / S.days) * 100))}%`, t('carriedFoot')),
    });
  } },

  { id: 'streak', chapter: 4, render: (S) => slide({
    kicker: t('streak'), art: streakCal(S),
    ctx: S.streakNow ? t('streakToday', fmtDate(S.streakStart)) : fmtRange(S.streakStart, S.streakEnd),
    hero: big(S.streak), stmt: t('streakHead'), remark: t('streakVibe', S.streak, S.streakNow),
    callout: callout(`${Math.max(1, Math.round((S.streak / S.days) * 100))}%`, t('streakCall', S.streakNow)),
  }) },

  // The loudest day, built to the mockup: the date in the accent colour, the count, and what
  // share of the whole chat that one day holds.
  { id: 'busy', chapter: 4, render: (S) => {
    const pct = (S.busyN / S.total) * 100;
    return slide({
      kicker: t('loudest'), art: talk('loud'), ctx: fmtDay(S.busy),
      hero: big(S.busyN), stmt: t('loudLine'), remark: t('loudRemark'),
      more: `<button type="button" class="slide-act" data-act="chat">${t('chatButton')}</button>`,
      callout: callout(`${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`, t('loudCall')),
    });
  } },

  cover(5),

  // How it rose and settled: messages a week from the start to now, the peak marked, and a
  // plain read of where you are now.
  { id: 'arc', chapter: 5, skip: (S) => !S.arc?.eligible, render: (S) => {
    const a = S.arc;
    const bars = a.bars.map((h, i) => `<i class="${i === a.peakBar ? 'pk' : ''}" style="--i:${i};height:${Math.max(3, Math.round(h * 100))}%"></i>`).join('');
    return slide({
      kicker: t('arcKicker'),
      art: `<div class="arc">${bars}</div><div class="arc-x"><span>${t('arcStart')} · ${fmtDate(a.start)}</span><span>${t('arcNowLabel')}</span></div>`,
      ctx: `${t('arcPeak')} · ${fmtDate(a.peak.week)}`, hero: big(a.peak.perWeek), stmt: t('arcStmt'),
      // The temperature picture sits beside the line it illustrates.
      remark: `<span class="arc-now"><img class="arc-temp" src="./temp/${a.now.temp}.webp" alt="${t(`tempAlt_${a.now.temp}`)}">`
        + `<span><b>${t(`temp_${a.now.temp}`)}</b> ${t(`arc_${a.now.phase}`, { ...a.now, perWeek: nf(a.now.perWeek), peak: nf(a.peak.perWeek) })}</span></span>`,
      callout: callout('', a.drop ? t('arcDrop', fmtRange(a.drop.from, a.drop.to), a.drop.weeks) : t('arcEven')),
    });
  } },

  // The comebacks: a scoreboard of who brought the chat back, then a bar per silence of two
  // weeks or more, as tall as it was long, coloured by who broke it. The longest is marked.
  { id: 'comebacks', chapter: 5, skip: (S) => !S.comebacks?.eligible, render: (S) => {
    const c = S.comebacks;
    if (!c.count) {
      return slide({ kicker: t('cbKicker'), stmt: t('cbNever'), remark: t('cbNeverWhy'), callout: callout('', t('cbLongestGap', c.longestGap)) });
    }
    // The scoreboard: the one who brought it back more gets the big circle and the solid colour.
    const lead = c.by[S.B] > c.by[S.A] ? [S.B, S.A] : [S.A, S.B];
    const side = (p) => (p === lead[0] ? 'a' : 'b'), first = (p) => esc(p.trim().split(/\s+/)[0]);
    const most = Math.max(c.by[S.A], c.by[S.B], 1);
    const who = (p) => `<div class="cmb-who ${side(p)}" style="--s:${Math.round(56 + 40 * Math.sqrt(c.by[p] / most))}px"><b>${nf(c.by[p])}</b><span>${first(p)}</span></div>`;
    const tall = Math.max(...c.silences.map((x) => x.days)), top = c.silences.findIndex((x) => x.days === tall);
    const bars = c.silences.map((x, i) => `<div class="cmb-col" style="--i:${i}"><em>${x.days}<small>${t('cbDays')}</small></em>`
      + `<i class="cmb-bar ${side(x.who)}${i === top ? ' top' : ''}" style="height:${Math.max(14, Math.round((x.days / tall) * 100))}%"></i><span>${first(x.who)}</span></div>`).join('');
    // A habit is one person making 60% or more of the comebacks, at least twice.
    const w = lead[0], habit = c.count >= 2 && c.by[w] / c.count >= 0.6;
    return slide({
      kicker: t('cbKicker'),
      art: `<div class="cmb-score">${who(lead[0])}${who(lead[1])}<small>${t('cbBrought')}</small></div><div class="cmb-bars">${bars}</div>`,
      stmt: t('cbStmt', c.count),
      remark: c.count === 1 ? t('cbOne', esc(c.longest.who)) : habit ? t('cbRevived', esc(w), c.by[w] === c.count ? null : c.by[w], c.count >= 3) : t('cbTurns'),
      callout: callout('', t('cbLongest', c.longest.days, fmtDate(c.longest.from), esc(c.longest.who))),
    });
  } },

  // The keepsake: two bubbles with your initials, both names, the years, three headline
  // numbers and a line about you two. Saved without names it reads "You two".
  { id: 'finale', chapter: 5, render: (S) => {
    const anon = S.hide?.finale, dots = '<i></i><i></i><i></i>';
    const initial = (n) => esc([...n.trim()][0]?.toUpperCase() || '?');
    const y0 = S.firstDate.getFullYear(), y1 = +(S.dayKeys?.[S.dayKeys.length - 1] || String(y0)).slice(0, 4);
    const stat = (n, label) => `<div><b>${count(n)}</b><small>${label}</small></div>`;
    return slide({
      kicker: t('finaleKicker', y0 === y1 ? y0 : `${y0} – ${y1}`),
      art: `<div class="duo" aria-hidden="true"><span class="db a">${anon ? dots : initial(S.A)}</span><span class="db b">${anon ? dots : initial(S.B)}</span></div>`,
      stmt: `<span class="fnames">${anon ? t('youTwo') : `${esc(S.A)} &amp; ${esc(S.B)}`}</span>`,
      remark: S.pace ? paceRemark(S) : '',
      callout: `<div class="ow-call ow-fin"><div class="fstats">${stat(S.total, t('finMessages'))}${stat(S.days, t('finDays'))}${stat(S.streak, t('finStreak'))}</div><span>${t('finaleFoot')}</span></div>`,
    });
  } },
];

// The slides that play for this chat: skipped slides drop out, and so does a chapter's cover
// when nothing in its chapter is left.
export function slidesFor(S) {
  const list = SLIDES.filter((s) => !s.skip?.(S));
  return list.filter((s) => !s.cover || list.some((x) => !x.cover && x.chapter === s.chapter));
}

// The last slide: a message the sender types before playing.
export const closingSlide = (note, signed) => ({
  id: 'closing', chapter: 5,
  render: () => slide({
    kicker: t('oneMore'), art: talk('a'),
    stmt: `<span class="note">${esc(note).replace(/\n/g, '<br>')}</span>`,
    remark: signed ? t('withLoveFrom', esc(signed)) : t('withLove'),
  }),
});
