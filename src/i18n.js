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
    introLine: (a, b, days) => `messages between ${a} and ${b}, across ${days} days of talking.`,
    since: (d) => `Since ${d}`,
    paceStat: (n, p) => `${n} back-and-forths a day · talked on ${p}% of days`,
    paceTurns: (n) => `${n} back-and-forths a day`,
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
    messageOf: (n) => `Message #1 of ${n}`,
    talker: 'The talker',
    matched: 'Perfectly matched. Almost.',
    carries: (w) => `${w} carries this chat.`,
    rowMessages: 'Messages', rowWords: 'Words', rowDoubles: 'Double texts',
    carriesPast: (w) => `${w} carried this chat.`,
    rolesKey: 'Talker: more messages · Storyteller: longer messages · Chaser: more double texts',
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
    firstThought: 'First thought of the day',
    mornings: (w, l, n) => `mornings where <b>${w}</b> texted first. ${l} got there first on ${n}.`,
    morningFoot: 'Counts the first new conversation between 5am and noon. Replying to last night doesn\'t count',
    startsKicker: 'Who starts it',
    startsLine: (w, l, n) => `conversations started by <b>${w}</b>. ${l} started ${n}.`,
    signOffFoot: (w, n) => `${w} usually says goodnight first: ${n} nights`,
    goodnightTie: 'You take turns saying goodnight first',
    carriedKicker: 'No goodbyes',
    carriedLine: 'nights the conversation just carried on into the morning.',
    carriedFoot: (p) => `That's ${p}% of the days you talked`,
    startsFoot: 'A conversation lasts as long as it keeps getting answered',
    nightOwls: 'Night owls',
    afterMidnight: (n) => `${n} messages sent after midnight.`,
    busiestHour: (h) => `Busiest hour: ${h}`,
    nightFoot: 'After midnight means 12am to 4am',
    streak: 'Longest streak',
    streakLine: 'days in a row.',
    // A verdict on the streak by its length; past tense once it has ended.
    streakVibe: (d, now) => d < 4 ? 'Pretty low-key. You two clearly don\'t need daily check-ins.'
      : d < 7 ? 'Pretty normal. A few good days in a row.'
      : d < 14 ? `Okay, you two ${now ? 'are' : 'were'} kinda something.`
      : d < 30 ? `You two ${now ? 'are' : 'were'} properly hooked.`
      : d < 90 ? 'Clingy. In the best way.'
      : now ? 'At this point it\'s not a streak, it\'s a lifestyle.' : 'At that point it wasn\'t a streak, it was a lifestyle.',
    streakToday: (d) => `${d} – today`,
    emojiKicker: 'Your emoji, side by side',
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
    replyLine: (f, p, avg, s, n) => `${f} replies within a minute ${p}% of the time, ${avg} on average. ${s} took an hour or more ${n} times.`,
    replyFoot: 'Each dot is one reply in a hundred. Filled ones came back within a minute',
    apologies: 'Apologies',
    saidSorry: (w, n) => `${w} said sorry ${n} times.`,
    firstSorry: (q) => `The first one: “${q}”`,
    firstSorryHidden: 'The first one stays between you two.',
    hide_first: 'Hide the messages when saved',
    hide_sorry: 'Hide the quote when saved',
    hide_words: 'Hide the words when saved',
    noSorry: 'No apologies found.',
    loveKicker: 'I love you, counted',
    loveLine: (a, x, b, y) => `times you said it in some form. ${a} ${x}, ${b} ${y}.`,
    loveFoot: 'Includes rindu, sayang you, miss you, ❤, 🥰',
    vocab: 'Your vocabulary',
    yourWords: 'The words that are yours.',
    wordsFoot: 'Words each of you says more than the other. Everyday Malay and English left out',
    loudest: 'Your loudest day',
    loudLine: 'messages in one day. Remember why?',
    stillWriting: (n) => `Still writing. ${n} and counting.`,
    allWritten: (n) => `${n} messages, start to finish.`,
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
    bubbleRoast: (w, x) => `${w} sends ${x} bubbles per turn. Just send one paragraph, bro.`,
    bubbleBoth: 'You both finish a thought in one message. Rare.',
    bubbleEven: (w, x, l) => `${w} sends ${x} bubbles per turn, about the same as ${l}.`,
    burstRant: (w, n, words, d) => `${w} ranted here 👀:<br>${n} messages, ${words} words · ${d}`,
    burstSpree: (w, n, d) => `${w} got carried away: ${n} messages in a row · ${d}`,
    burstNormal: (w, n) => `Longest burst: ${n} messages from ${w}. Short and sweet.`,
    rantButton: 'Read the rant',
    chatRant: '👀 the rant',
    bubbleKey: 'A rant: 8+ messages in a row and 60+ words',
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
    introLine: (a, b, days) => `mesej antara ${a} dan ${b}, sepanjang ${days} hari berbual.`,
    since: (d) => `Sejak ${d}`,
    paceStat: (n, p) => `${n} kali berbalas sehari · berbual ${p}% daripada hari`,
    paceTurns: (n) => `${n} kali berbalas sehari`,
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
    messageOf: (n) => `Mesej #1 daripada ${n}`,
    talker: 'Kaki borak',
    matched: 'Sama padan. Hampir.',
    carries: (w) => `${w} yang hidupkan chat ni.`,
    rowMessages: 'Mesej', rowWords: 'Perkataan', rowDoubles: 'Double text',
    carriesPast: (w) => `${w} yang hidupkan chat ni dulu.`,
    rolesKey: 'Kaki borak: lebih banyak mesej · Tukang karang: mesej lebih panjang · Si tak sabar: lebih banyak double text',
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
    firstThought: 'Yang pertama di fikiran',
    mornings: (w, l, n) => `pagi <b>${w}</b> mesej dulu. ${l} lebih awal sebanyak ${n} kali.`,
    morningFoot: 'Kira perbualan baru pertama antara 5 pagi dan tengah hari. Balas mesej semalam tak dikira',
    startsKicker: 'Siapa mula dulu',
    startsLine: (w, l, n) => `perbualan dimulakan oleh <b>${w}</b>. ${l} mula ${n} kali.`,
    signOffFoot: (w, n) => `${w} selalunya ucap selamat malam dulu: ${n} malam`,
    goodnightTie: 'Korang bergilir ucap selamat malam dulu',
    carriedKicker: 'Tak ucap selamat tinggal',
    carriedLine: 'malam perbualan korang bersambung terus sampai pagi.',
    carriedFoot: (p) => `Itu ${p}% daripada hari korang berbual`,
    startsFoot: 'Satu perbualan berterusan selagi masih berbalas',
    nightOwls: 'Burung hantu',
    afterMidnight: (n) => `${n} mesej dihantar lepas tengah malam.`,
    busiestHour: (h) => `Jam paling sibuk: ${h}`,
    nightFoot: 'Lepas tengah malam bermaksud 12 pagi hingga 4 pagi',
    streak: 'Streak terpanjang',
    streakLine: 'hari berturut-turut.',
    streakVibe: (d) => d < 4 ? 'Santai je. Korang tak perlu berbual setiap hari.'
      : d < 7 ? 'Biasa-biasa je. Beberapa hari yang best berturut-turut.'
      : d < 14 ? 'Okay, korang ni boleh tahan jugak.'
      : d < 30 ? 'Korang dah melekat ni.'
      : d < 90 ? 'Clingy. Tapi yang comel punya.'
      : 'Ni bukan streak lagi, ni dah jadi cara hidup.',
    streakToday: (d) => `${d} – hari ini`,
    emojiKicker: 'Emoji korang, sebelah-menyebelah',
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
    replyLine: (f, p, avg, s, n) => `${f} balas dalam seminit, ${p}% daripada masa, purata ${avg}. ${s} ambil sejam atau lebih sebanyak ${n} kali.`,
    replyFoot: 'Setiap titik ialah satu daripada 100 balasan. Yang penuh dibalas dalam seminit',
    apologies: 'Minta maaf',
    saidSorry: (w, n) => `${w} minta maaf ${n} kali.`,
    firstSorry: (q) => `Yang pertama: “${q}”`,
    firstSorryHidden: 'Yang pertama tu, rahsia korang berdua.',
    hide_first: 'Sorok mesej bila simpan',
    hide_sorry: 'Sorok petikan bila simpan',
    hide_words: 'Sorok perkataan bila simpan',
    noSorry: 'Tiada maaf dijumpai.',
    loveKicker: 'I love you, dikira',
    loveLine: (a, x, b, y) => `kali korang cakap, dalam apa jua bentuk. ${a} ${x}, ${b} ${y}.`,
    loveFoot: 'Termasuk rindu, sayang you, miss you, ❤, 🥰',
    vocab: 'Kosa kata korang',
    yourWords: 'Perkataan yang jadi milik korang.',
    wordsFoot: 'Perkataan yang masing-masing guna lebih daripada yang lain. Perkataan biasa BM dan English ditapis',
    loudest: 'Hari paling riuh',
    loudLine: 'mesej dalam sehari. Ingat kenapa?',
    stillWriting: (n) => `Masih menulis. ${n} dan terus bertambah.`,
    allWritten: (n) => `${n} mesej, dari mula sampai habis.`,
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
    bubbleRoast: (w, x) => `${w} hantar ${x} bubble setiap giliran. Hantar satu perenggan je la, bro.`,
    bubbleBoth: 'Korang berdua habiskan ayat dalam satu mesej. Jarang jumpa.',
    bubbleEven: (w, x, l) => `${w} hantar ${x} bubble setiap giliran, lebih kurang sama macam ${l}.`,
    burstRant: (w, n, words, d) => `${w} membebel kat sini 👀:<br>${n} mesej, ${words} patah perkataan · ${d}`,
    burstSpree: (w, n, d) => `${w} terlebih excited: ${n} mesej berturut-turut · ${d}`,
    burstNormal: (w, n) => `Paling panjang: ${n} mesej dari ${w}. Ringkas dan padat.`,
    rantButton: 'Baca bebelan',
    chatRant: '👀 bebelan',
    bubbleKey: 'Bebelan: 8+ mesej berturut-turut dan 60+ patah perkataan',
    oops: 'Alamak', noData: 'Data tak cukup untuk slaid ini.',
  },
};

export function t(key, ...args) {
  const v = STRINGS[lang][key] ?? STRINGS.en[key];
  return typeof v === 'function' ? v(...args) : v;
}
