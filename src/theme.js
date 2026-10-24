// The story in five chapters, each on its own colours: warm paper for how it began, denim
// for how you talk, rose for what you say, midnight for your time, sage for where it went.
// Every text pair passes WCAG AA (see theme.test.js).
export const CHAPTERS = {
  1: { bg: '#F4EBDD', fg: '#262332', muted: '#5E5347', accent: '#86512E', tint: '#E9D4BC', surface: '#FFFFFF', line: '#E2D3BF' },
  2: { bg: '#E9ECF2', fg: '#1E2433', muted: '#4D5568', accent: '#3D5A99', tint: '#D5DFF0', surface: '#FFFFFF', line: '#C9D1E0' },
  3: { bg: '#F5E5E5', fg: '#302331', muted: '#5E4A55', accent: '#8E4058', tint: '#EBD0D9', surface: '#FFFFFF', line: '#E8CED5' },
  4: { bg: '#20283E', fg: '#F5F1E9', muted: '#B9B6C6', accent: '#E9BE74', tint: '#353F57', surface: '#2E3754', line: '#3A4462' },
  5: { bg: '#E7EEE8', fg: '#20332F', muted: '#4A5A54', accent: '#276A60', tint: '#CDE1DA', surface: '#FFFFFF', line: '#C9D9D1' },
};

// Paints a card in its chapter's colours. --tone, --hi and --panel are the names the slide
// art already uses, so they follow the accent.
export function paint(card, chapter = 2) {
  const ch = CHAPTERS[chapter] || CHAPTERS[2];
  card.dataset.chapter = String(CHAPTERS[chapter] ? chapter : 2);
  card.style.background = ch.bg;
  card.style.color = ch.fg;
  const vars = { '--bg': ch.bg, '--fg': ch.fg, '--muted': ch.muted, '--surface': ch.surface, '--line': ch.line,
    '--accent': ch.accent, '--tint': ch.tint, '--deep': ch.fg, '--tone': ch.accent, '--hi': ch.accent, '--panel': ch.tint };
  for (const [k, v] of Object.entries(vars)) card.style.setProperty(k, v);
}
