/*
 * TOBY RUN — words on screen: levels, topics (mirrors vocabulary.bank.TOPICS), Uzbek UI strings,
 * and the bundled starter deck (≈ 130 A1–A2 items from the shared bank) used when the server deck
 * is short or the network is down. Local items carry k: 'local' and are never posted.
 */
import { LEVEL_ORDER } from './engine/levels.js'

export const SLUG = 'runner'
export const ACCENT = '#A98BFF'
export const TITLE = 'TOBY RUN'
export const TAGLINE = 'Yugur, ayt va uch!'

export const LEVEL_INFO = {
  A1: { title: 'Boshlang‘ich', note: 'Rasmlar va oson so‘zlar', color: '#D94A5A' },
  A2: { title: 'Elementar', note: 'Kundalik iboralar', color: '#2E5AAC' },
  B1: { title: 'O‘rta', note: 'Savollarga javob', color: '#3BAA6B' },
  B2: { title: 'O‘rtadan yuqori', note: 'Ma’nodosh va teskari so‘zlar', color: '#F5B14C' },
  C1: { title: 'Yuqori', note: 'Ta’rif bo‘yicha so‘zlar', color: '#A98BFF' },
}
export const LEVELS_LIST = LEVEL_ORDER.map(id => ({ id, ...LEVEL_INFO[id] }))

/* slug → Uzbek title (the server's registry; an unknown topic is "Boshqa") */
export const TOPICS = {
  all: 'Hammasi', metro: 'Metro', bozor: 'Bozor', park: 'Xiyobon', home: 'Uy', food: 'Ovqat', school: 'Maktab',
  city: 'Shahar', travel: 'Sayohat', health: 'Salomatlik', feelings: 'His-tuyg‘u', work: 'Ish', nature: 'Tabiat',
  general: 'Umumiy',
}
export const topicTitle = (slug) => TOPICS[slug] || 'Boshqa'

export const BIOME_TITLES = { metro: 'Metro', bozor: 'Bozor', xiyobon: 'Chinor xiyoboni', shahar: 'Kechki shahar' }

export const TOAST_TEXT = {
  magnet: 'Magnit! Uchta to‘g‘ri javob ketma-ket',
  varrak: 'Varrak! Baland uchamiz',
  gilam: 'Uchar gilam sizni saqlab qoldi',
  'mic-tip': 'Mikrofonga yaqinroq va balandroq gapiring',
  listen: {
    mic: 'Mikrofon ishlamadi — Tinglash rejimiga o‘tdik',
    limit: 'Bugungi ovoz limiti tugadi — Tinglash rejimi',
    cap: 'Bu o‘yindagi ovoz limiti tugadi — Tinglash rejimi',
    choice: 'Tinglash rejimi yoqildi',
    server: 'Bu qurilmada ovozni tanib bo‘lmaydi — Tinglash rejimi',
  },
}

export const VERDICT_TEXT = { ok: 'Zo‘r!', close: 'Yaxshi!', miss: 'Yana bir bor', skip: 'Eshitilmadi' }

/* ── the shop (§B7): cosmetics and power-up upgrades only, nothing that buys survival ── */

export const OUTFITS = [
  { id: 'cap', title: 'Kepka', price: 400 },
  { id: 'bow', title: 'Bantik', price: 400 },
  { id: 'scarf', title: 'Sharf', price: 600 },
  { id: 'glasses', title: 'Ko‘zoynak', price: 800 },
  { id: 'headphones', title: 'Quloqchin', price: 1000 },
  { id: 'doppi', title: 'Do‘ppi', price: 1200 },
  { id: 'crown', title: 'Toj', price: 3000 },
]
export const CARPET_PRICES = { 'carpet-klassik': 0, 'carpet-ikat': 800, 'carpet-suzani': 1500, 'carpet-girih': 2500, 'carpet-tungi': 3500, 'carpet-oltin': 5000 }
export const UPGRADE_PRICES = [250, 500, 1000, 2000, 3500]
export const UPGRADES = [
  { id: 'magnet', title: 'Magnit', note: 'Tangalarni o‘ziga tortadi', base: 6, step: 1.2 },
  { id: 'x2', title: 'x2 tanga', note: 'Tangalar ikki baravar', base: 8, step: 1.6 },
  { id: 'gilam', title: 'Uchar gilam', note: 'Bitta to‘qnashuvdan saqlaydi', base: 8, step: 1.2 },
]
export const RUNNER_LIST = [
  { id: 'toby', title: 'Toby', note: 'Mushukcha', price: 0 },
  { id: 'lola', title: 'Lola', note: 'O‘smir qiz', price: 4000 },
  { id: 'bek', title: 'Bek', note: 'O‘smir bola', price: 4000 },
]
export const upgradeSeconds = (u, lvl) => Math.round((u.base + Math.min(5, lvl) * u.step) * 10) / 10

/* ── the starter deck ─────────────────────────────────────────────────── */

// [word, uz, picture, level]
const W = [
  ['ticket', 'chipta', 'ticket', 'A1'], ['bus', 'avtobus', 'bus', 'A1'], ['bus stop', 'avtobus bekati', 'bus-stop', 'A1'],
  ['money', 'pul', 'money', 'A1'], ['coin', 'tanga', 'coin', 'A1'], ['bag', 'sumka', 'bag', 'A1'], ['backpack', 'ryukzak', 'backpack', 'A1'],
  ['newspaper', 'gazeta', 'newspaper', 'A2'], ['clock', 'soat', 'clock', 'A1'], ['traffic light', 'svetofor', 'traffic-light', 'A1'],
  ['apple', 'olma', 'apple', 'A1'], ['banana', 'banan', 'bananas', 'A1'], ['orange', 'apelsin', 'oranges', 'A1'], ['grapes', 'uzum', 'grapes', 'A1'],
  ['carrot', 'sabzi', 'carrot', 'A1'], ['vegetables', 'sabzavotlar', 'vegetables', 'A1'], ['price', 'narx', 'price-tag', 'A2'],
  ['basket', 'savat', 'basket', 'A1'], ['shopping bag', 'xarid sumkasi', 'shopbag', 'A2'], ['shopping list', 'xaridlar ro‘yxati', 'list', 'A2'],
  ['tree', 'daraxt', 'tree', 'A1'], ['bench', 'skameyka', 'bench', 'A1'], ['dog', 'it', 'dog', 'A1'], ['cat', 'mushuk', 'cat', 'A1'],
  ['duck', 'o‘rdak', 'duck', 'A1'], ['ball', 'to‘p', 'ball', 'A1'], ['football', 'futbol', 'football', 'A1'], ['bike', 'velosiped', 'bike', 'A1'],
  ['slide', 'sirg‘anchiq', 'slide', 'A1'], ['sun', 'quyosh', 'sun', 'A1'], ['ice cream', 'muzqaymoq', 'icecream', 'A1'], ['house', 'uy', 'house', 'A1'],
  ['door', 'eshik', 'door', 'A1'], ['window', 'deraza', 'window', 'A1'], ['bed', 'karavot', 'bed', 'A1'], ['lamp', 'chiroq', 'lamp', 'A1'],
  ['TV', 'televizor', 'tv', 'A1'], ['alarm clock', 'budilnik', 'alarm-clock', 'A2'], ['curtains', 'pardalar', 'curtains', 'A2'],
  ['bath', 'vanna', 'bath', 'A1'], ['soap', 'sovun', 'soap', 'A1'], ['towel', 'sochiq', 'towel', 'A1'], ['toothbrush', 'tish cho‘tkasi', 'toothbrush', 'A1'],
  ['comb', 'taroq', 'comb', 'A2'], ['tap', 'jo‘mrak', 'tap', 'A2'], ['fridge', 'muzlatgich', 'fridge', 'A1'], ['pyjamas', 'pijama', 'pyjamas', 'A1'],
  ['T-shirt', 'futbolka', 'tshirt', 'A1'], ['shoes', 'oyoq kiyim', 'shoes', 'A1'], ['book', 'kitob', 'book', 'A1'], ['desk', 'yozuv stoli', 'desk', 'A1'],
  ['watering can', 'suv sepgich', 'watering-can', 'A2'], ['bread', 'non', 'bread', 'A1'], ['milk', 'sut', 'milk', 'A1'], ['cheese', 'pishloq', 'cheese', 'A1'],
  ['egg', 'tuxum', 'egg', 'A1'], ['water', 'suv', 'water', 'A1'], ['juice', 'sharbat', 'juice', 'A1'], ['tea', 'choy', 'tea', 'A1'],
  ['soup', 'sho‘rva', 'soup', 'A1'], ['sandwich', 'buterbrod', 'sandwich', 'A1'], ['chocolate', 'shokolad', 'chocolate', 'A1'],
  ['cookies', 'pechenye', 'cookies', 'A1'], ['cake', 'tort', 'cake', 'A1'], ['salt', 'tuz', 'salt', 'A1'], ['spoon', 'qoshiq', 'spoon', 'A1'],
  ['fork', 'sanchqi', 'fork', 'A1'], ['knife', 'pichoq', 'knife', 'A1'], ['plate', 'likopcha', 'plate', 'A1'], ['bowl', 'kosa', 'bowl', 'A1'],
  ['cup', 'chashka', 'cup', 'A1'], ['glass', 'stakan', 'glass', 'A1'], ['pot', 'qozon', 'pot', 'A2'], ['delicious', 'mazali', 'yum', 'A2'],
  ['hello', 'salom', 'wave', 'A1'], ['sick', 'kasal', 'sick', 'A1'], ['doctor', 'shifokor', 'doctor', 'A1'], ['medicine', 'dori', 'medicine', 'A2'],
  ['headache', 'bosh og‘rig‘i', 'headache', 'A2'], ['birthday', 'tug‘ilgan kun', 'candles', 'A1'], ['present', 'sovg‘a', 'present', 'A1'],
  ['balloon', 'havo shari', 'balloons', 'A1'], ['night', 'tun', 'moon', 'A1'], ['school', 'maktab', 'school', 'A1'],
  ['teacher', 'o‘qituvchi', 'blackboard', 'A1'], ['pencil', 'qalam', 'pencil', 'A1'], ['notebook', 'daftar', 'notebook', 'A1'],
  ['bell', 'qo‘ng‘iroq', 'bell', 'A2'], ['seven', 'yetti', 'seven', 'A1'], ['hand', 'qo‘l', 'hand', 'A1'], ['train', 'poyezd', '', 'A1'],
  ['station', 'bekat', '', 'A1'], ['exit', 'chiqish', '', 'A1'], ['entrance', 'kirish', '', 'A2'],
]

// [kind, text, uz, voice, prompt, accept, min_words, level]
const P = [
  ['echo', 'Where is the metro?', 'Metro qayerda?', 'girl', '', [], 0, 'A1'],
  ['echo', 'One ticket, please.', 'Bitta chipta, iltimos.', 'man', '', [], 0, 'A1'],
  ['echo', 'Excuse me, where is the exit?', 'Kechirasiz, chiqish qayerda?', 'grandma', '', [], 0, 'A2'],
  ['echo', 'Is this the right train?', 'Bu to‘g‘ri poyezdmi?', 'man', '', [], 0, 'A2'],
  ['echo', 'Please sit down.', 'Iltimos, o‘tiring.', 'grandma', '', [], 0, 'A1'],
  ['echo', 'The next stop is the bazaar.', 'Keyingi bekat — bozor.', 'driver', '', [], 0, 'A2'],
  ['echo', 'Hold on, the train is moving.', 'Mahkam ushlang, poyezd yurmoqda.', 'driver', '', [], 0, 'A2'],
  ['echo', "I'm late for school.", 'Maktabga kechikyapman.', 'girl', '', [], 0, 'A1'],
  ['answer', "I'm going to the bazaar.", 'Qayerga ketyapsiz?', 'driver', 'Where are you going?', [['going'], ['go', 'to']], 3, 'A2'],
  ['answer', 'I go to school by bus.', 'Maktabga qanday borasiz?', 'teacher', 'How do you go to school?', [['by', 'bus'], ['by', 'metro'], ['by', 'train'], ['by', 'car'], ['walk'], ['on', 'foot']], 3, 'A2'],
  ['echo', 'How much is this?', 'Bu qancha turadi?', 'mum', '', [], 0, 'A1'],
  ['echo', 'Two kilos of apples, please.', 'Ikki kilo olma bering, iltimos.', 'grandma', '', [], 0, 'A1'],
  ['echo', 'These grapes are very sweet.', 'Bu uzum juda shirin.', 'man', '', [], 0, 'A1'],
  ['echo', 'Can I have a bag, please?', 'Menga sumka bera olasizmi?', 'boy', '', [], 0, 'A2'],
  ['echo', "That's too expensive.", 'Bu juda qimmat.', 'mum', '', [], 0, 'A2'],
  ['echo', 'Here is your change.', 'Mana, qaytimingiz.', 'man', '', [], 0, 'A2'],
  ['echo', 'I want a big melon.', 'Men katta qovun xohlayman.', 'boy', '', [], 0, 'A1'],
  ['answer', 'I like grapes.', 'Qaysi mevani yoqtirasiz?', 'man', 'What fruit do you like?', [['i', 'like'], ['i', 'love']], 3, 'A2'],
  ['echo', "Let's play football!", 'Keling, futbol o‘ynaymiz!', 'boy', '', [], 0, 'A1'],
  ['echo', 'Look at the ducks!', 'O‘rdaklarga qara!', 'girl', '', [], 0, 'A1'],
  ['echo', "It's a sunny day.", 'Bugun quyoshli kun.', 'girl', '', [], 0, 'A1'],
  ['echo', "Let's sit on the bench.", 'Keling, skameykada o‘tiramiz.', 'mum', '', [], 0, 'A2'],
  ['echo', 'My kite is flying high!', 'Varragim baland uchyapti!', 'boy', '', [], 0, 'A2'],
  ['echo', 'I like ice cream.', 'Men muzqaymoqni yaxshi ko‘raman.', 'girl', '', [], 0, 'A1'],
  ['answer', 'I like to ride my bike.', 'Xiyobonda nima qilishni yoqtirasiz?', 'girl', 'What do you like to do in the park?', [['like'], ['love'], ['play'], ['ride'], ['run'], ['walk']], 3, 'A2'],
  ['answer', 'Yes, I have a cat.', 'Uy hayvoningiz bormi?', 'boy', 'Do you have a pet?', [['yes'], ['no'], ['have']], 2, 'A2'],
  ['echo', 'Good morning, Mum!', 'Xayrli tong, oyijon!', 'girl', '', [], 0, 'A1'],
  ['echo', 'Time to wake up!', 'Uyg‘onish vaqti bo‘ldi!', 'mum', '', [], 0, 'A1'],
  ['echo', 'Wash your hands, please.', 'Qo‘lingni yuv, iltimos.', 'mum', '', [], 0, 'A1'],
  ['echo', 'Close the door, please.', 'Eshikni yop, iltimos.', 'mum', '', [], 0, 'A1'],
  ['echo', 'Can you turn on the light?', 'Chiroqni yoqib bera olasanmi?', 'girl', '', [], 0, 'A2'],
  ['echo', 'Where are my shoes?', 'Oyoq kiyimlarim qayerda?', 'boy', '', [], 0, 'A2'],
]

const RANK = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 }

/* the starter deck for a level: its words and phrases up to that level, as server-shaped items */
export function starterDeck(level = 'A1') {
  const top = RANK[level] ?? 0
  const words = W.filter(w => RANK[w[3]] <= Math.max(1, top)).map(([text, uz, picture], i) => ({
    k: 'local', id: -(i + 1), kind: 'word', pt: picture ? (i % 3 === 0 ? 'choice' : i % 3 === 1 ? 'picture' : 'uz') : 'uz',
    text, uz, picture, say_also: [], voice: 'teacher', box: null,
  }))
  const phrases = P.filter(p => RANK[p[7]] <= Math.max(1, top)).map(([kind, text, uz, voice, prompt, accept, min], i) => ({
    k: 'local', id: -(1000 + i), kind, text, uz, voice, box: null, ...(kind === 'answer' ? { prompt, accept, min_words: min } : {}),
  }))
  return [...words, ...phrases]
}
