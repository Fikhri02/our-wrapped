const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDate = (d) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
export const fmtDay = (k) => { const [y, m, d] = k.split('-'); return `${+d} ${MON[m - 1]} ${y}`; };
export const nf = (n) => n.toLocaleString('en-MY');
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
// Reply time in minutes → label. Minute-only exports can't resolve under a minute,
// so they read "< 1 min" instead of a fake "0s".
export function formatReply(m, precise) {
  if (m == null) return '—';
  if (m < 1) return precise ? `${Math.round(m * 60)} sec` : '< 1 min';
  if (m < 60) return `${Math.round(m)} min`;
  return `${(m / 60).toFixed(1)} hr`;
}
