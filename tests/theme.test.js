import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCENTS, paint, THEMES } from '../src/theme.js';
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
  it('paints LOVERS in flat blush with burgundy', () => {
    const c = fakeCard();
    paint(c, 'lovers');
    expect(c.dataset.mode).toBe('lovers');
    expect(c.style.props['--bg']).toBe('#E9CCCA');
    expect(c.style.props['--accent']).toBe('#743F51');
  });

  it('paints CASUAL on denim with the slide\'s accent, teal by default', () => {
    const c = fakeCard();
    paint(c, 'casual', 'ochre');
    expect(c.dataset.mode).toBe('casual');
    expect(c.style.props['--bg']).toBe('#E9ECF2');
    expect(c.style.props['--accent']).toBe('#7A5E0E');
    expect(c.style.props['--tint']).toBe('#EFE0B0');
    const d = fakeCard();
    paint(d, 'casual');
    expect(d.style.props['--accent']).toBe('#276A60');
  });

  it('gives every slide an accent from the set, and no slide a palette', () => {
    for (const s of [...SLIDES, closingSlide('x', 'y')]) {
      expect(Object.keys(ACCENTS), s.id).toContain(s.accent);
      expect(s.pal, s.id).toBeUndefined();
    }
  });

  it('keeps colours out of the slide markup: every one comes from the theme', () => {
    expect(readFileSync(new URL('../src/slides.js', import.meta.url), 'utf8')).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('passes AA: ink and muted text on each ground, and every CASUAL accent on denim', () => {
    for (const th of Object.values(THEMES)) {
      expect(contrast(th.fg, th.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.muted, th.bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(THEMES.lovers.accent, THEMES.lovers.bg)).toBeGreaterThanOrEqual(4.5);
    for (const [name, [accent]] of Object.entries(ACCENTS)) expect(contrast(accent, THEMES.casual.bg), name).toBeGreaterThanOrEqual(4.5);
  });
});
