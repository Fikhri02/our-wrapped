import { describe, expect, it } from 'vitest';
import { screenFor, SCREENS } from '../src/route.js';

describe('screenFor', () => {
  it('lists the three screens', () => {
    expect(SCREENS).toEqual(['landing', 'story', 'results']);
  });

  it('maps the hash to a screen once a chat is loaded', () => {
    expect(screenFor('#story', true)).toBe('story');
    expect(screenFor('#results', true)).toBe('results');
    expect(screenFor('', true)).toBe('landing');
    expect(screenFor('#', true)).toBe('landing');
  });

  it('falls back to landing when no chat is loaded (a refresh on #story)', () => {
    expect(screenFor('#story', false)).toBe('landing');
    expect(screenFor('#results', false)).toBe('landing');
  });

  it('treats an unknown hash as landing', () => {
    expect(screenFor('#nope', true)).toBe('landing');
    expect(screenFor('#landing', true)).toBe('landing');
  });
});
