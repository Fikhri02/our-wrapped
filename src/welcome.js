// The first-visit popup that says where the chat goes (nowhere). Shown once per device; if
// storage is blocked it shows every time, which is better than never reassuring anyone.
export const WELCOME_KEY = 'our-wrapped-welcomed';

export function shouldWelcome(storage) {
  try { return storage.getItem(WELCOME_KEY) !== '1'; } catch { return true; }
}

export function markWelcomed(storage) {
  try { storage.setItem(WELCOME_KEY, '1'); } catch { /* storage blocked: it shows again next time */ }
}
