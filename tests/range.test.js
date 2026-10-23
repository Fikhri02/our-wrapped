import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { filterRange, rangeOptions } from '../src/range.js';

const chat = parse([
  '28/12/2025, 21:00 - A: hi',
  '02/01/2026, 09:00 - B: happy new year',
  '14/02/2026, 20:00 - A: valentine',
  '14/02/2026, 23:59 - B: night',
  '01/03/2026, 00:00 - A: march',
  '20/10/2026, 10:00 - B: recent',
].join('\n'));
const now = new Date(2026, 9, 24, 1, 0);

describe('rangeOptions', () => {
  const opts = rangeOptions(chat, now);
  const ids = opts.map((o) => o.id);

  it('starts with all time, then the last 30 days when the chat reaches it', () => {
    expect(ids.slice(0, 2)).toEqual(['all', 'last30']);
  });

  it('lists each year and month the chat covers, newest first', () => {
    expect(ids).toContain('y2026');
    expect(ids).toContain('y2025');
    expect(ids.filter((i) => i.startsWith('m'))).toEqual(['m2026-10', 'm2026-03', 'm2026-02', 'm2026-01', 'm2025-12']);
  });

  it('labels months and years in words', () => {
    expect(opts.find((o) => o.id === 'm2026-02').label).toBe('February 2026');
    expect(opts.find((o) => o.id === 'y2026').label).toBe('2026');
  });

  it('leaves out the last 30 days when the chat has nothing there', () => {
    expect(rangeOptions(chat.slice(0, 5), now).map((o) => o.id)).not.toContain('last30');
  });
});

describe('filterRange', () => {
  const opts = rangeOptions(chat, now);
  const get = (id) => filterRange(chat, opts.find((o) => o.id === id));

  it('keeps a whole month, including its last minute, and nothing past it', () => {
    expect(get('m2026-02').map((m) => m.text)).toEqual(['valentine', 'night']);
  });

  it('keeps a whole year', () => {
    expect(get('y2025').map((m) => m.text)).toEqual(['hi']);
  });

  it('returns everything for all time', () => {
    expect(get('all')).toHaveLength(6);
  });
});
