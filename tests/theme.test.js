import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS, paint } from '../src/theme.js';
import { closingSlide, SLIDES } from '../src/slides.js';

const fakeCard = () => ({ dataset: {}, style: { props: {}, setProperty(k, v) { this.props[k] = v; } } });

// WCAG contrast ratio of two #rrggbb colours.
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('themes', () => {
  it('paints each slide in its chapter\'s colours, chapter 4 dark', () => {
    const c = fakeCard();
    paint(c, 1);
    expect(c.style.props['--bg']).toBe('#F4EBDD');
    expect(c.style.props['--accent']).toBe('#86512E');
    expect(c.dataset.chapter).toBe('1');
    const d = fakeCard();
    paint(d, 4);
    expect(d.style.props['--bg']).toBe('#20283E');
    expect(d.style.props['--fg']).toBe('#F5F1E9');
    expect(d.style.props['--accent']).toBe('#E9BE74');
  });

  it('puts every slide in a chapter, 1 to 5, and no slide keeps its own accent', () => {
    for (const s of [...SLIDES, closingSlide('x', 'y')]) {
      expect([1, 2, 3, 4, 5], s.id).toContain(s.chapter);
      expect(s.accent, s.id).toBeUndefined();
    }
  });

  it('keeps colours out of the slide markup: every one comes from the theme', () => {
    expect(readFileSync(new URL('../src/slides.js', import.meta.url), 'utf8')).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('passes AA in every chapter: ink, muted and accent on the ground, ink and accent on the tint and surface', () => {
    for (const [n, ch] of Object.entries(CHAPTERS)) {
      for (const [a, b] of [['fg', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['fg', 'tint'], ['accent', 'tint'], ['fg', 'surface']]) {
        expect(contrast(ch[a], ch[b]), `chapter ${n} ${a}/${b}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
