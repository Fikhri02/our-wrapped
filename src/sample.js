// A made-up example chat (seeded, so it is the same every load), in Android export format.

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n) => (n < 10 ? '0' : '') + n;

const A = 'Me', B = 'Sayang';
const MORNING = { [A]: ['Selamat pagi sayang ☀️', 'morning!! dah bangun?', 'gm 🥱', 'pagi ❤️ jangan lupa sarapan'], [B]: ['morninggg ☀️', 'pagi 😴', 'good morning sayang 🥰'] };
const DAY = {
  [A]: ['lunch apa harini?', 'meeting lagi 😩', 'nanti I call ok', 'traffic teruk gila 🚗', 'haha', 'okay noted 👍', 'rindu 🥺', 'teh tarik tak?', 'eh tengok ni 😂', 'I belanja dinner malam ni', 'love you ❤️'],
  [B]: ['nasi lemak je 😋', 'haha', 'okayyy', 'miss you 🥺', 'HAHAHA 😂😂', 'tengah buat kerja', 'balik pukul berapa?', 'sayang you ❤️', 'nak boba 🧋', 'penat 😮‍💨', 'eh comel nya 🥹'],
};
const NIGHT = {
  [A]: ['dah tidur?', 'esok kita keluar nak?', 'goodnight sayang 🌙', 'sorry tadi lambat reply 🙏', 'sleep la, dah lewat', 'tengok series tu tak?'],
  [B]: ['belum 😴', 'okay jom!', 'goodnight ❤️', 'sorry I tertidur 😭', '5 minit lagi...', 'esok la cerita 🥱'],
};

export function makeSample() {
  const r = rng(1987);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const other = (w) => (w === A ? B : A);
  const out = [];
  const line = (d, h, m, who, text) =>
    out.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(h)}:${pad(m)} - ${who}: ${text}`);

  const start = new Date(2026, 6, 1);
  out.push('01/07/2026, 21:14 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.');
  line(start, 21, 14, A, 'hi, is this the person who lent me a pen at the café? 😅');
  line(start, 21, 19, B, 'HAHA yes. you still have my pen');
  line(start, 21, 20, B, 'I want it back 😤');
  line(start, 21, 22, A, 'then we have to meet again 🙃');

  for (let i = 1; i < 114; i++) {
    const d = new Date(2026, 6, 1 + i);
    if (r() < 0.04) continue;
    const first = r() < 0.64 ? A : B;
    line(d, 6 + Math.floor(r() * 3), Math.floor(r() * 60), first, pick(MORNING[first]));

    let hr = 9;
    const n = 4 + Math.floor(r() * 9);
    for (let j = 0; j < n; j++) {
      hr += Math.floor(r() * 2);
      if (hr > 21) break;
      const w = r() < 0.52 ? A : B;
      let txt = pick(DAY[w]);
      if (r() < 0.06) txt = '<Media omitted>';
      if (r() < 0.03) txt = 'ok so\nI was thinking\nwhat if we went to Penang 👀';
      line(d, hr, Math.floor(r() * 60), w, txt);
      if (r() < 0.6) line(d, hr, Math.min(59, Math.floor(r() * 60)), other(w), pick(DAY[other(w)]));
    }

    let lh = 22, lm = Math.floor(r() * 30);
    const late = 2 + Math.floor(r() * 5);
    for (let k = 0; k < late; k++) {
      const w = k % 2 === 0 ? (r() < 0.55 ? A : B) : r() < 0.5 ? B : A;
      lm += 4 + Math.floor(r() * 20);
      if (lm > 59) { lm -= 60; lh++; }
      if (lh > 23) break;
      line(d, lh, lm, w, pick(NIGHT[w]));
    }
    if (r() < 0.35) {
      line(new Date(2026, 6, 2 + i), Math.floor(r() * 3), Math.floor(r() * 60), r() < 0.5 ? A : B,
        pick(['still awake? 👀', 'tak boleh tidur', 'okay okay tidur dah 🌙', '5 minit je lagi 😴']));
    }
    if (i === 62) {
      for (let b = 0; b < 38; b++) {
        line(d, 13 + Math.floor(b / 4), (b * 7) % 60, b % 2 ? A : B,
          pick(['YES', 'okay okay', '🥹🥹🥹', "I can't believe it", 'HAHAHA', 'love you ❤️', 'sayang you 😭']));
      }
    }
  }

  const key = (s) => { const m = s.match(/^(\d\d)\/(\d\d)\/(\d{4}), (\d\d):(\d\d)/); return m ? m[3] + m[2] + m[1] + m[4] + m[5] : ''; };
  out.sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0));
  return out.join('\n');
}
