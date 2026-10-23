# Our Wrapped

A year-in-review story for two people, built from a WhatsApp chat export. It's like a music-app yearly recap, but the data is your conversation.

Everything runs in the browser. The chat file never leaves the device: no backend, no upload, no account.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # parser + stats tests
npm run build   # static site in dist/
```

## Live

https://fikhri02.github.io/our-wrapped/ deploys from `main` on every push (tests must pass first).

## Export a chat

- **Android:** open the chat → ⋮ → More → Export chat → Without media → save the .txt
- **iPhone:** open the chat → tap the name → Export Chat → Without Media → unzip, then use `_chat.txt`

Keep real chats out of git. `chats/` and `*_chat.txt` are gitignored.

## Layout

| File | Does |
|------|------|
| `src/parser.js` | .txt → `{ when, who, text, media, deleted }[]` (Android/iPhone, 12h/24h, day/month-first) |
| `src/stats.js` | One pure function per slide's data, bundled by `stats()` |
| `src/slides.js` | The 12 slides: a palette plus `render(stats)` each |
| `src/player.js` | Story player: progress bars, tap zones, arrow keys, auto-advance |
| `src/sample.js` | Seeded, made-up example chat |
| `src/main.js` | Wires the file input to parser → stats → player |
