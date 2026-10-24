// The two looks a story plays in. LOVERS: one flat blush ground, burgundy and ivory.
// CASUAL: a denim chat log, with each slide carrying its own accent (teal by default).
export const THEMES = {
  lovers: { bg: '#E9CCCA', fg: '#2E1D25', muted: '#4A3640', accent: '#743F51', tint: '#FAF4EC', deep: '#5A2238', surface: '#FAF4EC', line: '#D3AFAE' },
  casual: { bg: '#E9ECF2', fg: '#1E2433', muted: '#4D5568', surface: '#FFFFFF', line: '#C9D1E0' },
};

// CASUAL accents: [accent, tint]. The tint highlights; the accent marks.
export const ACCENTS = {
  teal: ['#276A60', '#C6E3DD'],
  denim: ['#3D5A99', '#C9D3EA'],
  terracotta: ['#A84A35', '#F2D6CC'],
  ochre: ['#7A5E0E', '#EFE0B0'],
  violet: ['#5B57A6', '#DAD8F1'],
};

// Paints a card in its mode. --tone, --hi and --panel are the names the slide art already
// uses, so they follow the accent.
export function paint(card, mode, accent = 'teal') {
  const th = THEMES[mode] || THEMES.lovers;
  const [acc, tint] = mode === 'casual' ? (ACCENTS[accent] || ACCENTS.teal) : [th.accent, th.tint];
  card.dataset.mode = THEMES[mode] ? mode : 'lovers';
  card.style.background = th.bg;
  card.style.color = th.fg;
  const vars = { '--bg': th.bg, '--fg': th.fg, '--muted': th.muted, '--surface': th.surface, '--line': th.line,
    '--accent': acc, '--tint': tint, '--deep': th.deep || th.fg, '--tone': acc, '--hi': acc, '--panel': tint };
  for (const [k, v] of Object.entries(vars)) card.style.setProperty(k, v);
}
