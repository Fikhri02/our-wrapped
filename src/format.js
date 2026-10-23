import { getLang, MONTHS_SHORT, t } from './i18n.js';

const months = () => MONTHS_SHORT[getLang()];
export const fmtDate = (d) => `${d.getDate()} ${months()[d.getMonth()]} ${d.getFullYear()}`;
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
