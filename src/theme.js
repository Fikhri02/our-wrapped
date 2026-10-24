// One look for every story: a denim chat log, each slide carrying its own accent (teal by
// default).
export const THEME = { bg: '#E9ECF2', fg: '#1E2433', muted: '#4D5568', surface: '#FFFFFF', line: '#C9D1E0' };

// Accents: [accent, tint]. The tint highlights; the accent marks.
export const ACCENTS = {
  teal: ['#276A60', '#C6E3DD'],
  denim: ['#3D5A99', '#C9D3EA'],
  terracotta: ['#A84A35', '#F2D6CC'],
  ochre: ['#7A5E0E', '#EFE0B0'],
  violet: ['#5B57A6', '#DAD8F1'],
};

// Paints a card. --tone, --hi and --panel are the names the slide art already uses, so they
// follow the accent.
export function paint(card, accent = 'teal') {
  const [acc, tint] = ACCENTS[accent] || ACCENTS.teal;
  card.style.background = THEME.bg;
  card.style.color = THEME.fg;
  const vars = { '--bg': THEME.bg, '--fg': THEME.fg, '--muted': THEME.muted, '--surface': THEME.surface, '--line': THEME.line,
    '--accent': acc, '--tint': tint, '--deep': THEME.fg, '--tone': acc, '--hi': acc, '--panel': tint };
  for (const [k, v] of Object.entries(vars)) card.style.setProperty(k, v);
}
