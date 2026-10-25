import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { setLang, t } from '../src/i18n.js';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

describe('privacy popup on every load', () => {
  it('opens with the page every time, remembering nothing', () => {
    expect(page).toMatch(/<div class="welcome" id="welcome" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">/);
    expect(main).not.toMatch(/welcomed|markWelcomed|shouldWelcome/);
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
