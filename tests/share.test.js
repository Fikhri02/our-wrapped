import { describe, expect, it } from 'vitest';
import { EXPORT, shareFileName } from '../src/share.js';

describe('share card', () => {
  it('exports at 1080×1920, the story size Instagram and WhatsApp expect', () => {
    expect(EXPORT.width * EXPORT.pixelRatio).toBe(1080);
    expect(EXPORT.height * EXPORT.pixelRatio).toBe(1920);
  });

  it('names the file after the slide and the local date', () => {
    expect(shareFileName('share', new Date(2026, 9, 24, 0, 30))).toBe('chat-wrapped-share-2026-10-24.png');
  });
});
