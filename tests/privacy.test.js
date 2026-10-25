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
    expect(PRIVATE_SLIDES).toEqual(['first', 'sorry', 'words', 'finale']);
    expect(DEFAULT_HIDE).toEqual({ first: false, sorry: true, words: true, finale: false });
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
    expect(readHide('{"words":false}')).toEqual({ first: false, sorry: true, words: false, finale: false });
  });
});

describe('finale', () => {
  const finale = (hide = {}) => SLIDES.find((s) => s.id === 'finale').render({ ...S, hide });

  it('is the last slide', () => {
    expect(SLIDES[SLIDES.length - 1].id).toBe('finale');
  });

  it('brings the two of you, the years and the headline numbers together', () => {
    const html = finale();
    expect(html).toContain('A &amp; B');
    expect(html).toMatch(/2026/);
    expect(html).toMatch(/data-count="14"/); // total messages
  });

  it('can be saved without your names', () => {
    expect(PRIVATE_SLIDES).toContain('finale');
    expect(DEFAULT_HIDE.finale).toBe(false);
    const html = finale({ finale: true });
    expect(html).not.toContain('A &amp; B');
    expect(html).toContain('You two');
  });

  it('ends like a film: the cast takes a bow, names billed as the stars', () => {
    const html = finale();
    const lovers = SLIDES.find((s) => s.id === 'finale').render({ ...S, hide: {}, vibe: 'lovers' });
    expect(lovers).toMatch(/<img class="ow-pic fin-art" src="\.\/art\/finale\.webp"/);
    expect(html).toMatch(/class="credits"><small>Starring<\/small>/);
    expect(html).not.toMatch(/class="duo"|class="db /);
    expect(finale({ finale: true })).toMatch(/Starring<\/small><span class="fnames">You two/);
    // a long chat's numbers shrink to fit their third of the panel
    expect(SLIDES.find((s) => s.id === 'finale').render({ ...S, hide: {}, total: 56258 })).toMatch(/<div style="--len:6"><b>/);
    expect(SLIDES.find((s) => s.id === 'finale').render({ ...S, hide: {}, vibe: 'friends' })).toMatch(/src="\.\/art\/friends\/finale\.webp"/);
  });
});
