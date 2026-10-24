import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { stats } from '../src/stats.js';
import { SLIDES } from '../src/slides.js';
import { DEFAULT_HIDE, PRIVATE_SLIDES, readHide } from '../src/privacy.js';

const chat = parse([
  '1/1/26, 21:14 - A: hi is this the person with my pen',
  '1/1/26, 21:19 - B: haha yes sorry about that',
  ...Array.from({ length: 12 }, (_, i) => `1/1/26, 22:${String(i).padStart(2, '0')} - ${i % 2 ? 'A: badminton alif' : 'B: boba yuyi'}`),
].join('\n'));
const S = stats(chat);
const render = (id, hide) => SLIDES.find((s) => s.id === id).render({ ...S, hide });

describe('hide on save', () => {
  it('covers the slides that can print private text, with safe defaults', () => {
    expect(PRIVATE_SLIDES).toEqual(['first', 'sorry', 'words']);
    expect(DEFAULT_HIDE).toEqual({ first: false, sorry: true, words: true });
  });

  it('keeps the vocabulary bubbles but hides every word', () => {
    const html = render('words', { words: true });
    expect(html).not.toMatch(/badminton|boba|alif|yuyi/);
    expect(html).toMatch(/•••/);
    expect(render('words', {})).toMatch(/badminton/);
  });

  it('hides the first apology quote', () => {
    expect(render('sorry', { sorry: true })).not.toMatch(/sorry about that/);
    expect(render('sorry', {})).toMatch(/sorry about that/);
  });

  it('keeps the first-message chat scene but hides the messages', () => {
    const html = render('first', { first: true });
    expect(html).not.toMatch(/my pen|haha yes/);
    expect(html).toMatch(/9:14pm/); // times and the shape of the chat stay
  });

  it('falls back to the defaults when storage is empty or broken', () => {
    expect(readHide(null)).toEqual(DEFAULT_HIDE);
    expect(readHide('not json')).toEqual(DEFAULT_HIDE);
    expect(readHide('{"words":false}')).toEqual({ first: false, sorry: true, words: false });
  });
});
