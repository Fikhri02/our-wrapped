import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';

describe('parse', () => {
  it('reads Android day-first 24h lines', () => {
    const [m] = parse('23/10/2026, 23:09 - Me: dah tidur?');
    expect(m.who).toBe('Me');
    expect(m.text).toBe('dah tidur?');
    expect(m.when).toEqual(new Date(2026, 9, 23, 23, 9));
  });

  it('reads iPhone lines with brackets, seconds, U+200E and a narrow-space PM', () => {
    const [m] = parse('‎[01/07/2026, 9:14:02 PM] Ali: hi there');
    expect(m.who).toBe('Ali');
    expect(m.when).toEqual(new Date(2026, 6, 1, 21, 14, 2));
  });

  it('does not mistake a name starting with "Am" for AM', () => {
    const [m] = parse('[01/07/2026, 9:15:10 PM] Aminah: hello');
    expect(m.who).toBe('Aminah');
    expect(m.when.getHours()).toBe(21);
  });

  it('switches to month-first when a second field is over 12', () => {
    const msgs = parse('7/1/26, 9:14 PM - Ali: one\n7/13/26, 9:14 PM - Ali: two');
    expect(msgs[0].when).toEqual(new Date(2026, 6, 1, 21, 14));
    expect(msgs[1].when).toEqual(new Date(2026, 6, 13, 21, 14));
  });

  it('treats 12 AM as midnight and 12 PM as noon', () => {
    const msgs = parse('1/2/26, 12:05 AM - A: x\n1/2/26, 12:05 PM - A: y\n13/2/26, 1:00 PM - A: z');
    expect(msgs[0].when.getHours()).toBe(0);
    expect(msgs[1].when.getHours()).toBe(12);
  });

  it('joins multi-line messages onto the previous message', () => {
    const [m] = parse('23/10/2026, 23:09 - Me: ok so\nI was thinking\nPenang?');
    expect(m.text).toBe('ok so\nI was thinking\nPenang?');
  });

  it('skips system lines that have a date but no sender', () => {
    const msgs = parse('01/07/2026, 21:14 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.\n01/07/2026, 21:15 - Me: hi');
    expect(msgs).toHaveLength(1);
  });

  it('flags media and deleted messages and strips edit markers', () => {
    const msgs = parse('1/1/26, 10:00 - A: <Media omitted>\n1/1/26, 10:01 - B: This message was deleted\n1/1/26, 10:02 - A: hi <This message was edited>');
    expect(msgs[0].media).toBe(true);
    expect(msgs[1].deleted).toBe(true);
    expect(msgs[2].text).toBe('hi');
  });
});

describe('parse seconds', () => {
  it('keeps seconds from iPhone exports', () => {
    const msgs = parse('[1/1/26, 10:00:05] A: hi\n[1/1/26, 10:00:41] B: hey');
    expect(msgs.map((m) => m.when.getSeconds())).toEqual([5, 41]);
  });
});
