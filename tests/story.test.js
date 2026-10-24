import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { stats } from '../src/stats.js';
import { SLIDES } from '../src/slides.js';
import { setLang } from '../src/i18n.js';
import { makeSample } from '../src/sample.js';

setLang('en');
const S = stats(parse(makeSample()));
const render = (id, s = S) => SLIDES.find((x) => x.id === id).render(s);

describe('the story', () => {
  it('runs in three acts and ends on the finale', () => {
    expect(SLIDES.map((s) => s.id)).toEqual([
      'intro', 'first', 'share', // how it began
      'bubble', 'starts', 'emoji', 'words', 'love', 'reply', 'sorry', // what you're like together
      'morning', 'night', 'carried', 'streak', 'busy', // the moments you made
      'finale',
    ]);
  });

  it('never puts more than one giant number in any three slides in a row', () => {
    const g = SLIDES.map((s) => (s.giant ? 1 : 0));
    for (let i = 0; i + 2 < g.length; i++) expect(g[i] + g[i + 1] + g[i + 2], SLIDES[i].id).toBeLessThanOrEqual(1);
  });
});

describe('the last four, redesigned', () => {
  it('talker: who had more to say, as two stacks of bubbles instead of a giant percentage', () => {
    const html = render('share');
    expect(html).toMatch(/had more to say/);
    expect(html).toMatch(/class="stacks"/);
    expect(html).not.toMatch(/class="big"|class="tally"/);
  });

  it('bubble count: two rhythms as a little chat, no giant number', () => {
    const html = render('bubble');
    expect(html).toMatch(/Two rhythms/);
    expect(html).toMatch(/class="rhythm[ "]/); // any variant
    expect(html).not.toMatch(/class="big"/);
  });

  it('night owls: a night sky behind the hours', () => {
    expect(render('night')).toMatch(/class="sky"/);
  });

  it('no goodbyes: a night-to-morning scene with real times and no message text', () => {
    const html = render('carried');
    expect(html).toMatch(/Some conversations never really ended/);
    expect(html).toMatch(/\d{1,2}:\d{2}(am|pm)/);
    expect(html).toMatch(/mornings picked up where last night left off/);
    expect(html).not.toMatch(/class="big"/);
  });

  it('streak: the number becomes a headline and the calendar is the picture', () => {
    const html = render('streak');
    expect(html).toMatch(/days in a row/);
    expect(html).not.toMatch(/class="big"/);
  });

  it('reply speed: calls it even when the two are close', () => {
    const even = { ...S, reply: { ...S.reply, [S.A]: { ...S.reply[S.A], within1: 50, mean: 4 }, [S.B]: { ...S.reply[S.B], within1: 51, mean: 4.2 } } };
    expect(render('reply', even)).toMatch(/pretty evenly matched/);
    const clear = { ...S, reply: { ...S.reply, [S.A]: { ...S.reply[S.A], within1: 30, mean: 9 }, [S.B]: { ...S.reply[S.B], within1: 70, mean: 2 } } };
    expect(render('reply', clear)).toMatch(/replies faster/);
  });
});

describe('a reveal per slide', () => {
  it('keeps the typing beat only for the chat scenes', () => {
    expect(SLIDES.filter((s) => s.typing).map((s) => s.id)).toEqual(['first', 'bubble', 'carried']);
  });

  it('gives mornings a sun and love floating hearts, both resting in place when still', () => {
    expect(render('morning')).toMatch(/class="sun"/);
    expect(render('love')).toMatch(/class="hearts"/);
    expect(render('love').match(/<i[^>]*>♥<\/i>/g).length).toBeGreaterThanOrEqual(5);
  });

  it('marks the apology quote for its nudge', () => {
    expect(render('sorry')).toMatch(/class="line nudge"/);
  });
});

describe('layouts that follow how you text', () => {
  const withTalk = (counts, roles) => ({ ...S, count: { ...S.count, [S.A]: counts[0], [S.B]: counts[1] }, talk: { ...S.talk, roles: { ...S.talk.roles, ...roles } } });
  const withAvg = (a, b, f = S.bubbles.feature) => ({ ...S, bubbles: { ...S.bubbles, avg: { [S.A]: a, [S.B]: b }, feature: f } });

  it('talker: an even split zips the two together instead of stacking them', () => {
    expect(render('share', withTalk([510, 490], { talker: null }))).toMatch(/class="zipper"/);
    expect(render('share', withTalk([700, 300], { talker: S.A }))).toMatch(/class="stacks"/);
  });

  it('two rhythms: ping-pong when both send single bubbles, a tall burst when one clearly bursts', () => {
    expect(render('bubble', withAvg(1.2, 1.1))).toMatch(/class="rhythm pingpong"/);
    expect(render('bubble', withAvg(3.4, 1.2))).toMatch(/class="rhythm burst"/);
    expect(render('bubble', withAvg(2.1, 1.9))).toMatch(/class="rhythm"/);
  });

  it('a burst turn shows up to six bubbles, never more', () => {
    const html = render('bubble', withAvg(9, 1));
    const turnA = html.split('class="turn a"')[1].split('class="turn b"')[0];
    expect(turnA.match(/<i /g)).toHaveLength(6);
  });
});
