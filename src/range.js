// Date ranges the story can be limited to: all time, the last 30 days, each year and each
// month the chat covers. A range is { id, label, from, to } with `to` exclusive.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => (n < 10 ? '0' : '') + n;

export function rangeOptions(msgs, now = new Date()) {
  const opts = [{ id: 'all', label: 'All time', from: null, to: null }];
  if (!msgs.length) return opts;

  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  if (msgs.some((m) => m.when >= since)) opts.push({ id: 'last30', label: 'Last 30 days', from: since, to: null });

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
    opts.push({ id: `m${k}`, label: `${MONTHS[mo - 1]} ${y}`, from: new Date(y, mo - 1, 1), to: new Date(y, mo, 1) });
  }
  return opts;
}

export function filterRange(msgs, range) {
  if (!range || (!range.from && !range.to)) return msgs;
  return msgs.filter((m) => (!range.from || m.when >= range.from) && (!range.to || m.when < range.to));
}
