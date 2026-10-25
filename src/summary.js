// The summary screen after the story: the whole chat at a glance, as app-style cards.
// Layout and chart types follow ChatGPT's mockup; every chart is drawn from this chat's numbers.
import { t } from './i18n.js';
import { esc, fmtDate, fmtDay, nf } from './format.js';

// Icons are ChatGPT-made stickers in the mascot's style (public/icons), not stock pictograms.
const icon = (k) => `<img class="sm-ico" src="./icons/${k}.webp" alt="" aria-hidden="true">`;
const card = (id, title, body, cls = '') => `<section class="sm-card${cls ? ` ${cls}` : ''}" data-card="${id}">${title ? `<h3>${title}</h3>` : ''}${body}</section>`;
const pct = (a, b) => (a + b ? Math.round((a / (a + b)) * 100) : 50);

// A labelled bar per person; `side` picks the strong (a) or soft (b) colour.
const bars = (rows) => `<div class="sm-bars">${rows.map(([who, w, label, side]) =>
  `<div class="sm-row"><span class="sm-who">${who}</span><span class="sm-track"><i class="${side}" style="width:${Math.max(2, w)}%"></i></span><b>${label}</b></div>`).join('')}</div>`;

export function summaryHtml(S) {
  const anon = S.hide?.finale;
  const A = anon ? t('person1') : esc(S.A), B = anon ? t('person2') : esc(S.B);
  // cards use first names so two long names still fit side by side on a phone; the subtitle keeps them whole
  const first = (n) => esc(n.trim().split(/\s+/)[0]);
  const a1 = anon ? A : first(S.A), b1 = anon ? B : first(S.B);
  const words = (S.talk?.words?.[S.A] || 0) + (S.talk?.words?.[S.B] || 0);
  const out = [];

  out.push(card('glance', '', `<div class="sm-kpis">${[
    ['messages', S.total, t('smMessages')], ['words', words, t('smWords')], ['days', S.days, t('smDays')], ['streak', S.streak, t('smStreak')],
  ].map(([k, n, l]) => `<div>${icon(k)}<b>${nf(n)}</b><small>${l}</small></div>`).join('')}</div>`));

  // Message share: a donut, the stronger colour for the first person.
  const a = pct(S.count[S.A], S.count[S.B]), b = 100 - a, C = 2 * Math.PI * 40;
  out.push(card('share', t('smShare'), `<div class="sm-donut-wrap"><svg class="sm-donut" viewBox="0 0 100 100" aria-hidden="true">`
    + `<circle cx="50" cy="50" r="40" class="b"/><circle cx="50" cy="50" r="40" class="a" stroke-dasharray="${(a / 100) * C} ${C}" transform="rotate(-90 50 50)"/>`
    + `<text x="50" y="49">${nf(S.total)}</text><text x="50" y="62" class="s">${t('smMessagesLower')}</text></svg>`
    + `<ul class="sm-legend"><li><i class="a"></i>${a1}<b data-share="${a}">${a}%</b></li><li><i class="b"></i>${b1}<b data-share="${b}">${b}%</b></li></ul></div>`));

  const r = (p) => S.reply?.[p]?.within1 ?? 0;
  out.push(card('reply', t('smReply'), bars([[a1, r(S.A), `${r(S.A)}%`, 'a'], [b1, r(S.B), `${r(S.B)}%`, 'b']]) + `<small class="sm-note">${t('smReplyNote')}</small>`));

  const st = S.convo?.starts || {}, sMax = Math.max(st[S.A] || 0, st[S.B] || 0, 1);
  out.push(card('starts', t('smStarts'), bars([[a1, ((st[S.A] || 0) / sMax) * 100, nf(st[S.A] || 0), 'a'], [b1, ((st[S.B] || 0) / sMax) * 100, nf(st[S.B] || 0), 'b']]), 'half'));

  const fa = pct(S.ft?.[S.A] || 0, S.ft?.[S.B] || 0), fb = 100 - fa;
  out.push(card('morning', t('smMorning'), bars([[a1, fa, `${fa}%`, 'a'], [b1, fb, `${fb}%`, 'b']]), 'half'));

  // Messages by hour: 24 bars, the busiest in the strong colour.
  const hMax = Math.max(...S.hours, 1);
  out.push(card('hours', t('smHours'), `<div class="sm-hist">${S.hours.map((v, h) =>
    `<i class="sm-h${h === S.peak ? ' peak' : ''}" style="height:${Math.max(3, (v / hMax) * 100)}%"></i>`).join('')}</div>`
    + `<div class="sm-axis"><span>12am</span><span>4am</span><span>8am</span><span>12pm</span><span>4pm</span><span>8pm</span></div>`, 'wide'));

  // The chat's pulse: weekly bars across the whole chat, peak marked, current temperature beside it.
  if (S.arc?.eligible) {
    const temp = S.arc.now.temp;
    // the tallest bar drawn is the one marked, so the eye and the colour agree
    const top = S.arc.bars.indexOf(Math.max(...S.arc.bars));
    out.push(card('pulse', t('smPulse'), `<div class="sm-pulse"><div class="sm-weeks">${S.arc.bars.map((v, i) =>
      `<i${i === top ? ' class="peak"' : ''} style="height:${Math.max(4, v * 100)}%"></i>`).join('')}</div>`
      + `<div class="sm-temp"><small>${t('smTemp')}</small><b class="${temp}">${icon(temp)} ${t(`tempShort_${temp}`)}</b><small>${t('smPeak', fmtDate(S.arc.peak.week))}</small></div></div>`, 'wide'));
  }

  // The closing ledger: loudest day, comebacks, love and sorry.
  const love = (S.love?.[S.A] || 0) + (S.love?.[S.B] || 0), sorry = (S.sorry?.[S.A] || 0) + (S.sorry?.[S.B] || 0);
  const fond = S.vibe === 'friends' ? 'friends' : 'love';
  out.push(card('ledger', '', `<div class="sm-ledger">`
    + `<div>${icon('loudest')}<small>${t('smLoudest')}</small><b>${S.busy ? fmtDay(S.busy) : '—'}</b><span>${t('smLoudN', nf(S.busyN || 0))}</span></div>`
    + `<div>${icon('comebacks')}<small>${t('smComebacks')}</small><b>${S.comebacks?.eligible ? nf(S.comebacks.count) : '—'}</b><span>${t('smComebacksN')}</span></div>`
    + `<div><span class="sm-pair">${icon(fond)}${icon('sorry')}</span><small>${t('smLoveSorry')}</small><b>${nf(love)} · ${nf(sorry)}</b><span>${t('smLoveSorryN')}</span></div></div>`, 'wide'));

  // Top 5 emoji each, ranked.
  const emo = (p) => (S.emo?.[p] || []).slice(0, 5);
  if (emo(S.A).length || emo(S.B).length) {
    const row = (p, who) => `<div class="sm-emo"><span class="sm-who">${who}</span>${emo(p).map((e, i) => `<span><small>${i + 1}.</small>${e}</span>`).join('') || '—'}</div>`;
    out.push(card('emoji', t('smEmoji'), row(S.A, a1) + row(S.B, b1), 'wide'));
  }

  return `<header class="sm-head"><div><h2>${t('smTitle')}</h2><p>${t('smSub', nf(S.days), a1, b1)}</p></div>`
    + `<img class="sm-art" src="./art/${S.vibe === 'friends' ? 'friends/' : ''}finale.webp" alt="" aria-hidden="true"></header>`
    + `<div class="sm-grid">${out.join('')}</div>`;
}
