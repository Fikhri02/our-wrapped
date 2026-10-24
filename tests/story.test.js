import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser.js';
import { stats } from '../src/stats.js';
import { SLIDES, slidesFor } from '../src/slides.js';
import { texterType } from '../src/stats.js';
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
      'arc', 'comebacks', // how it rose, settled, and came back
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

  it('bubble count: each person\'s real turns as a tape of bubble stacks, no averages', () => {
    const html = render('bubble');
    expect(html).toMatch(/class="tape"/);
    expect(html).not.toMatch(/class="spread"/);
    expect(html).toMatch(/Usually/);
    expect(html).not.toMatch(/\d\.\d/); // no decimals: nothing here is an average
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
  const shape = (usual, single, burst, dist) => ({ usual, single, burst, dist });
  const withShape = (a, b) => ({ ...S, bubbles: { ...S.bubbles, shape: { [S.A]: a, [S.B]: b } } });
  const withTape = (a, b) => ({ ...S, bubbles: { ...S.bubbles, tape: { [S.A]: a, [S.B]: b } } });

  it('bubble count: a stack per turn, a pill per bubble, capped at six with a 6+ mark', () => {
    const html = render('bubble', withTape([1, 3, 9], [2]));
    const rowA = html.split('class="tp-row"')[1];
    expect(rowA.match(/class="tp-stack/g)).toHaveLength(3);
    expect(rowA.match(/<i /g)).toHaveLength(1 + 3 + 6);
    expect(rowA).toMatch(/class="tp-stack big"/);
  });

  it('talker: an even split zips the two together instead of stacking them', () => {
    expect(render('share', withTalk([510, 490], { talker: null }))).toMatch(/class="zipper"/);
    expect(render('share', withTalk([700, 300], { talker: S.A }))).toMatch(/class="stacks"/);
  });

  const R = shape(3, 25, 14, [25, 22, 18, 21, 14]), O = shape(2, 49, 3, [49, 27, 13, 8, 3]), N = shape(2, 39, 3, [39, 28, 19, 11, 3]);
  const verdict = (a, b) => render('bubble', withShape({ ...a, type: texterType(a) }, { ...b, type: texterType(b) }));

  it('bubble count: names the pair, never hedges', () => {
    expect(verdict(R, O)).toMatch(/The essay and the ‘ok’/);
    expect(verdict(O, R)).toMatch(/The essay and the ‘ok’/);
    expect(verdict(R, R)).toMatch(/Two ranters/);
    expect(verdict(R, N)).toMatch(new RegExp(`${S.A} rants`));
    expect(verdict(O, O)).toMatch(/Two telegrams/);
    expect(verdict(N, O)).toMatch(new RegExp(`${S.B} doesn’t do paragraphs`));
    expect(verdict(N, N)).toMatch(/Suspiciously normal/);
  });

  it('bubble count: puts the real numbers in the roast', () => {
    const html = verdict(R, O);
    expect(html).toMatch(/14%/);
    expect(html).toMatch(/49%/);
  });

  it('bubble count: labels each bar with the person\'s type', () => {
    const html = verdict(R, O);
    expect(html).toMatch(/The Ranter/);
    expect(html).toMatch(/The One-Liner/);
    expect(html).not.toMatch(/class="ow-hero"/); // the verdict is the headline, not a number
  });
});

describe('one deck for any pair', () => {
  const ids = (s) => slidesFor(s).map((x) => x.id);
  const none = { [S.A]: 0, [S.B]: 0 };

  it('shows "I love you" and apologies only when the chat has them', () => {
    expect(ids(S)).toContain('love');
    expect(ids(S)).toContain('sorry');
    expect(ids({ ...S, love: none })).not.toContain('love');
    expect(ids({ ...S, sorry: none, sorryFirst: {} })).not.toContain('sorry');
  });
});

describe('the timeline', () => {
  it('marks the start, the peak and where you are now', () => {
    const html = render('arc');
    expect(html).toMatch(/class="arc"/);
    expect(html).toMatch(/Peak/);
    expect(html).toMatch(/Now/);
  });

  it('says the pace held when there was no real cool-down', () => {
    expect(render('arc', { ...S, arc: { ...S.arc, drop: null } })).toMatch(/kept a steady pace/);
  });

  it('leads the now line with the temperature and a line with teeth', () => {
    const now = (o) => render('arc', { ...S, arc: { ...S.arc, now: { ...S.arc.now, ...o } } });
    expect(now({ temp: 'cold', phase: 'quiet', silentDays: 119 })).toMatch(/Ice cold\..*119 days ago.*museum/);
    expect(now({ temp: 'hot', phase: 'peak', perWeek: 412 })).toMatch(/On heat\..*412 a week/);
    expect(now({ temp: 'room', phase: 'cooling', dropPct: 60, weeksSincePeak: 12 })).toMatch(/Room temperature\..*60%.*12 weeks/);
  });

  it('shows the matching temperature picture beside the now line', () => {
    const word = { cold: 'Ice cold', room: 'Room temperature', hot: 'On heat' };
    for (const temp of ['cold', 'room', 'hot']) {
      const html = render('arc', { ...S, arc: { ...S.arc, now: { ...S.arc.now, temp } } });
      expect(html).toMatch(new RegExp(`<img class="arc-temp" src="\\./temp/${temp}\\.webp" alt="[^"]+"`));
      expect(html.indexOf('arc-temp')).toBeGreaterThan(html.indexOf('ow-stmt'));
      expect(html.indexOf('arc-temp')).toBeLessThan(html.indexOf(word[temp]));
      expect(html).toMatch(/class="arc-now"><img class="arc-temp"[^>]*><span>/); // side by side: picture, then the line
    }
  });

  it('says how long the biggest cool-down lasted', () => {
    expect(render('arc', { ...S, arc: { ...S.arc, drop: { from: new Date(2025, 10, 10), to: new Date(2026, 1, 23), weeks: 15 } } })).toMatch(/15 weeks/);
  });

  it('skips a chat too short to have an arc', () => {
    expect(slidesFor({ ...S, arc: { ...S.arc, eligible: false } }).map((x) => x.id)).not.toContain('arc');
  });
});

describe('night owls on a light ground', () => {
  it('draws daytime hours in the ink, not the pale tint', () => {
    const html = render('night', { ...S, late: S.late || 1 });
    expect(html).not.toMatch(/background:var\(--tint\)/);
  });
});

describe('the comebacks', () => {
  it('teases without belittling: no crawling, no cockroaches, in either language', async () => {
    const { STRINGS } = await import('../src/i18n.js');
    const all = JSON.stringify(Object.values(STRINGS).map((l) => Object.values(l).map((v) => (typeof v === 'function' ? v.toString() : v))));
    expect(all).not.toMatch(/crawl|cockroach|merangkak|lipas/i);
  });

  const at = (c) => ({ ...S, comebacks: { ...S.comebacks, ...c } });
  const longest = { days: 46, from: new Date(2026, 3, 29), to: new Date(2026, 5, 14), who: S.A };

  it('names who kept coming back, with teeth when it is a habit', () => {
    const html = render('comebacks', at({ count: 7, by: { [S.A]: 5, [S.B]: 2 }, longest }));
    expect(html).toMatch(/went dark/);
    expect(html).toMatch(new RegExp(`${S.A} brought it back 5 of those times`));
    expect(html).toMatch(/defibrillator/);
    expect(html).toMatch(/46 days/);
  });

  it('says time, not times, for a single silence, and doesn\'t repeat itself', () => {
    const html = render('comebacks', at({ count: 1, by: { [S.A]: 0, [S.B]: 1 }, longest: { ...longest, days: 15, who: S.B } }));
    expect(html).toMatch(/time this chat went dark/);
    expect(html).not.toMatch(/times this chat|Once\./);
    expect(html).toMatch(new RegExp(`${S.B} broke the silence`));
  });

  it('says every time when one person made all the comebacks', () => {
    expect(render('comebacks', at({ count: 2, by: { [S.A]: 2, [S.B]: 0 }, longest }))).toMatch(new RegExp(`${S.A} brought it back every time`));
  });

  it('calls it fair when they took turns', () => {
    expect(render('comebacks', at({ count: 4, by: { [S.A]: 2, [S.B]: 2 }, longest }))).toMatch(/took turns/);
  });

  it('has its own line for a chat that never went dark', () => {
    const html = render('comebacks', at({ count: 0, by: { [S.A]: 0, [S.B]: 0 }, longest: null, longestGap: 9 }));
    expect(html).toMatch(/Never once went dark/);
    expect(html).toMatch(/9 days/);
  });

  it('draws the strip with a mark at each comeback', () => {
    const html = render('comebacks', at({ spans: [{ from: 0, to: 0.4 }, { from: 0.6, to: 1 }], marks: [{ at: 0.6, who: S.B }] }));
    expect(html).toMatch(/class="cb-strip"/);
    expect(html.match(/class="cb-span"/g)).toHaveLength(2);
    expect(html.match(/class="cb-mark b"/g)).toHaveLength(1);
  });

  it('skips a chat too short for comebacks', () => {
    expect(slidesFor({ ...S, comebacks: { eligible: false } }).map((x) => x.id)).not.toContain('comebacks');
  });
});
