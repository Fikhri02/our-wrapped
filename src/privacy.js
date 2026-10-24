// Saved images can end up in public Stories. These slides can print private text (messages,
// a quote, words that may be friends' names, your own names on the finale), so each can hide
// it when saved. Words default to hidden: name detection can't be trusted with lowercase Malay
// names and nicknames.
export const PRIVATE_SLIDES = ['first', 'sorry', 'words', 'finale'];
export const DEFAULT_HIDE = { first: false, sorry: true, words: true, finale: false };

// The saved choice from storage, falling back to the defaults for anything missing or broken.
export function readHide(raw) {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object') {
      return Object.fromEntries(PRIVATE_SLIDES.map((id) => [id, typeof v[id] === 'boolean' ? v[id] : DEFAULT_HIDE[id]]));
    }
  } catch { /* not JSON: use the defaults */ }
  return { ...DEFAULT_HIDE };
}
