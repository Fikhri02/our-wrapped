import { afterEach, describe, expect, it } from 'vitest';
import { STRINGS, setLang, t } from '../src/i18n.js';
import { parse } from '../src/parser.js';
import { stats } from '../src/stats.js';
import { closingSlide, SLIDES } from '../src/slides.js';
import { makeSample } from '../src/sample.js';
import { fmtDate, formatReply } from '../src/format.js';
import { rangeOptions } from '../src/range.js';

afterEach(() => setLang('en'));

describe('i18n', () => {
  it('has the same keys in English and Malay', () => {
    expect(Object.keys(STRINGS.ms).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });

  it('formats dates, reply times and range labels in the chosen language', () => {
    setLang('ms');
    expect(fmtDate(new Date(2026, 2, 14))).toBe('14 Mac 2026');
    expect(formatReply(0, false)).toBe('< 1 minit');
    expect(formatReply(4, false)).toBe('4 minit');
    const opts = rangeOptions(parse('14/08/2026, 10:00 - A: hi'), new Date(2026, 9, 24));
    expect(opts.map((o) => o.label)).toEqual(['Sepanjang masa', '2026', 'Ogos 2026']);
  });

  it('renders every slide in Malay with no English copy left', () => {
    setLang('ms');
    const english = /\b(messages|between|days of talking|Where it started|The talker|replies faster|said sorry|Still writing|With love|Ended|Since)\b/;
    for (const mode of ['lovers', 'casual']) {
      const S = { ...stats(parse(makeSample())), mode };
      for (const s of [...SLIDES, closingSlide('Terima kasih', 'Irfan')]) {
        const html = s.render(S).replace(/<[^>]+>/g, ' ');
        expect(html, `${mode} ${s.id}`).not.toMatch(/undefined|NaN|null/);
        expect(html, `${mode} ${s.id}`).not.toMatch(english);
      }
    }
  });

  it('falls back to English for an unknown language', () => {
    setLang('xx');
    expect(t('talker')).toBe('The talker');
  });
});
