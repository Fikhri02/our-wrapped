# Our Wrapped Two Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the person pick LOVERS or CASUAL after uploading a chat, play the story in that mode's theme with five new playful stats, and replay it as the other mode from Results.

**Architecture:** The mode rides on the stats object (`S.mode`), so every existing `render(S)` and `skip(S)` can read it without new plumbing. Per-slide palettes (`PALETTES`, `pal`) are replaced by two themes in a new `src/theme.js`; `paint(card, mode, accent)` sets CSS variables and a `data-mode` the stylesheet keys fonts and colours off. The five new stats live in `src/vibes.js` with their word lists in `src/lexicon.js`, bundled into `stats()`.

**Tech Stack:** Vite 7, vanilla JS ES modules, Vitest 3 (`environment: 'node'`, no DOM), `@fontsource` self-hosted fonts, html-to-image.

**Spec:** `brainstorming/active/our-wrapped-two-modes.md` (memory root). Visual reference: https://claude.ai/artifact/VAsjkZVPAkEDQdEm23xYyt, boards "LOVERS bg C · Flat blush" and "CASUAL picked · denim base, one accent per slide".

## Global Constraints

- Start from `main` **after** the other session's `rant-spacing` work (uncommitted `src/slides.js`, `src/style.css`, adding a `night` palette) is merged. Work in a new worktree on branch `two-modes`.
- Commit messages follow the repo's style: one plain sentence, sentence case, no prefix, **no trailers of any kind**. Stage files by name, never `git add .`.
- No upload, backend or analytics; nothing new leaves the device.
- Every string lives in `src/i18n.js` in both `en` and `ms` (parity test must pass). Malay stays casual ("korang").
- Fonts self-hosted via `@fontsource` only.
- LOVERS tokens: ground `#E9CCCA`, ivory `#FAF4EC`, burgundy `#743F51`, deep `#5A2238`, ink `#2E1D25`, muted `#4A3640`. Fonts Fraunces (headlines, quotes) + DM Sans (body, numbers).
- CASUAL tokens: ground `#E9ECF2`, surface `#FFFFFF`, ink `#1E2433`, muted `#4D5568`, rule `#C9D1E0`. Accents (accent / tint): teal `#276A60`/`#C6E3DD` (default), denim `#3D5A99`/`#C9D3EA`, terracotta `#A84A35`/`#F2D6CC`, ochre `#7A5E0E`/`#EFE0B0`, violet `#5B57A6`/`#DAD8F1`. Fonts Plus Jakarta Sans + IBM Plex Mono.
- No decorative shapes, photos or illustrations on slides; flat ground, no gradients or patterns.
- Every interpretive slide carries a playful hedge line; no slide states a feeling or personality as fact.
- Tabular figures for numbers; WCAG AA for every text pair; reduced motion respected.
- New slides print lexicon phrases, labels and numbers only — never message text — so none joins `PRIVATE_SLIDES`.

## Review Focus

- A chat with very few affectionate or emotional words (a dry friends' chat): love language, emotional playlist and weather must skip, not show "0%" or NaN. Pinned in Task 2 (`eligible:false` tests) and Task 3 (skip test).
- A one-sided chat (person B barely writes): creatures and style sync must skip or not divide by zero. Pinned in Task 1.
- Negation and traps: "tak sedih", "not happy" must not count; 😭 is not counted as sadness. Pinned in Task 2.
- Replay as the other mode after changing the date range: the replay keeps the chosen range and the closing note. Pinned by the manual check in Task 5.
- Saving a slide from each mode: the PNG uses that mode's colours and fonts, not the previous mode's. Pinned by the manual check in Task 4.

---

### Task 0: Worktree, fonts, plan copy

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `docs/superpowers/plans/2026-10-24-our-wrapped-two-modes.md` (copy of this file)

- [ ] **Step 1:** Confirm `main` contains the merged `rant-spacing` work (`git log main --oneline -5`; the `night` palette exists in `src/slides.js` on `main`). If not, stop and ask Irfan.
- [ ] **Step 2:** Create the worktree with superpowers:using-git-worktrees: branch `two-modes` from `main`.
- [ ] **Step 3:** `npm install @fontsource/fraunces @fontsource/dm-sans @fontsource/plus-jakarta-sans @fontsource/ibm-plex-mono`
- [ ] **Step 4:** Run `npm test`. Expected: all existing tests pass (baseline).
- [ ] **Step 5:** Copy this plan to `docs/superpowers/plans/2026-10-24-our-wrapped-two-modes.md`; commit `package.json package-lock.json docs/superpowers/plans/2026-10-24-our-wrapped-two-modes.md` with "Add the two-modes plan and its fonts".

---

### Task 1: Style sync and chat creatures (timestamp and shape stats)

**Files:**
- Create: `src/vibes.js`, `tests/vibes.test.js`

**Interfaces:**
- Consumes: parsed messages `{ when: Date, who: string, text: string, media: boolean, deleted: boolean }[]`; `pair: [A, B]`.
- Produces:
  - `styleSync(msgs, pair) → { eligible: boolean, then: number, now: number, delta: number }` — percentages 0–100, integers.
  - `creatures(msgs, pair) → { eligible: boolean, score: { [p]: number }, set: 'energy'|'length'|'loud', high: string|null, night: { [p]: boolean } }`.
  - `FUNCTION_WORDS` (exported array).

`styleSync` algorithm (not determined by the tests alone):
```
text msgs only (not media/deleted, non-empty). Split by index into first third (early) and last third (late).
For each window and person: count tokens matching FUNCTION_WORDS (lowercased, whole words), divide by that person's total FW tokens → frequency vector.
similarity = 1 − ½·Σ|fA(w) − fB(w)|  → 0..1, ×100, rounded.
eligible = every person has ≥ 150 FW tokens in each window.
delta = now − then.
FUNCTION_WORDS = i you we me my your our and but so the a to aku kau awak saya kita kami dia lah je kan pun ke tak nak dah ni tu yang dengan
```

`creatures` algorithm:
```
Per person, five features over their text messages: average words per message; messages per turn (consecutive run by the same sender within 10 min, as bubbles() does); loud rate (share of messages with "!!" or a run of 3+ capital letters); emoji per message (graphemes matching \p{Extended_Pictographic}); conversation starts (conversations(msgs, quietHours(msgs, pair)) from stats.js).
For each feature, person share = mine / (mine + theirs) (0.5 when both are 0). score = round(mean of the five shares × 100), so the two scores sum to about 100.
high = the higher scorer, or null when |scoreA − scoreB| < 6 (matched energy).
set = the feature group with the largest gap between the two: length+turns → 'length', loud+emoji → 'loud', otherwise 'energy'.
night[p] = ≥ 15% of p's messages sent between 00:00 and 03:59.
eligible = each person has ≥ 50 text messages.
```

- [ ] **Step 1: Write the failing tests** in `tests/vibes.test.js` with a small helper `chat(lines)` building messages from `[who, 'HH:MM', text]` on consecutive days:
  - `styleSync` returns `now: 100` when both people send identical function-word text in the last third, and `then < 50` when their first-third texts share no function words.
  - `styleSync` returns `eligible: false` (and no NaN anywhere) when B sends fewer than 150 function words in a window.
  - `creatures` gives the person with longer, louder, emoji-heavy bursts the higher score, scores sum to 100 ± 1, and `high` is that person.
  - `creatures` returns `high: null` for two people with identical messages.
  - `creatures` sets `night[A] = true` when 20% of A's messages are at 01:30.
  - `creatures` returns `eligible: false` when B has 10 messages.
- [ ] **Step 2:** Run `npx vitest run tests/vibes.test.js`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `styleSync` and `creatures` in `src/vibes.js`, importing `conversations` and `quietHours` from `./stats.js`.
- [ ] **Step 4:** Run `npx vitest run tests/vibes.test.js`. Expected: PASS.
- [ ] **Step 5:** Commit `src/vibes.js tests/vibes.test.js`: "Measure how alike two people type and how loud each one texts".

---

### Task 2: Word lists, love language, emotions, weather

**Files:**
- Create: `src/lexicon.js`
- Modify: `src/vibes.js`, `tests/vibes.test.js`

**Interfaces:**
- Produces:
  - `LOVE_LEX`, `FRIEND_LEX`: `{ words, time, service, gifts, touch }`, each an array of lowercase phrases.
  - `EMO_LEX`: `{ joy, love, sadness, anger, worry, surprise }`, each `{ words: string[], emoji: string[] }`.
  - `languages(msgs, pair, lex) → { [p]: { eligible: boolean, n: number, pct: { words, time, service, gifts, touch }, primary: string|null } }`.
  - `emotions(msgs, pair) → { eligible: boolean, all: Mix, [p]: Mix }` where `Mix = { n: number, pct: { joy, love, sadness, anger, worry, surprise } }`.
  - `weather(msgs, pair) → { eligible: boolean, label: WeatherId, standout: { month: Date, label: WeatherId } | null }`, `WeatherId = 'sunshine'|'golden'|'chaotic'|'thunder'|'cloud'|'storm'|'rain'`.

Seed lists (extend freely, keep these): LOVE — words: sayang, love you, proud of you, bangga, cantik, handsome; time: jom keluar, date night, lepak sama, jumpa, spend time; service: dah makan, nak i belikan, i tolong, dah sampai, drive safe; gifts: hadiah, surprise, beli untuk you, present; touch: peluk, hug, cuddle, cium, kiss, pegang tangan. FRIEND — the same five keys with no romantic terms: words: proud of you, bangga, terbaik, you got this; time: jom lepak, jumpa, mamak, call jap; service: dah makan, tolong, dah sampai, drive safe; gifts: belanja, hadiah, treat you, present; touch: peluk, hug, high five. EMO — joy: haha(ha)+, best, yay, seronok, happy, lawak, 😂 😆 😄 😁 🥳 🎉; love: sayang, love, rindu, miss you, ❤ 🥰 😍 😘; sadness: sedih, sad, nangis, cry, kecewa, 😢 🥲; anger: marah, annoying, benci, hate, menyampah, 😡 😤; worry: risau, takut, worried, scared, nervous, cuak, 😰 😟; surprise: omg, wait what, seriously, terkejut, 😮 😱 🤯. 😭 and "geram" are in no list.

Rules: phrases match on word boundaries, case-insensitive; a match preceded within two words by `tak|not|no|bukan|x|tidak` is ignored. `languages`: each message counts once, under the category of its longest matched phrase; `pct` over that person's classified messages; `primary` = highest, null when not eligible; eligible = n ≥ 10. `emotions`: a message matching k emotions adds 1/k to each; pct rounded to integers; eligible = `all.n` ≥ 30. `weather` uses `emotions` for the whole chat and per calendar month with n ≥ 20: if love and joy are the top two and both ≥ 30% → golden; else if the top share < 35% → chaotic; else joy → sunshine, love → golden, surprise → thunder, worry → cloud, anger → storm, sadness → rain. `standout` = the eligible month whose label differs from the overall label with the highest top share, else null.

- [ ] **Step 1: Write the failing tests**:
  - `languages(..., LOVE_LEX)`: A sends 8 "dah makan?" and 4 "sayang" → `primary: 'service'`, `pct.service: 67`, `pct.words: 33`; "nak i belikan" counts as service, not gifts.
  - `languages` with 5 classified messages → `eligible: false`, `primary: null`.
  - `emotions`: "tak sedih pun" counts as nothing; "haha omg" splits 0.5 joy / 0.5 surprise; "😭" counts as nothing; pct sums to 100 ± 1.
  - `weather`: a chat that is 70% joy messages → `label: 'sunshine'`; the same chat with an August of 25 "risau" messages → `standout.label: 'cloud'` and `standout.month.getMonth() === 7`.
  - `emotions` on 20 emotional messages → `eligible: false`, and `weather` → `eligible: false`.
- [ ] **Step 2:** Run `npx vitest run tests/vibes.test.js`. Expected: the new tests FAIL.
- [ ] **Step 3:** Create `src/lexicon.js` with the lists; implement `languages`, `emotions`, `weather` in `src/vibes.js`.
- [ ] **Step 4:** Run `npx vitest run tests/vibes.test.js`. Expected: PASS.
- [ ] **Step 5:** Commit `src/lexicon.js src/vibes.js tests/vibes.test.js`: "Read love languages, emotions and the chat's weather from word lists".

---

### Task 3: Modes in the story — which slides, new slides, copy

**Files:**
- Modify: `src/stats.js` (the `stats()` return), `src/slides.js`, `src/i18n.js`, `tests/story.test.js`, `tests/i18n.test.js`

**Interfaces:**
- Consumes: Task 1 and 2 functions.
- Produces:
  - `stats(all, now)` adds `sync`, `creatures`, `loveLang` (`languages(..., LOVE_LEX)`), `friendLang` (`languages(..., FRIEND_LEX)`), `emotions`, `weather`. It does **not** set `mode`; callers add it (`{ ...stats(msgs), mode }`).
  - `MODES = ['lovers', 'casual']`, `otherMode(mode) → mode` in `src/slides.js`.
  - A slide may carry `only: 'lovers' | 'casual'`; `slidesFor(S)` drops slides whose `only` differs from `S.mode`, then applies `skip`.
  - New slide ids, in this order after `busy` and before `finale`: `sync`, `creatures`, `language`, `weather`, `playlist`.
  - `tm(key, S, ...args)` in `src/i18n.js`: returns `t(\`${key}_${S.mode}\`, ...args)` when that key exists, else `t(key, ...args)`.

Slide content (wording is the builder's; these are the decisions):
- `sync`: then → now percentages and a one-line verdict; delta ≥ 3 → "starting to type alike" (LOVERS "a little more in sync", CASUAL "same brain cell"); otherwise "kept your own voices". skip when not eligible.
- `creatures`: each person's name, score and archetype label. Label keys `creature_${mode}_${set}_${'hi'|'lo'}` plus `creature_${mode}_tie`; LOVERS sets: energy Sunshine/Moonlight, length Love Letter/Sweet Nothing, loud Fireworks/Slow Dance; CASUAL sets: energy Golden Retriever/Black Cat, length Radio DJ/Silent Observer, loud Confetti Cannon/Deadpan Legend. "Night Shift Edition" suffix when `night[p]`. Hedge: "Texting personality only. Offline behaviour remains classified." skip when not eligible.
- `language`: LOVERS reads `S.loveLang` ("love language"), CASUAL reads `S.friendLang` ("friendship language"); each person's primary and the five percentages as bars. Hedge: "According to your texts, anyway. Real-life hugs not included." skip unless at least one person is eligible.
- `weather`: label as a forecast headline plus the standout month when present. Hedge: "Based on chat language, not the weather in your hearts." skip when not eligible.
- `playlist`: the six-emotion split overall and per person. Hedge: "Sarcasm may have escaped detection." skip when not eligible.
- `sorry` and `love` get `only: 'lovers'`.
- Mode-specific wording of existing slides goes through `tm` where it reads better; at least the `finale` kicker and `intro` line differ per mode.

- [ ] **Step 1: Write the failing tests** in `tests/story.test.js`:
  - The slide order test becomes `[...current order up to 'busy', 'sync', 'creatures', 'language', 'weather', 'playlist', 'finale']`.
  - `slidesFor({ ...S, mode: 'casual' })` contains no `sorry` or `love`; `slidesFor({ ...S, mode: 'lovers' })` contains both.
  - Rendering `language` in CASUAL mode contains the friendship-language kicker and in LOVERS mode the love-language kicker.
  - Every new slide's render contains no text from any sample message (`makeSample()` lines) longer than 12 characters — the privacy rule.
  - With a chat whose `emotions.eligible` is false, `slidesFor` contains no `weather` or `playlist`.
  - The giant-number rule test still passes with the new slides.
  - `otherMode('lovers') === 'casual'` and back.
- [ ] **Step 2:** In `tests/i18n.test.js`, render every slide in Malay for **both** modes (`{ ...S, mode }`), same assertions.
- [ ] **Step 3:** Run `npm test`. Expected: the new and changed tests FAIL.
- [ ] **Step 4:** Implement: `stats()` fields; `MODES`, `otherMode`, `only`, the five slides and `tm`; all strings in `en` and `ms`.
- [ ] **Step 5:** Run `npm test`. Expected: PASS, including the en/ms parity test.
- [ ] **Step 6:** Commit `src/stats.js src/slides.js src/i18n.js tests/story.test.js tests/i18n.test.js`: "Add the two modes and five new slides to the story".

---

### Task 4: The two themes

**Files:**
- Create: `src/theme.js`, `tests/theme.test.js`
- Modify: `src/slides.js` (remove `PALETTES`, `paint`, `pal`, the decoration helpers), `src/player.js:59`, `src/share.js:20`, `src/main.js` (`renderGallery`), `src/style.css`, `src/main.js` imports for fonts

**Interfaces:**
- Produces:
  - `THEMES: { lovers: Tokens, casual: Tokens }` with the Global Constraints values, `ACCENTS: { teal, denim, terracotta, ochre, violet }` each `[accent, tint]`.
  - `paint(card, mode, accent = 'teal')` — sets `card.dataset.mode = mode` and CSS variables `--bg --fg --muted --accent --tint --surface --line` on `card.style` via `setProperty`. LOVERS ignores `accent` (accent = burgundy `#743F51`, tint = ivory `#FAF4EC`).
  - Slides carry `accent` (one of the `ACCENTS` keys) instead of `pal`; the builder assigns them (all five may be used).
- Consumes: `S.mode` from Task 3.

- [ ] **Step 1: Write the failing tests** in `tests/theme.test.js` with a fake card `{ dataset: {}, style: { props: {}, setProperty(k, v) { this.props[k] = v; } } }`:
  - `paint(card, 'lovers')` sets `--bg` `#E9CCCA`, `--accent` `#743F51`, `dataset.mode` `'lovers'`.
  - `paint(card, 'casual', 'ochre')` sets `--bg` `#E9ECF2`, `--accent` `#7A5E0E`, `--tint` `#EFE0B0`.
  - `paint(card, 'casual')` defaults to teal `#276A60`.
  - Every slide in `SLIDES` has an `accent` that is a key of `ACCENTS`, and no slide has `pal`.
  - `src/slides.js` source contains no hex colour literal (`/#[0-9a-f]{3,8}\b/i`) — read the file with `fs` in the test.
  - Each theme's ink on ground, and every CASUAL accent on ground, has contrast ≥ 4.5 (write a small `contrast(a, b)` helper in the test from the WCAG relative-luminance formula).
- [ ] **Step 2:** Run `npx vitest run tests/theme.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `src/theme.js`; replace `pal` with `accent` on every slide; swap inline colours in renders (the talker split, night bars) for `var(--accent)`, `var(--tint)`, `var(--fg)`; delete `decor`, `sun`, `hearts`, sky and dawn layers and their CSS; update the `paint` calls in `player.js` (use the stats object passed to `load`), `share.js` (`stats.mode`) and `renderGallery` (`current.mode`, `data-accent`).
- [ ] **Step 4:** In `style.css`, key the card's fonts off `.card[data-mode="lovers"]` (Fraunces headings/quotes, DM Sans body) and `.card[data-mode="casual"]` (Plus Jakarta Sans, IBM Plex Mono for kickers, footers, dates); import the four `@fontsource` packages (weights used only) where the existing ones are imported. LOVERS motion: slower entrance (about 600ms, no overshoot); CASUAL: quick (about 200ms); both off under `prefers-reduced-motion`.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6: Manual check.** `npm run dev`; load a real chat (Task 5 adds the popup — until then set `mode` in the console via the stats object or temporarily default `'lovers'`); step through every slide in each mode at phone width; save one slide per mode and open the PNG: colours and fonts match the mode. Compare against the canvas boards.
- [ ] **Step 7:** Commit `src/theme.js tests/theme.test.js src/slides.js src/player.js src/share.js src/main.js src/style.css`: "Paint slides in the LOVERS and CASUAL themes".

---

### Task 5: Pick a mode after upload, replay as the other

**Files:**
- Modify: `index.html`, `src/main.js`, `src/i18n.js`, `src/style.css`

**Interfaces:**
- Consumes: `otherMode`, `S.mode`, `paint`.
- Produces: page flow only.

Decisions: after `run()` parses a file with ≥ 10 messages, it opens a `<dialog id="modePick">` with two buttons, LOVERS ("Someone I love") and CASUAL ("A friend") — exact wording is the builder's — instead of going straight to the story. Picking a mode sets a module-level `mode`, calls `build(...)`, then `go('story')`. Closing the dialog without picking returns to Landing with nothing loaded. `build()` makes `current = { ...stats(msgs), range, mode }`. Results gets a button "Replay as {other mode}" that sets `mode = otherMode(mode)`, rebuilds with the current `shownRange` and note, and goes to the story. The landing preview (`playSample`) uses `{ ...sampleStats, mode: 'lovers' }`. The popup and Results chrome keep today's look. The mode is not remembered between uploads.

- [ ] **Step 1:** Add the dialog markup and the Results button in `index.html`, with `data-i18n` keys; add the strings in `en` and `ms`.
- [ ] **Step 2:** Wire `run`, `build`, `playSample` and the replay button in `src/main.js` as decided above.
- [ ] **Step 3:** Run `npm test` and `npm run build`. Expected: tests PASS, build succeeds.
- [ ] **Step 4: Manual check.** `npm run dev`, at phone width:
  - Upload → popup appears; Esc closes it and Landing shows no loaded chat.
  - Pick CASUAL → story in denim; no Apologies or "I love you" slides; finale then closing note last.
  - On Results, change the range, type a note, tap "Replay as lovers" → story in blush, same range, note slide last.
  - Switch language to Malay mid-flow → popup and new slides in Malay.
  - Landing example plays in the LOVERS theme.
- [ ] **Step 5:** Commit `index.html src/main.js src/i18n.js src/style.css`: "Ask lovers or friends after upload and let Results replay the other way".
