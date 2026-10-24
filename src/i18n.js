// All copy in English and Bahasa Malaysia. Slides and the page read strings through t().
// The Malay is casual Malaysian ("korang", "bluetick"), the way couples actually text.

export const LANGS = ['en', 'ms'];
let lang = 'en';
export const getLang = () => lang;
export function setLang(l) { if (LANGS.includes(l)) lang = l; }

export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
};
export const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
};

// Emoji per 100 messages across the whole chat, both people together.
const emojiRate = (v) => {
  const ppl = Object.keys(v.total);
  const msgs = ppl.reduce((a, x) => a + (v.count?.[x] || 0), 0);
  return msgs ? (ppl.reduce((a, x) => a + v.total[x], 0) / msgs) * 100 : 0;
};

export const STRINGS = {
  en: {
    // page
    lede: 'Your chat, as a story. Export a WhatsApp chat as .txt "Without media" and drop it in. Everything happens on this device: no upload, no account.',
    useChat: 'Use my chat (.txt)',
    sample: 'Example chat',
    sampleLabel: 'Example chat (made up)',
    rangeLabel: 'Story covers',
    allTime: 'All time',
    last30: 'Last 30 days',
    noteLabel: 'Your message for the last slide',
    optional: '(optional)',
    notePlaceholder: 'Every number here is us. Thank you for every good morning.',
    signedPlaceholder: 'Signed (e.g. your name)',
    addNote: 'Add to the story',
    noteHint: 'Saved as a draft on this device only.',
    playStory: 'Play our story', anotherChat: 'Use another chat', resultsKicker: 'Your story, in full',
    closeStory: 'Close story', noteAdded: 'Added as the last slide.',
    pause: 'Pause', play: 'Play', restart: 'Restart', saveSlide: 'Save this slide',
    making: 'Making the image…', shared: 'Shared.', downloaded: 'Saved to your downloads.',
    shareFailed: "Couldn't make the image. Try again, or take a screenshot instead.",
    unreadable: '<b>That file has no messages I can read.</b> Export the chat as .txt "Without media", and unzip it first if you\'re on iPhone.',
    readFailed: "<b>Couldn't read that file.</b> Try exporting it again.",
    tooFew: (n, range) => `<b>Only ${n} messages in ${range}.</b> Pick a longer range.`,
    loaded: (n, a, b, days) => `${n} messages between ${a} and ${b} over ${days} days.`,
    group: ' This is a group chat, so only the two biggest senders are used.',
    private: ' Nothing left this device.',
    // reply units
    sec: (n) => `${n} sec`, min: (n) => `${n} min`, hr: (n) => `${n} hr`, underMin: '< 1 min',
    // slides
    since: (d) => `Since ${d}`,
    pace_inseparable: 'Most days, and a lot each time. You two are basically inseparable.',
    pace_bursts: 'Not every day, but when you two talk, you really talk.',
    pace_steady: 'A little, almost every day. The steady kind.',
    pace_occasional: 'Every now and then, and that\'s enough for you two.',
    paceNewEvery: (n) => `${n} days in, and you've talked every single day.`,
    paceNewSome: (n, d) => `${n} days in, and you've talked on ${d} of them.`,
    pace_inseparable_past: 'Most days, and a lot each time. You two were basically inseparable.',
    pace_bursts_past: 'Not every day, but when you two talked, you really talked.',
    pace_steady_past: 'A little, almost every day. You were the steady kind.',
    pace_occasional_past: 'Every now and then, and that was enough for you two.',
    paceNewEvery_past: (n) => `${n} days, and you talked every single day.`,
    paceNewSome_past: (n, d) => `${n} days, and you talked on ${d} of them.`,
    rangeFrom: (r, d) => `${r} · from ${d}`,
    whereStarted: 'Where it started',
    rangeFirst: (r) => `${r}: first message`,
    talker: 'The talker',
    matched: 'Perfectly matched. Almost.',
    hadMore: (w) => `${w} had more to say.`,
    // Roles from the talker table: whoever holds the talker role first, then the other; a
    // shared role gets its own note.
    rolesLine: (r, A, B, past) => {
      const label = { talker: 'the talker', storyteller: 'the storyteller', chaser: 'the chaser' };
      const shared = past
        ? { talker: 'You split the talking evenly.', storyteller: 'You wrote about the same length.', chaser: 'You both texted again about as often.' }
        : { talker: 'You split the talking evenly.', storyteller: 'You write about the same length.', chaser: 'You both text again about as often.' };
      const keys = ['talker', 'storyteller', 'chaser'];
      if (keys.every((k) => !r[k])) return 'Evenly matched on every count.';
      const list = (xs) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
      const first = r.talker || r.storyteller || r.chaser, other = first === A ? B : A;
      const out = [];
      for (const p of [first, other]) {
        const mine = keys.filter((k) => r[k] === p).map((k) => label[k]);
        if (mine.length) out.push(`${p} ${past ? 'was' : 'is'} ${list(mine)}.`);
        if (mine.length === 3) out.push(`${other} ${past ? 'got' : 'gets'} a word in.`);
      }
      for (const k of keys) if (!r[k]) out.push(shared[k]);
      return out.join(' ');
    },
    firstThought: 'Morning hellos',
    mornings: (w) => `mornings ${w}<br>texted first.`,
    morningFoot: 'Only fresh hellos between 5am and noon count, not replies to last night.',
    startsKicker: 'Who starts it',
    goodnightTie: 'You two take turns saying goodnight first.',
    carriedKicker: 'No goodbyes',
    carriedHead: 'No goodnight, just a reply after sleeping. Some conversations had a part two.',
    carriedLine: 'mornings that carried<br>on from last night.',
    carriedFoot: 'of the days you talked.',
    startsFoot: 'A conversation lasts as long as it keeps getting answered.',
    nightOwls: 'After dark',
    afterMidnight: 'messages after<br>midnight.',
    busiestHour: 'your busiest hour, day or night.',
    nightFoot: 'Sleep? Apparently not yet. Counted from 12am to 4am.',
    streak: 'Longest streak',
    streakHead: 'days in a row.<br>No skipped days.',
    // A verdict on the streak by its length; past tense once it has ended.
    streakVibe: (d, now) => d < 4 ? 'Pretty low-key. You two clearly don\'t need daily check-ins.'
      : d < 7 ? 'Pretty normal. A few good days in a row.'
      : d < 14 ? `Okay, you two ${now ? 'are' : 'were'} kinda something.`
      : d < 30 ? `You two ${now ? 'are' : 'were'} properly hooked.`
      : d < 90 ? 'Clingy. In the best way.'
      : now ? 'At this point it\'s not a streak, it\'s a lifestyle.' : 'At that point it wasn\'t a streak, it was a lifestyle.',
    streakToday: (d) => `${d} – today`,
    emojiKicker: 'Your emoji era',
    tenFaces: 'Two people, ten faces.',
    // How differently the two use emoji (per message sent), in plain words, plus a shared
    // favourite. When it's close, the chat as a whole decides: 10+ emoji per 100 messages,
    // counting both of you, is emoji-happy.
    emojiDiff: (v, p) => {
      const times = ['', '', 'twice', 'three times', 'four times'][Math.floor(v.ratio + 0.25)];
      const big = () => emojiRate(v) >= 10;
      const line = v.total[v.lo] === 0 ? `${v.lo} ${p ? 'never sent' : 'has never sent'} a single emoji. Not one.`
        : v.ratio >= 4.75 ? `${v.hi} basically ${p ? 'talked' : 'talks'} in emoji, about ${Math.round(v.ratio)} times as often as ${v.lo}.`
        : v.ratio >= 2 ? `${v.hi} ${p ? 'dropped' : 'drops'} emoji ${times} as often as ${v.lo}. ${v.lo} ${p ? 'preferred' : 'prefers'} words.`
        : v.ratio >= 1.5 ? `${v.hi} ${p ? 'was' : 'is'} the emoji fan here. ${v.lo} ${p ? 'was' : 'is'} a bit more stingy.`
        : v.ratio >= 1.25 ? `${v.hi} ${p ? 'snuck' : 'sneaks'} in a few more emoji than ${v.lo}.`
        : big() ? `You two ${p ? 'were' : 'are'} equally emoji-happy.`
        : `Neither of you ${p ? 'was' : 'is'} big on emoji.`;
      return v.fav ? `${line} You both ${p ? 'couldn\'t' : 'can\'t'} stop using ${v.fav}.` : line;
    },
    replyKicker: 'Reply speed',
    repliesFaster: (f) => `${f} replies faster.`,
    repliesEven: 'You two are pretty evenly matched.',
    replyLine: (f, p, s, n) => `${f} replies within a minute ${p}% of the time. ${s} took an hour or more ${n} times.`,
    apologies: 'Apologies',
    saidSorry: (w) => `times ${w}<br>said sorry.`,
    firstSorry: (q) => `The first one: “${q}”`,
    firstSorryHidden: 'The first one stays between you two.',
    hide_first: 'Hide the messages when saved',
    hide_sorry: 'Hide the quote when saved',
    hide_words: 'Hide the words when saved',
    hide_finale: 'Hide your names when saved',
    finaleKicker: (y) => `That's a wrap · ${y}`,
    youTwo: 'You two',
    finMessages: 'messages', finDays: 'days talked', finStreak: 'days in a row',
    finaleFoot: 'Not the same story as anyone else\'s.',
    noSorry: 'No apologies found.',
    loveKicker: 'I love you, counted',
    vocab: 'Your vocabulary',
    yourWords: 'The words that are yours.',
    wordsFoot: 'Words each of you says more than the other. Everyday Malay and English left out.',
    loudest: 'Your loudest day',
    loudLine: 'messages.<br>In one day.',
    weekdays: 'M T W T F S S',
    chatButton: 'Read that day',
    chatClose: 'Close',
    chatSwap: 'Swap sides',
    chatCount: (n) => `${n} messages`,
    chatMedia: 'Photo or video',
    chatDeleted: 'Deleted message',
    oneMore: 'One more thing',
    withLove: 'With love',
    withLoveFrom: (s) => `With love, ${s}`,
    bubbleKicker: 'Bubble count',
    bubbleRoast: 'Just send one paragraph, bro.',
    bubbleSpread: (w, one, burst) => `${w} sends just one ${one}% of the time, and 6 or more ${burst}%.`,
    spUsual: (n) => `Usually ${n}`,
    bubbleBoth: 'You both finish a thought in one message. Rare.',
    burstRant: (w, n, words, d) => `${w} ranted here 👀:<br>${n} messages, ${words} words · ${d}`,
    burstSpree: (w, n, d) => `${w} got carried away: ${n} messages in a row · ${d}`,
    burstNormal: (w, n) => `Longest burst: ${n} messages from ${w}. Short and sweet.`,
    rantButton: 'Read the rant',
    chatRant: '👀 the rant',
    introKicker: 'The whole story',
    introStmt: (a, b) => `messages between<br>${a} &amp; ${b}.`,
    introCall: (n) => `of days, you two talked. About ${n} back-and-forths a day.`,
    introCallNew: 'back-and-forths a day, so far.',
    firstStmt: 'It started here.',
    firstRemark: (past) => (past ? 'One message. Then another. Look how far it went.' : 'One message. Then another. And somehow, you\'re still here.'),
    firstCall: (n) => `of ${n} messages.`,
    shareCall: (a, b) => `messages, ${a} and ${b}. Different volumes, same conversation.`,
    bubbleStmt: (w, n) => `${n === 1 ? 'bubble' : 'bubbles'} a turn, usually,<br>from ${w}.`,
    startsStmt: (w) => `conversations<br>started by ${w}.`,
    startsRemark: (l, n) => `${l} started ${n}. Someone always has to say hi first.`,
    goodnightCall: (w) => `nights ${w} said goodnight first.`,
    emojiFav: (p) => (p ? 'You both couldn\'t stop using this one.' : 'You both can\'t stop using this one.'),
    loveStmt: 'times love made it<br>into the chat.',
    loveRemark: 'Rindu, miss you, sayang you, ❤ and 🥰 all count.',
    loveCall: (a, b) => `from ${a} and ${b}. Different ways of saying it.`,
    replyCall: (f, s) => `average reply, ${f} then ${s}.`,
    sorryRemark: (l, n) => (n ? `${l} said it ${n} times. Plenty of sorry going around.` : `${l} never did. Not once.`),
    morningCall: (l) => `mornings ${l} got there first.`,
    streakCall: (now) => `of all your days talking ${now ? 'are' : 'were'} in this one run.`,
    loudRemark: 'You two really had a lot to say.',
    loudCall: 'of your entire chat happened on this single day.',
    arcKicker: 'How it rose and settled', arcStart: 'Start', arcPeak: 'Peak', arcNowLabel: 'Now',
    arcStmt: 'messages a week<br>at your peak.',
    arc_peak: (n) => `Now: right at your peak, ${n} a week.`, arc_warming: (n) => `Now: warming back up, ${n} a week.`,
    arc_steady: (n) => `Now: steady, ${n} a week.`, arc_simmer: (n) => `Now: a slow simmer, ${n} a week.`,
    arc_cooling: (n) => `Now: cooling down, ${n} a week.`, arc_quiet: () => 'Now: gone quiet for over a month.',
    arcDrop: (r) => `Biggest cool-down: ${r}`, arcEven: 'No big cool-downs: you kept a steady pace.',
    oops: 'Oops', noData: 'Not enough data for this slide.',
  },
  ms: {
    lede: 'Chat korang, jadi sebuah cerita. Export chat WhatsApp sebagai .txt "Without media" dan masukkan di sini. Semuanya berlaku dalam peranti ini: tiada muat naik, tiada akaun.',
    useChat: 'Guna chat saya (.txt)',
    sample: 'Contoh chat',
    sampleLabel: 'Contoh chat (rekaan)',
    rangeLabel: 'Cerita meliputi',
    allTime: 'Sepanjang masa',
    last30: '30 hari lepas',
    noteLabel: 'Mesej awak untuk slaid terakhir',
    optional: '(pilihan)',
    notePlaceholder: 'Setiap nombor di sini adalah kita. Terima kasih untuk setiap selamat pagi.',
    signedPlaceholder: 'Daripada (cth. nama awak)',
    addNote: 'Tambah ke cerita',
    noteHint: 'Disimpan sebagai draf dalam peranti ini sahaja.',
    playStory: 'Main cerita kita', anotherChat: 'Guna chat lain', resultsKicker: 'Cerita penuh korang',
    closeStory: 'Tutup cerita', noteAdded: 'Dah masuk sebagai slaid terakhir.',
    pause: 'Jeda', play: 'Main', restart: 'Ulang', saveSlide: 'Simpan slaid ini',
    making: 'Sedang buat gambar…', shared: 'Dikongsi.', downloaded: 'Disimpan dalam muat turun.',
    shareFailed: 'Tak dapat buat gambar. Cuba lagi, atau ambil screenshot.',
    unreadable: '<b>Tiada mesej yang boleh dibaca dalam fail ni.</b> Export chat sebagai .txt "Without media", dan unzip dulu kalau guna iPhone.',
    readFailed: '<b>Tak dapat baca fail ni.</b> Cuba export semula.',
    tooFew: (n, range) => `<b>Cuma ${n} mesej dalam ${range}.</b> Pilih tempoh yang lebih panjang.`,
    loaded: (n, a, b, days) => `${n} mesej antara ${a} dan ${b} sepanjang ${days} hari.`,
    group: ' Ini chat group, jadi hanya dua orang yang paling banyak mesej digunakan.',
    private: ' Tiada apa yang keluar dari peranti ini.',
    sec: (n) => `${n} saat`, min: (n) => `${n} minit`, hr: (n) => `${n} jam`, underMin: '< 1 minit',
    since: (d) => `Sejak ${d}`,
    pace_inseparable: 'Hampir setiap hari, dan banyak setiap kali. Korang ni memang tak boleh berpisah.',
    pace_bursts: 'Bukan setiap hari, tapi bila korang berbual, memang betul-betul berbual.',
    pace_steady: 'Sikit-sikit, tapi hampir setiap hari. Jenis yang konsisten.',
    pace_occasional: 'Sekali-sekala, dan itu dah cukup untuk korang.',
    paceNewEvery: (n) => `${n} hari, dan korang berbual setiap hari.`,
    paceNewSome: (n, d) => `${n} hari, dan korang berbual ${d} hari daripadanya.`,
    pace_inseparable_past: 'Hampir setiap hari, dan banyak setiap kali. Korang dulu memang tak boleh berpisah.',
    pace_bursts_past: 'Bukan setiap hari, tapi bila korang berbual dulu, memang betul-betul berbual.',
    pace_steady_past: 'Sikit-sikit, tapi hampir setiap hari. Dulu korang jenis yang konsisten.',
    pace_occasional_past: 'Sekali-sekala, dan dulu itu dah cukup untuk korang.',
    paceNewEvery_past: (n) => `Dalam ${n} hari tu, korang berbual setiap hari.`,
    paceNewSome_past: (n, d) => `Dalam ${n} hari tu, korang berbual ${d} hari.`,
    rangeFrom: (r, d) => `${r} · dari ${d}`,
    whereStarted: 'Di sinilah bermula',
    rangeFirst: (r) => `${r}: mesej pertama`,
    talker: 'Kaki borak',
    matched: 'Sama padan. Hampir.',
    hadMore: (w) => `${w} lebih banyak cakap.`,
    rolesLine: (r, A, B, past) => {
      const label = { talker: 'kaki borak', storyteller: 'tukang karang', chaser: 'si tak sabar' };
      const shared = { talker: 'Korang berbual sama banyak.', storyteller: 'Panjang mesej korang lebih kurang sama.', chaser: 'Korang sama-sama selalu text lagi bila senyap.' };
      const keys = ['talker', 'storyteller', 'chaser'];
      if (keys.every((k) => !r[k])) return 'Sama padan dalam semua benda.';
      const list = (xs) => (xs.length < 3 ? xs.join(' dan ') : `${xs.slice(0, -1).join(', ')} dan ${xs[xs.length - 1]}`);
      const first = r.talker || r.storyteller || r.chaser, other = first === A ? B : A;
      const out = [];
      for (const p of [first, other]) {
        const mine = keys.filter((k) => r[k] === p).map((k) => label[k]);
        if (mine.length) out.push(`${p} ${past ? 'dulu ' : ''}${list(mine)}.`);
        if (mine.length === 3) out.push(`${other} sempat jugak menyampuk.`);
      }
      for (const k of keys) if (!r[k]) out.push(shared[k]);
      return out.join(' ');
    },
    firstThought: 'Selamat pagi dulu',
    mornings: (w) => `pagi ${w}<br>mesej dulu.`,
    morningFoot: 'Hanya tegur baru antara 5 pagi dan tengah hari dikira, bukan balas mesej semalam.',
    startsKicker: 'Siapa mula dulu',
    goodnightTie: 'Korang bergilir ucap selamat malam dulu.',
    carriedKicker: 'Tak ucap selamat tinggal',
    carriedHead: 'Tiada selamat malam, cuma balasan lepas bangun tidur. Ada perbualan yang bersambung.',
    carriedLine: 'pagi yang bersambung<br>dari malam tadi.',
    carriedFoot: 'daripada hari korang berbual.',
    startsFoot: 'Satu perbualan berterusan selagi masih berbalas.',
    nightOwls: 'Lepas gelap',
    afterMidnight: 'mesej lepas<br>tengah malam.',
    busiestHour: 'jam paling sibuk korang, siang atau malam.',
    nightFoot: 'Tidur? Nampaknya belum lagi. Dikira dari 12 pagi hingga 4 pagi.',
    streak: 'Streak terpanjang',
    streakHead: 'hari berturut-turut.<br>Tak miss sehari pun.',
    streakVibe: (d) => d < 4 ? 'Santai je. Korang tak perlu berbual setiap hari.'
      : d < 7 ? 'Biasa-biasa je. Beberapa hari yang best berturut-turut.'
      : d < 14 ? 'Okay, korang ni boleh tahan jugak.'
      : d < 30 ? 'Korang dah melekat ni.'
      : d < 90 ? 'Clingy. Tapi yang comel punya.'
      : 'Ni bukan streak lagi, ni dah jadi cara hidup.',
    streakToday: (d) => `${d} – hari ini`,
    emojiKicker: 'Era emoji korang',
    tenFaces: 'Dua orang, sepuluh muka.',
    emojiDiff: (v) => {
      const kali = ['', '', 'dua', 'tiga', 'empat'][Math.floor(v.ratio + 0.25)];
      const big = () => emojiRate(v) >= 10;
      const line = v.total[v.lo] === 0 ? `${v.lo} tak pernah hantar emoji langsung. Satu pun takde.`
        : v.ratio >= 4.75 ? `${v.hi} macam bercakap guna emoji je, lebih kurang ${Math.round(v.ratio)} kali lebih kerap dari ${v.lo}.`
        : v.ratio >= 2 ? `${v.hi} guna emoji ${kali} kali lebih kerap dari ${v.lo}. ${v.lo} lebih suka guna perkataan.`
        : v.ratio >= 1.5 ? `${v.hi} memang kaki emoji. ${v.lo} kedekut sikit.`
        : v.ratio >= 1.25 ? `${v.hi} selit emoji lebih sikit dari ${v.lo}.`
        : big() ? 'Korang dua-dua sama gila emoji.'
        : 'Dua-dua tak minat sangat emoji.';
      return v.fav ? `${line} Dua-dua tak boleh hidup tanpa ${v.fav}.` : line;
    },
    replyKicker: 'Laju balas',
    repliesFaster: (f) => `${f} balas lebih laju.`,
    repliesEven: 'Korang lebih kurang sama laju.',
    replyLine: (f, p, s, n) => `${f} balas dalam seminit, ${p}% daripada masa. ${s} ambil sejam atau lebih sebanyak ${n} kali.`,
    apologies: 'Minta maaf',
    saidSorry: (w) => `kali ${w}<br>minta maaf.`,
    firstSorry: (q) => `Yang pertama: “${q}”`,
    firstSorryHidden: 'Yang pertama tu, rahsia korang berdua.',
    hide_first: 'Sorok mesej bila simpan',
    hide_sorry: 'Sorok petikan bila simpan',
    hide_words: 'Sorok perkataan bila simpan',
    hide_finale: 'Sorok nama bila simpan',
    finaleKicker: (y) => `Tamat · ${y}`,
    youTwo: 'Korang berdua',
    finMessages: 'mesej', finDays: 'hari berbual', finStreak: 'hari berturut-turut',
    finaleFoot: 'Tiada cerita lain yang sama macam ni.',
    noSorry: 'Tiada maaf dijumpai.',
    loveKicker: 'I love you, dikira',
    vocab: 'Kosa kata korang',
    yourWords: 'Perkataan yang jadi milik korang.',
    wordsFoot: 'Perkataan yang masing-masing guna lebih daripada yang lain. Perkataan biasa BM dan English ditapis.',
    loudest: 'Hari paling riuh',
    loudLine: 'mesej.<br>Dalam sehari.',
    weekdays: 'I S R K J S A',
    chatButton: 'Baca hari tu',
    chatClose: 'Tutup',
    chatSwap: 'Tukar belah',
    chatCount: (n) => `${n} mesej`,
    chatMedia: 'Gambar atau video',
    chatDeleted: 'Mesej dipadam',
    oneMore: 'Satu lagi',
    withLove: 'Dengan cinta',
    withLoveFrom: (s) => `Dengan cinta, ${s}`,
    bubbleKicker: 'Kiraan bubble',
    bubbleRoast: 'Satu perenggan je la, bro.',
    bubbleSpread: (w, one, burst) => `${w} hantar satu je ${one}% masa, dan 6 atau lebih ${burst}%.`,
    spUsual: (n) => `Selalunya ${n}`,
    bubbleBoth: 'Korang berdua habiskan ayat dalam satu mesej. Jarang jumpa.',
    burstRant: (w, n, words, d) => `${w} membebel kat sini 👀:<br>${n} mesej, ${words} perkataan · ${d}`,
    burstSpree: (w, n, d) => `${w} terlebih excited: ${n} mesej berturut-turut · ${d}`,
    burstNormal: (w, n) => `Paling panjang: ${n} mesej dari ${w}. Ringkas dan padat.`,
    rantButton: 'Baca bebelan',
    chatRant: '👀 bebelan',
    introKicker: 'Cerita penuh',
    introStmt: (a, b) => `mesej antara<br>${a} &amp; ${b}.`,
    introCall: (n) => `daripada hari, korang berbual. Lebih kurang ${n} kali berbalas sehari.`,
    introCallNew: 'kali berbalas sehari, setakat ni.',
    firstStmt: 'Semuanya bermula di sini.',
    firstRemark: (past) => (past ? 'Satu mesej. Lepas tu satu lagi. Tengok jauh mana ia pergi.' : 'Satu mesej. Lepas tu satu lagi. Dan entah macam mana, korang masih di sini.'),
    firstCall: (n) => `daripada ${n} mesej.`,
    shareCall: (a, b) => `mesej, ${a} dan ${b}. Lain banyak, tapi perbualan yang sama.`,
    bubbleStmt: (w) => `bubble setiap giliran, selalunya,<br>dari ${w}.`,
    startsStmt: (w) => `perbualan<br>dimulakan oleh ${w}.`,
    startsRemark: (l, n) => `${l} mula ${n} kali. Mesti ada orang yang tegur dulu.`,
    goodnightCall: (w) => `malam ${w} ucap selamat malam dulu.`,
    emojiFav: () => 'Dua-dua tak boleh hidup tanpa yang ni.',
    loveStmt: 'kali sayang masuk<br>dalam chat.',
    loveRemark: 'Rindu, miss you, sayang you, ❤ dan 🥰 semua dikira.',
    loveCall: (a, b) => `dari ${a} dan ${b}. Lain orang, lain cara.`,
    replyCall: (f, s) => `purata balasan, ${f} dan ${s}.`,
    sorryRemark: (l, n) => (n ? `${l} minta maaf ${n} kali. Banyak jugak maaf dalam chat ni.` : `${l} tak pernah. Sekali pun takde.`),
    morningCall: (l) => `pagi ${l} lebih awal.`,
    streakCall: () => 'daripada semua hari korang berbual ada dalam streak ni.',
    loudRemark: 'Banyak betul benda korang nak cakap hari tu.',
    loudCall: 'daripada seluruh chat korang berlaku pada hari ini saja.',
    arcKicker: 'Naik turun korang', arcStart: 'Mula', arcPeak: 'Puncak', arcNowLabel: 'Kini',
    arcStmt: 'mesej seminggu<br>masa kemuncak.',
    arc_peak: (n) => `Kini: tengah di puncak, ${n} seminggu.`, arc_warming: (n) => `Kini: makin rancak semula, ${n} seminggu.`,
    arc_steady: (n) => `Kini: stabil, ${n} seminggu.`, arc_simmer: (n) => `Kini: perlahan tapi ada, ${n} seminggu.`,
    arc_cooling: (n) => `Kini: makin reda, ${n} seminggu.`, arc_quiet: () => 'Kini: senyap lebih sebulan.',
    arcDrop: (r) => `Paling reda: ${r}`, arcEven: 'Tiada masa reda yang besar: korang kekal stabil.',
    oops: 'Alamak', noData: 'Data tak cukup untuk slaid ini.',
  },
};

export function t(key, ...args) {
  const v = STRINGS[lang][key] ?? STRINGS.en[key];
  return typeof v === 'function' ? v(...args) : v;
}
