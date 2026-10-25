import { describe, expect, it } from 'vitest';
import { WELCOME_KEY, shouldWelcome, markWelcomed } from '../src/welcome.js';
import { setLang, t } from '../src/i18n.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

describe('first-visit privacy popup', () => {
  it('shows on the first visit and not after it is dismissed', () => {
    const s = memory();
    expect(shouldWelcome(s)).toBe(true);
    markWelcomed(s);
    expect(s.getItem(WELCOME_KEY)).toBe('1');
    expect(shouldWelcome(s)).toBe(false);
  });

  it('still reassures when storage is blocked, and never throws', () => {
    expect(shouldWelcome(blocked)).toBe(true);
    expect(() => markWelcomed(blocked)).not.toThrow();
  });

  it('says plainly where the chat goes, in both languages', () => {
    setLang('en');
    expect(t('welcomeTitle')).toMatch(/stays with you/i);
    expect(t('welcomeNoUpload')).toMatch(/never uploaded/i);
    setLang('ms');
    expect(t('welcomeTitle')).toMatch(/kekal/i);
    expect(t('welcomeOk')).toBeTruthy();
    setLang('en');
  });
});
