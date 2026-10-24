import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { stats } from '../src/stats.js';
import { otherMode, SLIDES, slidesFor } from '../src/slides.js';
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
      'sync', 'creatures', 'language', 'weather', 'playlist', // who you are in this chat
      'finale',
    ]);
  });

  it('gives every slide the same layout: a header with the brand, then the body and a callout', () => {
    for (const s of SLIDES) {
      const html = s.render(S);
      expect(html, s.id).toMatch(/class="k ow-head"><span>[^<]+<\/span><span class="ow-brand">Our Wrapped<\/span>/);
      expect(html, s.id).toMatch(/class="ow-text"/);
    }
  });
});

describe('the loudest day, built to the mockup', () => {
  it('shows the date, the count, and that day\'s share of the whole chat', () => {
    const html = render('busy');
    expect(html).toMatch(/class="ow-ctx">\d{1,2} \w{3} \d{4}</);
    expect(html).toMatch(/messages\.<br>In one day\./);
    const pct = (S.busyN / S.total) * 100;
    expect(html).toContain(`<b>${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%</b> <span>of your entire chat happened on this single day.`);
    expect(html).toMatch(/class="ow-bubs ow-bubs-loud"/);
  });
});

describe('the redesigned art', () => {
  it('talker: who had more to say, as two stacks of bubbles instead of a giant percentage', () => {
    const html = render('share');
    expect(html).toMatch(/had more to say/);
    expect(html).toMatch(/class="stacks"/);
    expect(html).not.toMatch(/class="big"|class="tally"/);
  });

  it('bubble count: two rhythms as a little chat', () => {
    const html = render('bubble');
    expect(html).toMatch(/bubbles per turn<br>from /);
    expect(html).toMatch(/class="rhythm[ "]/); // any variant
  });

  it('keeps the ground flat: no background layers behind any slide', () => {
    for (const x of SLIDES) expect(x.render(S), x.id).not.toMatch(/class="(sky|dawn|hearts|decor)\b/);
  });

  it('no goodbyes: a night-to-morning scene with real times and no message text', () => {
    const html = render('carried');
    expect(html).toMatch(/mornings that carried<br>on from last night/);
    expect(html).toMatch(/\d{1,2}:\d{2}(am|pm)/);
  });

  it('streak: the number with its dates above it and the calendar as the picture', () => {
    const html = render('streak');
    expect(html).toMatch(/days in a row/);
    expect(html).toMatch(/class="ow-ctx"/);
    expect(html).toMatch(/class="cal" style="--weeks:\d+"/);
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

  it('gives mornings a sun in the picture', () => {
    expect(render('morning')).toMatch(/class="sun"/);
  });

  it('marks the apology quote for its nudge', () => {
    expect(render('sorry')).toMatch(/class="ow-call nudge"/);
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

describe('two modes', () => {
  const lovers = { ...S, mode: 'lovers' }, casual = { ...S, mode: 'casual' };
  const ids = (s) => slidesFor(s).map((x) => x.id);

  it('keeps apologies and "I love you" for lovers only', () => {
    expect(ids(casual)).not.toContain('sorry');
    expect(ids(casual)).not.toContain('love');
    expect(ids(lovers)).toContain('sorry');
    expect(ids(lovers)).toContain('love');
  });

  it('frames the same five languages as love for lovers and friendship for friends', () => {
    expect(render('language', lovers)).toMatch(/Love language/);
    expect(render('language', casual)).toMatch(/Friendship language/);
  });

  it('never prints anyone\'s actual messages on the new slides', () => {
    const said = [...new Set(parse(makeSample()).map((m) => m.text).filter((x) => x.length > 12))];
    for (const id of ['sync', 'creatures', 'language', 'weather', 'playlist']) {
      for (const s of [lovers, casual]) {
        const html = render(id, s);
        for (const line of said) expect(html, `${id} quotes "${line}"`).not.toContain(line);
      }
    }
  });

  it('skips the weather and the playlist when the chat has too few feelings in it', () => {
    const dry = { ...casual, emotions: { ...S.emotions, eligible: false }, weather: { eligible: false, label: null, standout: null } };
    expect(ids(dry)).not.toContain('weather');
    expect(ids(dry)).not.toContain('playlist');
  });

  it('swaps lovers and friends', () => {
    expect(otherMode('lovers')).toBe('casual');
    expect(otherMode('casual')).toBe('lovers');
  });
});
