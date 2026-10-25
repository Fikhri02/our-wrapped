import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { stats } from '../src/stats.js';
import { makeSample } from '../src/sample.js';
import { setLang } from '../src/i18n.js';
import { summaryHtml } from '../src/summary.js';

setLang('en');
const S = stats(parse(makeSample()));

describe('summary screen after the story', () => {
  it('lays out the whole chat as cards, in the order of ChatGPT\'s mockup', () => {
    const html = summaryHtml(S);
    const order = [...html.matchAll(/data-card="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['glance', 'share', 'reply', 'starts', 'morning', 'hours', 'pulse', 'ledger', 'emoji']);
  });

  it('shows no hearts for a chat between friends', () => {
    expect(summaryHtml({ ...S, vibe: 'lovers' })).toContain('❤️');
    expect(summaryHtml({ ...S, vibe: 'friends' })).not.toContain('❤️');
  });

  it('splits the messages into two shares that add up to 100', () => {
    const shares = [...summaryHtml(S).matchAll(/data-share="(\d+)"/g)].map((m) => +m[1]);
    expect(shares).toHaveLength(2);
    expect(shares[0] + shares[1]).toBe(100);
  });

  it('draws 24 hour bars and marks the busiest one', () => {
    const html = summaryHtml(S);
    expect(html.match(/class="sm-h( peak)?"/g)).toHaveLength(24);
    expect(html.match(/class="sm-h peak"/g)).toHaveLength(1);
  });

  it('marks the tallest weekly bar as the peak', () => {
    const arc = { ...S.arc, bars: [0.2, 0.5, 1, 0.7], peakBar: 0 };
    expect(summaryHtml({ ...S, arc })).toMatch(/<div class="sm-weeks"><i style="[^"]+"><\/i><i style="[^"]+"><\/i><i class="peak"/);
  });

  it('keeps names hidden when the saved images hide them', () => {
    const html = summaryHtml({ ...S, hide: { finale: true } });
    expect(html).not.toContain(S.B);
    expect(html).toMatch(/Person 1/);
  });

  it('drops cards a thin chat has no data for', () => {
    const thin = { ...S, arc: { eligible: false }, emo: { [S.A]: [], [S.B]: [] } };
    const html = summaryHtml(thin);
    expect(html).not.toMatch(/data-card="pulse"/);
    expect(html).not.toMatch(/data-card="emoji"/);
  });
});
