// Date ranges the story can be limited to: all time, the last 30 days, each year and each
// month the chat covers. A range is { id, label, from, to } with `to` exclusive.

import { getLang, MONTHS, t } from './i18n.js';

const pad = (n) => (n < 10 ? '0' : '') + n;

export function rangeOptions(msgs, now = new Date()) {
  const opts = [{ id: 'all', label: t('allTime'), from: null, to: null }];
  if (!msgs.length) return opts;

  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  if (msgs.some((m) => m.when >= since)) opts.push({ id: 'last30', label: t('last30'), from: since, to: null });

  const years = new Set(), months = new Set();
  for (const m of msgs) {
    years.add(m.when.getFullYear());
    months.add(`${m.when.getFullYear()}-${pad(m.when.getMonth() + 1)}`);
  }
  for (const y of [...years].sort((a, b) => b - a)) {
    opts.push({ id: `y${y}`, label: String(y), from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) });
  }
  for (const k of [...months].sort().reverse()) {
    const [y, mo] = k.split('-').map(Number);
    opts.push({ id: `m${k}`, label: `${MONTHS[getLang()][mo - 1]} ${y}`, from: new Date(y, mo - 1, 1), to: new Date(y, mo, 1) });
  }
  return opts;
}

export function filterRange(msgs, range) {
  if (!range || (!range.from && !range.to)) return msgs;
  return msgs.filter((m) => (!range.from || m.when >= range.from) && (!range.to || m.when < range.to));
}
