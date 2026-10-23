// Three screens, driven by the URL hash so the phone's back button steps between them.
// Story and Results need a loaded chat; without one (a refresh, a shared link) it's Landing.
export const SCREENS = ['landing', 'story', 'results'];

export function screenFor(hash, hasChat) {
  const name = hash.replace(/^#/, '');
  if (!hasChat || !SCREENS.includes(name)) return 'landing';
  return name;
}
