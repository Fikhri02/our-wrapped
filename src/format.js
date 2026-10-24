import { getLang, MONTHS_SHORT, t } from './i18n.js';

const months = () => MONTHS_SHORT[getLang()];
export const fmtDate = (d) => `${d.getDate()} ${months()[d.getMonth()]} ${d.getFullYear()}`;
// A date range as short as it can be: "1 – 22 Jul 2025", "28 Jun – 9 Jul 2025", or both
// dates in full across years. One day is just that date.
export function fmtRange(a, b) {
  if (a.getFullYear() !== b.getFullYear()) return `${fmtDate(a)} – ${fmtDate(b)}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${months()[a.getMonth()]} – ${fmtDate(b)}`;
  if (a.getDate() !== b.getDate()) return `${a.getDate()} – ${fmtDate(b)}`;
  return fmtDate(b);
}
export const fmtDay = (k) => { const [y, m, d] = k.split('-'); return `${+d} ${months()[m - 1]} ${y}`; };
export const nf = (n) => n.toLocaleString('en-MY');
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;

// Reply time in minutes → label. Minute-only exports can't resolve under a minute,
// so they read "< 1 min" instead of a fake "0s".
export function formatReply(m, precise) {
  if (m == null) return '—';
  if (m < 1) return precise ? t('sec', Math.round(m * 60)) : t('underMin');
  if (m < 60) return t('min', Math.round(m));
  return t('hr', (m / 60).toFixed(1));
}
