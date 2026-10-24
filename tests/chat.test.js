import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { dayMessages, guessMe, renderChat } from '../src/chat.js';
import { stats } from '../src/stats.js';
import { SLIDES } from '../src/slides.js';

const msgs = parse([
  '1/1/26, 23:58 - A: still up?',
  '2/1/26, 09:00 - A: morning',
  '2/1/26, 09:01 - A: <b>bold</b> & more',
  '2/1/26, 09:02 - B: <Media omitted>',
  '2/1/26, 10:15 - B: line one\nline two',
  '2/1/26, 10:16 - C: from someone else',
  '2/1/26, 10:17 - A: This message was deleted',
  '3/1/26, 00:01 - B: next day',
  '3/1/26, 00:02 - B: You deleted this message',
].join('\n'));

describe('dayMessages', () => {
  it('keeps one calendar day and only the two people', () => {
    const day = dayMessages(msgs, '2026-01-02', ['A', 'B']);
    expect(day.map((m) => m.text)).toEqual(['morning', '<b>bold</b> & more', '<Media omitted>', 'line one\nline two', 'This message was deleted']);
  });
});

describe('guessMe', () => {
  it('finds whoever exported the chat from their own "You deleted this message"', () => {
    expect(guessMe(msgs, ['A', 'B'])).toBe('B'); // A's deletion reads "This message was deleted"
  });

  it('gives up when there is no clue', () => {
    expect(guessMe(msgs.slice(0, 3), ['A', 'B'])).toBeNull();
  });
});

describe('renderChat', () => {
  const html = renderChat(dayMessages(msgs, '2026-01-02', ['A', 'B']), 'B');

  it('puts my bubbles on one side and theirs on the other', () => {
    expect(html.match(/chat-b them/g)).toHaveLength(3);
    expect(html.match(/chat-b me/g)).toHaveLength(2);
  });

  it('labels each run once: their name and time, or just my time', () => {
    expect(html.match(/class="chat-who/g)).toHaveLength(4); // A, B at 9am; B again under 10am; A
    expect(html).toMatch(/class="chat-who them">A · 9:00am/);
    expect(html).toMatch(/class="chat-who me">9:02am/);
  });

  it('marks each new hour', () => {
    expect(html.match(/class="chat-hour"/g)).toHaveLength(2); // 9am, 10am
  });

  it('escapes message text and keeps line breaks for CSS', () => {
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt; &amp; more');
    expect(html).toContain('line one\nline two');
    expect(html).not.toContain('<b>bold</b>');
  });

  it('labels media and deleted messages instead of showing export placeholders', () => {
    expect(html).not.toContain('Media omitted');
    expect(html).toMatch(/chat-b me ph">Photo or video/);
    expect(html).toMatch(/chat-b them ph">Deleted message/);
  });
});

describe('loudest day slide', () => {
  it('offers a button to read that day', () => {
    const S = stats(parse(Array.from({ length: 20 }, (_, i) => `1/1/26, 10:${String(i).padStart(2, '0')} - ${i % 2 ? 'A' : 'B'}: hello`).join('\n')));
    const html = SLIDES.find((s) => s.id === 'busy').render(S);
    expect(html).toMatch(/data-act="chat"/);
  });
});
