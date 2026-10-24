// Word lists for the playful stats, English and Malay as people actually text. Phrases are
// lowercase and match whole words; a RegExp entry matches as written. Extend freely, but
// test any new entry against a real chat first.

// The five love languages, for couples.
export const LOVE_LEX = {
  words: ['sayang', 'love you', 'love u', 'proud of you', 'bangga', 'cantik', 'handsome', 'comel', 'you are the best'],
  time: ['jom keluar', 'date night', 'lepak sama', 'jumpa', 'spend time', 'jom dinner', 'call jap', 'facetime'],
  service: ['dah makan', 'nak i belikan', 'i belikan', 'i tolong', 'dah sampai', 'drive safe', 'hati-hati', 'jangan lupa makan', 'rest well'],
  gifts: ['hadiah', 'surprise', 'beli untuk you', 'present', 'bunga', 'flowers'],
  touch: ['peluk', 'hug', 'cuddle', 'cium', 'kiss', 'pegang tangan', 'nak peluk'],
};

// The same five, between friends: nothing romantic.
export const FRIEND_LEX = {
  words: ['proud of you', 'bangga', 'terbaik', 'you got this', 'well done', 'hebat'],
  time: ['jom lepak', 'jumpa', 'mamak', 'call jap', 'jom makan', 'jom keluar'],
  service: ['dah makan', 'tolong', 'dah sampai', 'drive safe', 'hati-hati', 'nak kirim'],
  gifts: ['belanja', 'hadiah', 'treat you', 'present', 'i bayar'],
  touch: ['peluk', 'hug', 'high five'],
};

// Six emotions. 😭 and "geram" are left out on purpose: in Malaysian chats they mean
// laughing and affection as often as crying and anger.
export const EMO_LEX = {
  joy: { words: [/\b(?:ha){2,}h?\b/i, 'best', 'yay', 'seronok', 'happy', 'lawak', 'lol'], emoji: ['😂', '😆', '😄', '😁', '🥳', '🎉', '🤣'] },
  love: { words: ['sayang', 'love', 'rindu', 'miss you', 'miss u'], emoji: ['❤', '🥰', '😍', '😘', '💕'] },
  sadness: { words: ['sedih', 'sad', 'nangis', 'cry', 'kecewa', 'down'], emoji: ['😢', '🥲', '💔'] },
  anger: { words: ['marah', 'annoying', 'benci', 'hate', 'menyampah', 'bengang'], emoji: ['😡', '😤', '🤬'] },
  worry: { words: ['risau', 'takut', 'worried', 'scared', 'nervous', 'cuak', 'anxious'], emoji: ['😰', '😟', '😥'] },
  surprise: { words: ['omg', 'wait what', 'seriously', 'terkejut', 'what the'], emoji: ['😮', '😱', '🤯', '😳'] },
};
