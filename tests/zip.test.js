import { describe, expect, it } from 'vitest';
import { crc32, zipStore } from '../src/zip.js';

const bytes = (s) => new TextEncoder().encode(s);
const u32 = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24) >>> 0;
const u16 = (b, i) => b[i] | (b[i + 1] << 8);

describe('download all: a zip of the slides', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(bytes('hello'))).toBe(0x3610a686);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('stores each file whole, with a central directory that lists them all', () => {
    const z = zipStore([{ name: 'a.png', data: bytes('hello') }, { name: 'b.png', data: bytes('world!') }]);
    expect(u32(z, 0) >>> 0).toBe(0x04034b50); // first local header
    expect(new TextDecoder().decode(z.slice(30, 35))).toBe('a.png');
    expect(new TextDecoder().decode(z.slice(35, 40))).toBe('hello'); // stored, not compressed
    const end = z.length - 22;
    expect(u32(z, end) >>> 0).toBe(0x06054b50); // end of central directory
    expect(u16(z, end + 10)).toBe(2); // two entries
    const cd = u32(z, end + 16);
    expect(u32(z, cd) >>> 0).toBe(0x02014b50);
    expect(u32(z, cd + 16) >>> 0).toBe(0x3610a686); // the entry carries the file's CRC
  });
});
