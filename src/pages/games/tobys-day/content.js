/*
 * TOBY'S DAY — what the learner says, zone by zone (8 zones in day order).
 *
 * Every step:
 *   id      unique across all zones
 *   place   which room the scene shows (a key of PLACE_KEYS in world-places.js)
 *   action  what Toby does when it is said (ACTS in scenes.jsx)
 *   pic     the picture card for the sentence (an ITEM_NAMES item, drawn by items.jsx)
 *   say     the English line · uz: a short Uzbek hint
 *   after   how the world changes for the next steps (optional)
 *   reply   what the other character answers, spoken by the model voice (optional)
 *
 * Choice steps show item cards; the learner says the sentence for ANY of them.
 * `keyword` must be heard for that option to count; `act` (optional) is the
 * action that option plays instead of the step's own. The picked `item` is
 * added to world.basket (logic.js patchFor), which is how the scene knows it.
 *
 * Zone `id`s are stable save keys (1–5 are the first five zones, 6–8 came
 * later) — they are NOT the order; ZONES is in day order.
 */

export const SLUG = 'tobys-day'
export const LS_KEY = 'tobys-day-progress'

export const ZONES = [
  {
    id: 1,
    key: 'morning',
    title: 'Morning',
    uz: 'Tong',
    blurb: 'Yotoqxona va hammom',
    cefr: 'A1',
    from: '#FB923C',
    to: '#E11D48',
    start: { awake: false, inBed: true, curtains: 'closed', bedMade: false, hair: 'messy', outfit: 'pyjamas' },
    steps: [
      { id: 'm1', place: 'bedroom', action: 'wake', pic: 'alarm-clock', say: "Wake up, Toby! It's morning.", uz: 'Uyg‘on, Toby! Tong otdi.', after: { awake: true } },
      { id: 'm2', place: 'bedroom', action: 'getup', pic: 'clock', say: "I get up at seven o'clock.", uz: 'Men soat yettida turaman.', after: { inBed: false } },
      { id: 'm3', place: 'bedroom', action: 'stretch', pic: 'sun', say: 'I stretch my arms and yawn.', uz: 'Qo‘llarimni cho‘zib, esnayman.' },
      { id: 'm4', place: 'bedroom', action: 'curtains', pic: 'curtains', say: 'I open the curtains.', uz: 'Pardalarni ochaman.', after: { curtains: 'open' } },
      { id: 'm9', place: 'bedroom', action: 'makebed', pic: 'bed', say: 'I make my bed.', uz: 'Karavotimni yig‘ishtiraman.', after: { bedMade: true } },
      { id: 'm5', place: 'bathroom', action: 'brush', pic: 'toothbrush', say: 'I brush my teeth.', uz: 'Tishlarimni yuvaman.' },
      { id: 'm6', place: 'bathroom', action: 'wash', pic: 'tap', say: 'I wash my face with cold water.', uz: 'Yuzimni sovuq suv bilan yuvaman.' },
      { id: 'm10', place: 'bathroom', action: 'towel', pic: 'towel', say: 'I dry my face with a towel.', uz: 'Yuzimni sochiq bilan artaman.' },
      { id: 'm7', place: 'bathroom', action: 'comb', pic: 'comb', say: 'I comb my hair.', uz: 'Sochimni tarayman.', after: { hair: 'neat' } },
      { id: 'm8', place: 'bedroom', action: 'dress', pic: 'tshirt', say: "I get dressed and I'm ready!", uz: 'Kiyinaman va tayyorman!', after: { outfit: 'tshirt' } },
    ],
  },
  {
    id: 2,
    key: 'breakfast',
    title: 'Breakfast',
    uz: 'Nonushta',
    blurb: 'Oshxona, oyim bilan',
    cefr: 'A1–A2',
    from: '#F59E0B',
    to: '#EA580C',
    start: { here: false, packed: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'b1', place: 'kitchen', action: 'walk', pic: 'fridge', say: 'I go to the kitchen for breakfast.', uz: 'Nonushta uchun oshxonaga boraman.', after: { here: true } },
      { id: 'b8', place: 'kitchen', action: 'hellomum', pic: 'heart', say: "Good morning, Mum! I'm hungry.", uz: 'Xayrli tong, oyijon! Qornim och.', reply: 'Good morning, Toby! Breakfast is ready.' },
      { id: 'b2', place: 'kitchen', action: 'tea', pic: 'tea', say: 'I make a cup of hot tea.', uz: 'Bir piyola issiq choy damlayman.', after: { tea: true } },
      { id: 'b3', place: 'kitchen', action: 'eat', pic: 'egg', say: 'I eat two eggs and some bread.', uz: 'Ikkita tuxum va biroz non yeyman.', after: { ate: true } },
      { id: 'b4', place: 'kitchen', action: 'drink', pic: 'glass', say: 'I drink a glass of orange juice.', uz: 'Bir stakan apelsin sharbati ichaman.', after: { juice: true } },
      { id: 'b5', place: 'kitchen', action: 'yum', pic: 'yum', say: 'This breakfast is really delicious!', uz: 'Bu nonushta juda mazali!' },
      { id: 'b6', place: 'kitchen', action: 'dishes', pic: 'sponge', say: 'I wash the dishes after breakfast.', uz: 'Nonushtadan keyin idishlarni yuvaman.', after: { clean: true } },
      { id: 'b9', place: 'kitchen', action: 'lunch', pic: 'lunchbox', say: 'I put my lunch in my backpack.', uz: 'Tushligimni ryukzagimga solaman.', after: { packed: true } },
      { id: 'b7', place: 'kitchen', action: 'bag', pic: 'backpack', say: "Bye, Mum! I'm going to school.", uz: 'Xayr, oyijon! Maktabga ketyapman.', reply: 'Bye, Toby! Have a nice day!' },
    ],
  },
  {
    id: 6,
    key: 'street',
    title: 'Street',
    uz: 'Ko‘cha',
    blurb: 'Ko‘chaga chiqish, avtobus',
    cefr: 'A1–A2',
    from: '#22D3EE',
    to: '#2563EB',
    start: { shoes: false, outside: false, atCurb: false, crossed: false, atStop: false, bus: false, onBus: false, sitting: false, arrived: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 't1', place: 'hall', action: 'shoes', pic: 'shoes', say: 'I put on my shoes.', uz: 'Oyoq kiyimimni kiyaman.', after: { shoes: true } },
      { id: 't2', place: 'hall', action: 'door', pic: 'door', say: 'I open the door and go outside.', uz: 'Eshikni ochib, tashqariga chiqaman.', after: { outside: true } },
      { id: 't3', place: 'street', action: 'hello', pic: 'wave', say: 'Hello, Mr. Brown! How are you?', uz: 'Salom, Braun amaki! Qalaysiz?', reply: "I'm fine, thank you, Toby!" },
      { id: 't4', place: 'street', action: 'redlight', pic: 'traffic-light', say: 'The light is red. I stop and wait.', uz: 'Chiroq qizil. To‘xtab, kutaman.', after: { atCurb: true } },
      { id: 't5', place: 'street', action: 'cross', pic: 'green-light', say: "Now it's green. I cross the road.", uz: 'Endi yashil. Yo‘ldan o‘taman.', after: { crossed: true } },
      { id: 't6', place: 'busstop', action: 'busstop', pic: 'bus-stop', say: 'I walk to the bus stop.', uz: 'Avtobus bekatiga piyoda boraman.', after: { atStop: true } },
      { id: 't7', place: 'busstop', action: 'buscome', pic: 'bus', say: 'Look! The bus is coming.', uz: 'Qarang! Avtobus kelyapti.', after: { bus: true } },
      { id: 't8', place: 'busstop', action: 'ticket', pic: 'ticket', say: 'I get on the bus and show my ticket.', uz: 'Avtobusga chiqib, chiptamni ko‘rsataman.', after: { onBus: true }, reply: 'Thank you! Please sit down.' },
      { id: 't9', place: 'bus', action: 'window', pic: 'window', say: 'I sit by the window.', uz: 'Deraza yonida o‘tiraman.', after: { sitting: true } },
      { id: 't10', place: 'bus', action: 'getoff', pic: 'school', say: 'I get off the bus at school.', uz: 'Maktab oldida avtobusdan tushaman.', after: { arrived: true, sitting: false }, reply: 'Bye, Toby! Have a good day!' },
    ],
  },
  {
    id: 7,
    key: 'school',
    title: 'School',
    uz: 'Maktab',
    blurb: 'Dars, yozish, javob berish',
    cefr: 'A1–A2',
    from: '#A3E635',
    to: '#0D9488',
    start: { here: false, sitting: false, bookOpen: false, pencil: false, wrote: false, asked: false, answered: false, drew: false, brk: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'c1', place: 'classroom', action: 'greet', pic: 'apple', say: 'Good morning, teacher! How are you?', uz: 'Xayrli tong, ustoz! Qalaysiz?', reply: "I'm fine, thank you. Sit down, please.", after: { here: true } },
      { id: 'c2', place: 'classroom', action: 'sitdesk', pic: 'desk', say: 'I sit down at my desk.', uz: 'Partamga o‘tiraman.', after: { sitting: true } },
      { id: 'c3', place: 'classroom', action: 'openbook', pic: 'book', say: 'I open my book to page ten.', uz: 'Kitobimni o‘ninchi betidan ochaman.', after: { bookOpen: true } },
      { id: 'c4', place: 'classroom', action: 'pencil', pic: 'pencil', say: 'I take out my pencil.', uz: 'Qalamimni olaman.', after: { pencil: true } },
      { id: 'c5', place: 'classroom', action: 'date', pic: 'notebook', say: 'I write the date in my notebook.', uz: 'Daftarimga sanani yozaman.', after: { wrote: true } },
      { id: 'c6', place: 'classroom', action: 'raise', pic: 'hand', say: 'I raise my hand.', uz: 'Qo‘limni ko‘taraman.', reply: 'Yes, Toby? What is six plus six?', after: { asked: true } },
      { id: 'c7', place: 'classroom', action: 'answer', pic: 'blackboard', say: 'The answer is twelve.', uz: 'Javob — o‘n ikki.', reply: 'Very good, Toby! Well done!', after: { answered: true } },
      { id: 'c8', place: 'classroom', action: 'draw', pic: 'cat', say: 'I draw a picture of a cat.', uz: 'Mushukning rasmini chizaman.', after: { drew: true } },
      { id: 'c9', place: 'classroom', action: 'bell', pic: 'bell', say: "The bell rings. It's break time!", uz: 'Qo‘ng‘iroq chalinadi. Tanaffus!', after: { brk: true, sitting: false } },
      {
        id: 'c10', place: 'classroom', action: 'break', pic: 'ball', say: 'Break time! I …', uz: 'Tanaffusda nima qilasiz? Bittasini ayting.',
        choice: [
          { key: 'play', item: 'ball', label: 'play', keyword: 'play', say: 'I play with my friends.', act: 'play' },
          { key: 'sing', item: 'notes', label: 'sing a song', keyword: 'sing', say: 'I sing a song with my friends.', act: 'sing' },
          { key: 'lunch', item: 'sandwich', label: 'eat lunch', keyword: 'lunch', say: 'I eat lunch with my friends.', act: 'snack' },
          { key: 'pack', item: 'backpack', label: 'pack my bag', keyword: 'pack', say: 'I pack my bag and go home.', act: 'pack' },
        ],
      },
    ],
  },
  {
    id: 3,
    key: 'shop',
    title: 'Shop',
    uz: 'Do‘kon',
    blurb: 'Xarid qilish, to‘lash',
    cefr: 'A2',
    from: '#A855F7',
    to: '#DB2777',
    start: { here: false, hasBasket: false, basket: [], bagged: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 's8', place: 'shop', action: 'enter', pic: 'list', say: 'I go to the shop with a shopping list.', uz: 'Xaridlar ro‘yxati bilan do‘konga boraman.', after: { here: true } },
      {
        id: 's1', place: 'shop', action: 'basket', pic: 'basket', say: 'Good afternoon! Can I have a basket, please?',
        uz: 'Xayrli kun! Menga savat bera olasizmi?', after: { hasBasket: true }, reply: 'Of course! Here you are.',
      },
      {
        id: 's2', place: 'shop', action: 'pick', pic: 'apples', say: 'I want some …, please.', uz: 'Menga ... kerak, iltimos.',
        choice: [
          { key: 'apples', item: 'apples', label: 'apples', keyword: 'apples', say: 'I want some apples, please.' },
          { key: 'bananas', item: 'bananas', label: 'bananas', keyword: 'bananas', say: 'I want some bananas, please.' },
          { key: 'oranges', item: 'oranges', label: 'oranges', keyword: 'oranges', say: 'I want some oranges, please.' },
          { key: 'grapes', item: 'grapes', label: 'grapes', keyword: 'grapes', say: 'I want some grapes, please.' },
        ],
      },
      {
        id: 's3', place: 'shop', action: 'pick', pic: 'milk', say: 'Can I have some …, please?', uz: 'Menga ... bera olasizmi?',
        choice: [
          { key: 'bread', item: 'bread', label: 'bread', keyword: 'bread', say: 'Can I have some bread, please?' },
          { key: 'milk', item: 'milk', label: 'milk', keyword: 'milk', say: 'Can I have some milk, please?' },
          { key: 'cheese', item: 'cheese', label: 'cheese', keyword: 'cheese', say: 'Can I have some cheese, please?' },
          { key: 'eggs', item: 'eggs', label: 'eggs', keyword: 'eggs', say: 'Can I have some eggs, please?' },
        ],
      },
      {
        id: 's4', place: 'shop', action: 'pick', pic: 'cookies', say: 'And a … of …, please.', uz: 'Va bir shisha / quti / plitka ..., iltimos.',
        choice: [
          { key: 'water', item: 'water', label: 'a bottle of water', keyword: 'water', say: 'And a bottle of water, please.' },
          { key: 'juice', item: 'juice', label: 'a carton of juice', keyword: 'juice', say: 'And a carton of juice, please.' },
          { key: 'chocolate', item: 'chocolate', label: 'a bar of chocolate', keyword: 'chocolate', say: 'And a bar of chocolate, please.' },
          { key: 'cookies', item: 'cookies', label: 'a box of cookies', keyword: 'cookies', say: 'And a box of cookies, please.' },
        ],
      },
      { id: 's5', place: 'shop', action: 'price', pic: 'price-tag', say: 'How much is it?', uz: 'Bu qancha turadi?', after: { priced: true }, reply: "That's eight dollars, please." },
      { id: 's6', place: 'shop', action: 'pay', pic: 'money', say: 'Here you are. Thank you!', uz: 'Mana, oling. Rahmat!', after: { paid: true }, reply: 'Thank you! Have a nice day!' },
      { id: 's9', place: 'shop', action: 'packbag', pic: 'shopbag', say: 'I put everything in a paper bag.', uz: 'Hammasini qog‘oz paketga solaman.', after: { bagged: true, hasBasket: false } },
      { id: 's7', place: 'shop', action: 'bye', pic: 'wave', say: 'Goodbye! See you tomorrow.', uz: 'Xayr! Ertaga ko‘rishguncha.' },
    ],
  },
  {
    id: 4,
    key: 'park',
    title: 'Park',
    uz: 'Park',
    blurb: 'Tushdan keyin o‘yin',
    cefr: 'A2',
    from: '#16A34A',
    to: '#0E7490',
    start: { here: false, dog: false, sitting: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'p1', place: 'park', action: 'walk', pic: 'tree', say: 'In the afternoon, I go to the park.', uz: 'Tushdan keyin parkka boraman.', after: { here: true } },
      { id: 'p2', place: 'park', action: 'dog', pic: 'dog', say: 'I take my dog for a walk.', uz: 'Itimni sayrga olib chiqaman.', after: { dog: true } },
      { id: 'p3', place: 'park', action: 'fetch', pic: 'ball', say: 'I throw the ball and my dog catches it.', uz: 'To‘pni otaman, itim uni ilib oladi.' },
      { id: 'p4', place: 'park', action: 'kick', pic: 'football', say: 'I play football with my friends.', uz: 'Do‘stlarim bilan futbol o‘ynayman.' },
      { id: 'p8', place: 'park', action: 'slide', pic: 'slide', say: 'I go down the big slide.', uz: 'Katta tepalikdan sirg‘alib tushaman.' },
      { id: 'p5', place: 'park', action: 'bike', pic: 'bike', say: 'I ride my bike around the lake.', uz: 'Ko‘l atrofida velosiped haydayman.' },
      { id: 'p9', place: 'park', action: 'ducks', pic: 'duck', say: 'I give some bread to the ducks.', uz: 'O‘rdaklarga non beraman.', after: { fed: true } },
      { id: 'p6', place: 'park', action: 'icecream', pic: 'icecream', say: "It's hot today, so I buy an ice cream.", uz: 'Bugun issiq, shuning uchun muzqaymoq olaman.' },
      { id: 'p7', place: 'park', action: 'bench', pic: 'bench', say: 'I sit on a bench and relax.', uz: 'Skameykada o‘tirib, dam olaman.', after: { sitting: true } },
    ],
  },
  {
    id: 8,
    key: 'cooking',
    title: 'Cooking',
    uz: 'Ovqat pishirish',
    blurb: 'Sho‘rva tayyorlaymiz',
    cefr: 'A2',
    from: '#FB7185',
    to: '#C2410C',
    start: { washed: false, vegWashed: false, cut: false, inPot: false, salt: false, ready: false, served: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'k1', place: 'cooking', action: 'letscook', pic: 'chef-hat', say: "Let's make soup together, Mum!", uz: 'Keling, birga sho‘rva tayyorlaymiz, oyijon!', reply: 'Good idea! First, wash your hands.' },
      { id: 'k2', place: 'cooking', action: 'washhands', pic: 'soap', say: 'I wash my hands with soap.', uz: 'Qo‘llarimni sovun bilan yuvaman.', after: { washed: true } },
      { id: 'k3', place: 'cooking', action: 'washveg', pic: 'vegetables', say: 'I wash the vegetables in the sink.', uz: 'Sabzavotlarni rakovinada yuvaman.', after: { vegWashed: true } },
      { id: 'k4', place: 'cooking', action: 'cut', pic: 'carrot', say: 'I cut the carrots with Mum.', uz: 'Oyim bilan sabzilarni to‘g‘rayman.', after: { cut: true } },
      { id: 'k5', place: 'cooking', action: 'intopot', pic: 'pot', say: 'I put the carrots in the pot.', uz: 'Sabzilarni qozonga solaman.', after: { inPot: true } },
      { id: 'k6', place: 'cooking', action: 'salt', pic: 'salt', say: 'I add a little salt.', uz: 'Ozgina tuz qo‘shaman.', after: { salt: true } },
      { id: 'k7', place: 'cooking', action: 'stir', pic: 'spoon', say: 'I stir the soup with a big spoon.', uz: 'Sho‘rvani katta qoshiq bilan aralashtiraman.' },
      { id: 'k8', place: 'cooking', action: 'taste', pic: 'fire', say: "I taste the soup. Ouch, it's hot!", uz: 'Sho‘rvani tatib ko‘raman. Voy, issiq!' },
      { id: 'k9', place: 'cooking', action: 'ready', pic: 'soup', say: 'The soup is ready. It smells so good!', uz: 'Sho‘rva tayyor. Hidi juda yoqimli!', after: { ready: true } },
      { id: 'k10', place: 'cooking', action: 'serve', pic: 'bowl', say: 'I give a bowl of soup to my friend.', uz: 'Do‘stimga bir kosa sho‘rva beraman.', after: { served: true }, reply: "Thank you, Toby! It's delicious!" },
    ],
  },
  {
    id: 5,
    key: 'evening',
    title: 'Evening',
    uz: 'Kechqurun',
    blurb: 'Uy, kechki ovqat, uyqu',
    cefr: 'A2–B1',
    from: '#6366F1',
    to: '#7E22CE',
    start: { here: false, inBed: false, bathed: false, lampOff: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'e1', place: 'living', action: 'home', pic: 'house', say: "I come home at six o'clock.", uz: 'Soat oltida uyga qaytaman.', after: { here: true } },
      { id: 'e2', place: 'living', action: 'homework', pic: 'books', say: 'I do my homework at my desk.', uz: 'Stolimda uy vazifamni bajaraman.' },
      { id: 'e3', place: 'living', action: 'dinner', pic: 'plate', say: 'I have dinner with my family.', uz: 'Oilam bilan kechki ovqatlanaman.' },
      { id: 'e4', place: 'living', action: 'tv', pic: 'tv', say: 'After dinner, I watch a funny cartoon.', uz: 'Kechki ovqatdan keyin qiziq multfilm ko‘raman.' },
      { id: 'e8', place: 'bathroom', action: 'bath', pic: 'bath', say: 'I take a bath with my rubber duck.', uz: 'Rezina o‘rdakcham bilan vannada cho‘milaman.', after: { bathed: true } },
      { id: 'e5', place: 'night', action: 'pajamas', pic: 'pyjamas', say: 'I put on my pajamas and brush my teeth.', uz: 'Pijamamni kiyib, tishlarimni yuvaman.', after: { outfit: 'pyjamas' } },
      { id: 'e6', place: 'night', action: 'read', pic: 'book', say: 'I read a book in bed.', uz: 'To‘shakda kitob o‘qiyman.', after: { inBed: true } },
      { id: 'e9', place: 'night', action: 'lamp', pic: 'lamp', say: 'I turn off the lamp.', uz: 'Chiroqni o‘chiraman.', after: { lampOff: true } },
      { id: 'e7', place: 'night', action: 'sleep', pic: 'moon', say: "Good night! It's time to sleep.", uz: 'Xayrli tun! Uxlash vaqti bo‘ldi.', after: { asleep: true } },
    ],
  },
]

export const GREETING = "Hi! I'm Toby. Let's start my day!"

/* every line the model voice may say in a zone (for preloading) */
export function zoneLines(zone) {
  const out = []
  for (const s of zone.steps) {
    if (s.choice) s.choice.forEach(o => out.push(o.say))
    else out.push(s.say)
    if (s.reply) out.push(s.reply)
  }
  return out
}
