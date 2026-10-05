/*
 * TOBY'S DAY — what the learner says, zone by zone (10 zones: the day, then a
 * visit to the doctor and Toby's birthday party).
 *
 * Every step:
 *   id      unique across all zones
 *   type    'say' (default) · 'listen' · 'ask' · 'gap' (see below)
 *   place   which room the scene shows (a key of PLACE_KEYS in world-places.js)
 *   action  what Toby does when it is said (ACTS in world-acts.js)
 *   pic     the picture card for the sentence (an ITEM_NAMES item, drawn by items.jsx)
 *   say     the English line · uz: a short Uzbek hint
 *   after   how the world changes for the next steps (optional)
 *   by      who else talks in this step (a SPEAKERS key; default: the zone's `by`)
 *   reply   what that character answers after the line, in their own voice (optional)
 *
 * Choice steps show item cards; the learner says the sentence for ANY of them.
 * `keyword` must be heard for that option to count; `act` (optional) is the
 * action that option plays instead of the step's own. The picked `item` is
 * added to world.basket (logic.js patchFor), which is how the scene knows it.
 *
 * Exercise types:
 *   listen  `by` says `hear` (hearUz: its Uzbek) — the line is NOT shown; the
 *           learner taps the matching picture of `options` [{ item, word }]
 *           (`answer` = the right option's word), then says `say`.
 *   ask     `by` asks `ask` (uz: its Uzbek); every `choice` option is an accepted
 *           answer (shown as a hint chip, `item` optional, own `reply` optional).
 *   gap     `say` is shown with the word `gap` missing and three picture
 *           `options` [{ item, word }]; the learner says the whole sentence.
 *
 * Zone `id`s are stable save keys (1–5 are the first five zones, 6–10 came
 * later) — they are NOT the order; ZONES is in play order.
 */
import { ROOM_VOICE_LINES } from './room'

export const SLUG = 'tobys-day'
export const LS_KEY = 'tobys-day-progress'

/* who talks → the character voice (voiceTts.js CHARACTERS) and a name for the UI */
export const SPEAKERS = {
  toby: { voice: 'toby', name: 'Toby' },
  mum: { voice: 'mum', name: 'Oyijon' },
  teacher: { voice: 'teacher', name: 'Ustoz' },
  brown: { voice: 'man', name: 'Braun amaki' },
  shopkeeper: { voice: 'man', name: 'Sotuvchi' },
  driver: { voice: 'driver', name: 'Haydovchi' },
  grandma: { voice: 'grandma', name: 'Buvijon' },
  girl: { voice: 'girl', name: 'Lili' },
  boy: { voice: 'boy', name: 'Sem' },
  doctor: { voice: 'man', name: 'Shifokor' },
  narrator: { voice: 'narrator', name: '' },
}
export const voiceOf = (by) => SPEAKERS[by]?.voice || 'narrator'
/* the cast drawn in characters.jsx (a round portrait in the bubbles): everybody but Toby and the narrator */
export const hasPortrait = (who) => !!SPEAKERS[who] && who !== 'toby' && who !== 'narrator'
export const MODEL_VOICE = 'narrator'          // «Tinglash»: the clear model of a line to say
export const TOBY_VOICE = 'toby'

/* the four kinds of task, as the play screen labels them */
export const STEP_TYPES = {
  say: 'Gapni ayting',
  listen: 'Tinglang va tanlang',
  ask: 'Savolga javob bering',
  gap: 'Bo‘sh joyni to‘ldiring',
}
export const stepType = (step) => (STEP_TYPES[step?.type] ? step.type : 'say')
/* who talks in a step (its own `by`, else the zone's) */
export const speakerOf = (zone, step) => step?.by || zone?.by || 'narrator'

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
    by: 'mum',
    start: { awake: false, inBed: true, curtains: 'closed', bedMade: false, hair: 'messy', outfit: 'pyjamas' },
    steps: [
      { id: 'm1', place: 'bedroom', action: 'wake', pic: 'alarm-clock', say: "Wake up, Toby! It's morning.", uz: 'Uyg‘on, Toby! Tong otdi.', after: { awake: true } },
      { id: 'm2', place: 'bedroom', action: 'getup', pic: 'clock', say: "I get up at seven o'clock.", uz: 'Men soat yettida turaman.', after: { inBed: false } },
      { id: 'm3', place: 'bedroom', action: 'stretch', pic: 'sun', say: 'I stretch my arms and yawn.', uz: 'Qo‘llarimni cho‘zib, esnayman.' },
      { id: 'm4', place: 'bedroom', action: 'curtains', pic: 'curtains', say: 'I open the curtains.', uz: 'Pardalarni ochaman.', after: { curtains: 'open' } },
      { id: 'm9', place: 'bedroom', action: 'makebed', pic: 'bed', say: 'I make my bed.', uz: 'Karavotimni yig‘ishtiraman.', after: { bedMade: true } },
      { id: 'm5', place: 'bathroom', action: 'brush', pic: 'toothbrush', say: 'I brush my teeth.', uz: 'Tishlarimni yuvaman.' },
      {
        id: 'm6', type: 'gap', place: 'bathroom', action: 'wash', pic: 'tap', say: 'I wash my face with cold water.', gap: 'water',
        options: [{ item: 'milk', word: 'milk' }, { item: 'water', word: 'water' }, { item: 'juice', word: 'juice' }],
        uz: 'Yuzimni sovuq suv bilan yuvaman.',
      },
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
    by: 'mum',
    start: { here: false, packed: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'b1', place: 'kitchen', action: 'walk', pic: 'fridge', say: 'I go to the kitchen for breakfast.', uz: 'Nonushta uchun oshxonaga boraman.', after: { here: true } },
      { id: 'b8', place: 'kitchen', action: 'hellomum', pic: 'heart', say: "Good morning, Mum! I'm hungry.", uz: 'Xayrli tong, oyijon! Qornim och.', reply: 'Good morning, Toby! Breakfast is ready.' },
      { id: 'b2', place: 'kitchen', action: 'tea', pic: 'tea', say: 'I make a cup of hot tea.', uz: 'Bir piyola issiq choy damlayman.', after: { tea: true } },
      { id: 'b3', place: 'kitchen', action: 'eat', pic: 'egg', say: 'I eat two eggs and some bread.', uz: 'Ikkita tuxum va biroz non yeyman.', after: { ate: true } },
      {
        id: 'b4', type: 'ask', place: 'kitchen', action: 'drink', pic: 'glass', ask: 'What would you like to drink, Toby?',
        uz: 'Nima ichishni xohlaysan, Toby?', after: { juice: true }, reply: 'Here you are, Toby!',
        choice: [
          { key: 'juice', item: 'juice', label: 'orange juice', keyword: 'juice', say: "I'd like some orange juice, please.", act: 'drink' },
          { key: 'milk', item: 'milk', label: 'milk', keyword: 'milk', say: "I'd like some milk, please.", act: 'drink' },
          { key: 'water', item: 'water', label: 'water', keyword: 'water', say: "I'd like some water, please.", act: 'drink' },
        ],
      },
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
    by: 'driver',
    start: { shoes: false, outside: false, atCurb: false, crossed: false, atStop: false, bus: false, onBus: false, sitting: false, arrived: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 't1', place: 'hall', action: 'shoes', pic: 'shoes', say: 'I put on my shoes.', uz: 'Oyoq kiyimimni kiyaman.', after: { shoes: true } },
      { id: 't2', place: 'hall', action: 'door', pic: 'door', say: 'I open the door and go outside.', uz: 'Eshikni ochib, tashqariga chiqaman.', after: { outside: true } },
      { id: 't3', place: 'street', action: 'hello', pic: 'wave', by: 'brown', say: 'Hello, Mr. Brown! How are you?', uz: 'Salom, Braun amaki! Qalaysiz?', reply: "I'm fine, thank you, Toby!" },
      { id: 't4', place: 'street', action: 'redlight', pic: 'traffic-light', say: 'The light is red. I stop and wait.', uz: 'Chiroq qizil. To‘xtab, kutaman.', after: { atCurb: true } },
      { id: 't5', place: 'street', action: 'cross', pic: 'green-light', say: "Now it's green. I cross the road.", uz: 'Endi yashil. Yo‘ldan o‘taman.', after: { crossed: true } },
      { id: 't6', place: 'busstop', action: 'busstop', pic: 'bus-stop', say: 'I walk to the bus stop.', uz: 'Avtobus bekatiga piyoda boraman.', after: { atStop: true } },
      { id: 't7', place: 'busstop', action: 'buscome', pic: 'bus', say: 'Look! The bus is coming.', uz: 'Qarang! Avtobus kelyapti.', after: { bus: true } },
      { id: 't8', place: 'busstop', action: 'ticket', pic: 'ticket', say: 'I get on the bus and show my ticket.', uz: 'Avtobusga chiqib, chiptamni ko‘rsataman.', after: { onBus: true }, reply: 'Thank you! Please sit down.' },
      {
        id: 't9', type: 'listen', place: 'bus', action: 'window', pic: 'window', by: 'grandma',
        hear: 'Hello, dear! You can sit by the window.', hearUz: 'Salom, azizim! Deraza yonida o‘tirishing mumkin.',
        answer: 'window', options: [{ item: 'door', word: 'door' }, { item: 'bus-stop', word: 'bus stop' }, { item: 'window', word: 'window' }],
        say: 'Thank you! I sit by the window.', uz: 'Rahmat! Deraza yonida o‘tiraman.', after: { sitting: true },
      },
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
    by: 'teacher',
    start: { here: false, sitting: false, bookOpen: false, pencil: false, wrote: false, asked: false, answered: false, drew: false, brk: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'c1', place: 'classroom', action: 'greet', pic: 'apple', say: 'Good morning, teacher! How are you?', uz: 'Xayrli tong, ustoz! Qalaysiz?', reply: "I'm fine, thank you. Sit down, please.", after: { here: true } },
      { id: 'c2', place: 'classroom', action: 'sitdesk', pic: 'desk', say: 'I sit down at my desk.', uz: 'Partamga o‘tiraman.', after: { sitting: true } },
      {
        id: 'c3', type: 'gap', place: 'classroom', action: 'openbook', pic: 'book', say: 'I open my book to page ten.', gap: 'book',
        options: [{ item: 'door', word: 'door' }, { item: 'fridge', word: 'fridge' }, { item: 'book', word: 'book' }],
        uz: 'Kitobimni o‘ninchi betidan ochaman.', after: { bookOpen: true },
      },
      {
        id: 'c4', type: 'listen', place: 'classroom', action: 'pencil', pic: 'pencil',
        hear: 'Now, please take out your pencil.', hearUz: 'Endi qalamingizni oling, iltimos.',
        answer: 'pencil', options: [{ item: 'pencil', word: 'pencil' }, { item: 'ball', word: 'ball' }, { item: 'apple', word: 'apple' }],
        say: 'I take out my pencil.', uz: 'Qalamimni olaman.', after: { pencil: true },
      },
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
    by: 'shopkeeper',
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
      {
        id: 's9', type: 'listen', place: 'shop', action: 'packbag', pic: 'shopbag',
        hear: 'Would you like a paper bag?', hearUz: 'Qog‘oz paket kerakmi?',
        answer: 'bag', options: [{ item: 'basket', word: 'basket' }, { item: 'shopbag', word: 'bag' }, { item: 'money', word: 'money' }],
        say: 'Yes, please. I need a paper bag.', uz: 'Ha, iltimos. Menga qog‘oz paket kerak.', after: { bagged: true, hasBasket: false },
      },
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
    by: 'boy',
    start: { here: false, dog: false, sitting: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'p1', place: 'park', action: 'walk', pic: 'tree', say: 'In the afternoon, I go to the park.', uz: 'Tushdan keyin parkka boraman.', after: { here: true } },
      { id: 'p2', place: 'park', action: 'dog', pic: 'dog', say: 'I take my dog for a walk.', uz: 'Itimni sayrga olib chiqaman.', after: { dog: true } },
      { id: 'p3', place: 'park', action: 'fetch', pic: 'ball', say: 'I throw the ball and my dog catches it.', uz: 'To‘pni otaman, itim uni ilib oladi.' },
      { id: 'p4', place: 'park', action: 'kick', pic: 'football', say: 'I play football with my friends.', uz: 'Do‘stlarim bilan futbol o‘ynayman.' },
      { id: 'p8', place: 'park', action: 'slide', pic: 'slide', say: 'I go down the big slide.', uz: 'Katta tepalikdan sirg‘alib tushaman.' },
      { id: 'p5', place: 'park', action: 'bike', pic: 'bike', say: 'I ride my bike around the lake.', uz: 'Ko‘l atrofida velosiped haydayman.' },
      {
        id: 'p9', type: 'gap', place: 'park', action: 'ducks', pic: 'duck', say: 'I give some bread to the ducks.', gap: 'bread',
        options: [{ item: 'football', word: 'football' }, { item: 'bread', word: 'bread' }, { item: 'shoes', word: 'shoes' }],
        uz: 'O‘rdaklarga non beraman.', after: { fed: true },
      },
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
    by: 'mum',
    start: { washed: false, vegWashed: false, cut: false, inPot: false, salt: false, ready: false, served: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'k1', place: 'cooking', action: 'letscook', pic: 'chef-hat', say: "Let's make soup together, Mum!", uz: 'Keling, birga sho‘rva tayyorlaymiz, oyijon!', reply: 'Good idea! First, wash your hands.' },
      { id: 'k2', place: 'cooking', action: 'washhands', pic: 'soap', say: 'I wash my hands with soap.', uz: 'Qo‘llarimni sovun bilan yuvaman.', after: { washed: true } },
      { id: 'k3', place: 'cooking', action: 'washveg', pic: 'vegetables', say: 'I wash the vegetables in the sink.', uz: 'Sabzavotlarni rakovinada yuvaman.', after: { vegWashed: true } },
      { id: 'k4', place: 'cooking', action: 'cut', pic: 'carrot', say: 'I cut the carrots with Mum.', uz: 'Oyim bilan sabzilarni to‘g‘rayman.', after: { cut: true } },
      {
        id: 'k5', type: 'listen', place: 'cooking', action: 'intopot', pic: 'pot',
        hear: 'Now put the carrots in the pot, please.', hearUz: 'Endi sabzilarni qozonga sol, iltimos.',
        answer: 'carrots', options: [{ item: 'egg', word: 'eggs' }, { item: 'carrot', word: 'carrots' }, { item: 'apple', word: 'apples' }],
        say: 'I put the carrots in the pot.', uz: 'Sabzilarni qozonga solaman.', after: { inPot: true },
      },
      {
        id: 'k6', type: 'gap', place: 'cooking', action: 'salt', pic: 'salt', say: 'I add a little salt.', gap: 'salt',
        options: [{ item: 'salt', word: 'salt' }, { item: 'pencil', word: 'pencil' }, { item: 'ball', word: 'ball' }],
        uz: 'Ozgina tuz qo‘shaman.', after: { salt: true },
      },
      { id: 'k7', place: 'cooking', action: 'stir', pic: 'spoon', say: 'I stir the soup with a big spoon.', uz: 'Sho‘rvani katta qoshiq bilan aralashtiraman.' },
      { id: 'k8', place: 'cooking', action: 'taste', pic: 'fire', say: "I taste the soup. Ouch, it's hot!", uz: 'Sho‘rvani tatib ko‘raman. Voy, issiq!' },
      { id: 'k9', place: 'cooking', action: 'ready', pic: 'soup', say: 'The soup is ready. It smells so good!', uz: 'Sho‘rva tayyor. Hidi juda yoqimli!', after: { ready: true } },
      { id: 'k10', place: 'cooking', action: 'serve', pic: 'bowl', by: 'boy', say: 'I give a bowl of soup to my friend.', uz: 'Do‘stimga bir kosa sho‘rva beraman.', after: { served: true }, reply: "Thank you, Toby! It's delicious!" },
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
    by: 'mum',
    start: { here: false, inBed: false, bathed: false, lampOff: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'e1', place: 'living', action: 'home', pic: 'house', say: "I come home at six o'clock.", uz: 'Soat oltida uyga qaytaman.', after: { here: true } },
      { id: 'e2', place: 'living', action: 'homework', pic: 'books', say: 'I do my homework at my desk.', uz: 'Stolimda uy vazifamni bajaraman.' },
      {
        id: 'e3', type: 'ask', place: 'living', action: 'dinner', pic: 'plate', ask: 'What would you like for dinner?',
        uz: 'Kechki ovqatga nima xohlaysan?', reply: "Good choice! Let's eat together.",
        choice: [
          { key: 'soup', item: 'soup', label: 'soup', keyword: 'soup', say: 'Some soup, please.', act: 'dinner' },
          { key: 'sandwich', item: 'sandwich', label: 'a sandwich', keyword: 'sandwich', say: 'A sandwich, please.', act: 'dinner' },
          { key: 'egg', item: 'egg', label: 'an egg', keyword: 'egg', say: 'An egg, please.', act: 'dinner' },
        ],
      },
      { id: 'e4', place: 'living', action: 'tv', pic: 'tv', say: 'After dinner, I watch a funny cartoon.', uz: 'Kechki ovqatdan keyin qiziq multfilm ko‘raman.' },
      { id: 'e8', place: 'bathroom', action: 'bath', pic: 'bath', say: 'I take a bath with my rubber duck.', uz: 'Rezina o‘rdakcham bilan vannada cho‘milaman.', after: { bathed: true } },
      { id: 'e5', place: 'night', action: 'pajamas', pic: 'pyjamas', say: 'I put on my pajamas and brush my teeth.', uz: 'Pijamamni kiyib, tishlarimni yuvaman.', after: { outfit: 'pyjamas' } },
      { id: 'e6', place: 'night', action: 'read', pic: 'book', say: 'I read a book in bed.', uz: 'To‘shakda kitob o‘qiyman.', after: { inBed: true } },
      { id: 'e9', place: 'night', action: 'lamp', pic: 'lamp', say: 'I turn off the lamp.', uz: 'Chiroqni o‘chiraman.', after: { lampOff: true } },
      { id: 'e7', place: 'night', action: 'sleep', pic: 'moon', say: "Good night! It's time to sleep.", uz: 'Xayrli tun! Uxlash vaqti bo‘ldi.', after: { asleep: true } },
    ],
  },
  {
    id: 10,
    key: 'doctor',
    title: 'At the Doctor',
    uz: 'Shifokorda',
    blurb: 'Nima og‘riyapti? Davolanish',
    cefr: 'A2',
    from: '#2DD4BF',
    to: '#0284C7',
    by: 'doctor',
    start: { here: false, unwell: true, sitting: false, temp: false, listened: false, breathed: false, medicine: false, better: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'dr1', place: 'clinic', action: 'unwell', pic: 'sick', by: 'mum', say: "I don't feel well today.", uz: 'Bugun o‘zimni yaxshi his qilmayapman.', reply: "Let's go and see the doctor." },
      { id: 'dr2', place: 'clinic', action: 'hellodoc', pic: 'doctor', say: 'Good morning, doctor.', uz: 'Xayrli tong, shifokor.', reply: 'Good morning, Toby! Please sit down.', after: { here: true, sitting: true } },
      {
        id: 'dr3', type: 'ask', place: 'clinic', action: 'head', pic: 'headache', ask: "What's the matter, Toby?",
        uz: 'Nima bo‘ldi, Toby? Qayering og‘riyapti?', reply: 'I see. Let me check you.',
        choice: [
          { key: 'head', item: 'headache', label: 'headache', keyword: 'headache', say: 'I have a headache.', act: 'head' },
          { key: 'throat', item: 'throat', label: 'sore throat', keyword: 'throat', say: 'I have a sore throat.', act: 'throatache' },
          { key: 'tummy', item: 'tummy', label: 'stomachache', keyword: 'stomachache', say: 'I have a stomachache.', act: 'tummyache' },
        ],
      },
      {
        id: 'dr4', type: 'listen', place: 'clinic', action: 'thermo', pic: 'thermometer',
        hear: 'First, I need to check your temperature.', hearUz: 'Avval haroratingni tekshirishim kerak.',
        answer: 'thermometer', options: [{ item: 'stethoscope', word: 'stethoscope' }, { item: 'thermometer', word: 'thermometer' }, { item: 'plaster', word: 'plaster' }],
        say: 'Okay! The thermometer is cold.', uz: 'Xo‘p! Termometr sovuq ekan.', after: { temp: true }, reply: 'You have a little fever.',
      },
      {
        id: 'dr5', type: 'gap', place: 'clinic', action: 'heartbeat', pic: 'heart', say: 'The doctor listens to my heart.', gap: 'heart',
        options: [{ item: 'shoes', word: 'shoes' }, { item: 'tv', word: 'tv' }, { item: 'heart', word: 'heart' }],
        uz: 'Shifokor yuragimni eshitadi.', after: { listened: true },
      },
      { id: 'dr6', place: 'clinic', action: 'breath', pic: 'stethoscope', say: 'I take a deep breath.', uz: 'Chuqur nafas olaman.', reply: 'Good boy! Your heart is fine.', after: { breathed: true } },
      {
        id: 'dr7', type: 'listen', place: 'clinic', action: 'medicine', pic: 'medicine',
        hear: 'Take this medicine after dinner.', hearUz: 'Bu dorini kechki ovqatdan keyin ich.',
        answer: 'medicine', options: [{ item: 'medicine', word: 'medicine' }, { item: 'cake-slice', word: 'cake' }, { item: 'icecream', word: 'ice cream' }],
        say: 'Okay, doctor. I take the medicine.', uz: 'Xo‘p, shifokor. Dorini ichaman.', after: { medicine: true },
      },
      {
        id: 'dr8', type: 'ask', place: 'clinic', action: 'better', pic: 'heart', ask: 'How do you feel now, Toby?',
        uz: 'Hozir o‘zingni qanday his qilyapsan?', reply: 'Great! Get well soon, Toby.', after: { better: true, unwell: false },
        choice: [
          { key: 'better', label: 'much better', keyword: 'better', say: 'I feel much better, thank you.' },
          { key: 'great', label: 'great', keyword: 'great', say: 'I feel great now!' },
          { key: 'fine', label: 'fine', keyword: 'fine', say: "I'm fine, thank you." },
        ],
      },
      { id: 'dr9', place: 'clinic', action: 'byedoc', pic: 'plaster', say: 'Thank you, doctor! Goodbye!', uz: 'Rahmat, shifokor! Xayr!', reply: 'Goodbye! Here is a sticker for you.' },
    ],
  },
  {
    id: 9,
    key: 'birthday',
    title: 'Birthday Party',
    uz: 'Tug‘ilgan kun',
    blurb: 'Bayram, sovg‘alar, tort',
    cefr: 'A1–A2',
    from: '#F472B6',
    to: '#F59E0B',
    by: 'mum',
    start: { balloons: false, friends: false, gift: false, partyHat: false, sang: false, candlesOut: false, hair: 'neat', outfit: 'tshirt' },
    steps: [
      { id: 'bd1', place: 'party', action: 'birthday', pic: 'cake', say: 'Today is my birthday!', uz: 'Bugun mening tug‘ilgan kunim!', reply: 'Happy birthday, my dear Toby!' },
      {
        id: 'bd2', type: 'listen', place: 'party', action: 'balloons', pic: 'balloons',
        hear: 'Can you put up the balloons, please?', hearUz: 'Sharlarni osib qo‘ya olasanmi?',
        answer: 'balloons', options: [{ item: 'present', word: 'present' }, { item: 'balloons', word: 'balloons' }, { item: 'cake', word: 'cake' }],
        say: 'Yes! I put up the balloons.', uz: 'Ha! Sharlarni osaman.', after: { balloons: true },
      },
      { id: 'bd3', place: 'party', action: 'welcome', pic: 'door', by: 'girl', say: 'Hello, everyone! Come in, please.', uz: 'Salom, hammaga! Kiringlar.', reply: 'Happy birthday, Toby!', after: { friends: true } },
      {
        id: 'bd4', type: 'ask', place: 'party', action: 'age', pic: 'seven', by: 'boy', ask: 'How old are you today, Toby?',
        uz: 'Bugun necha yoshga to‘lding, Toby?', reply: 'Wow! You are big now!',
        choice: [
          { key: 'old', item: 'seven', label: 'seven years old', keyword: 'seven', say: "I'm seven years old." },
          { key: 'today', item: 'seven', label: 'seven today', keyword: 'seven', say: "I'm seven today!" },
        ],
      },
      {
        id: 'bd5', type: 'listen', place: 'party', action: 'gift', pic: 'present', by: 'grandma',
        hear: 'Happy birthday, dear! This present is for you.', hearUz: 'Tug‘ilgan kuning bilan, azizim! Bu sovg‘a senga.',
        answer: 'present', options: [{ item: 'balloons', word: 'balloons' }, { item: 'cake', word: 'cake' }, { item: 'present', word: 'present' }],
        say: 'Thank you, Grandma! I love my present.', uz: 'Rahmat, buvijon! Sovg‘am menga juda yoqdi.', after: { gift: true },
      },
      {
        id: 'bd6', type: 'gap', place: 'party', action: 'partyhat', pic: 'party-hat', say: 'I put on my party hat.', gap: 'hat',
        options: [{ item: 'candles', word: 'candles' }, { item: 'party-hat', word: 'hat' }, { item: 'cake', word: 'cake' }],
        uz: 'Bayram qalpoqchamni kiyaman.', after: { partyHat: true },
      },
      { id: 'bd7', place: 'party', action: 'song', pic: 'notes', by: 'girl', say: "Let's sing Happy Birthday!", uz: 'Keling, «Happy Birthday» qo‘shig‘ini aytamiz!', reply: 'Happy birthday to you!', after: { sang: true } },
      {
        id: 'bd8', type: 'gap', place: 'party', action: 'blow', pic: 'candles', say: 'I blow out the candles on my cake.', gap: 'candles',
        options: [{ item: 'balloons', word: 'balloons' }, { item: 'present', word: 'presents' }, { item: 'candles', word: 'candles' }],
        uz: 'Tortimdagi shamlarni puflab o‘chiraman.', after: { candlesOut: true },
      },
      {
        id: 'bd9', type: 'ask', place: 'party', action: 'cake', pic: 'cake-slice', ask: 'What would you like, Toby?',
        uz: 'Nima xohlaysan, Toby?', reply: 'Here you are, birthday boy!',
        choice: [
          { key: 'cake', item: 'cake-slice', label: 'cake', keyword: 'cake', say: 'A piece of cake, please.', act: 'cake' },
          { key: 'icecream', item: 'icecream', label: 'ice cream', keyword: 'cream', say: 'Some ice cream, please.', act: 'icecream' },
          { key: 'juice', item: 'juice', label: 'juice', keyword: 'juice', say: 'Some juice, please.', act: 'drink' },
        ],
      },
      { id: 'bd10', place: 'party', action: 'best', pic: 'heart', say: 'Thank you, everyone! This is the best day!', uz: 'Hammaga rahmat! Bu eng zo‘r kun!', reply: 'We love you, Toby!' },
    ],
  },
]

export const GREETING = "Hi! I'm Toby. Let's start my day!"

/* the line(s) the learner may say in a step (choice / ask: every option) */
export const stepLines = (step) => (step.choice ? step.choice.map(o => o.say) : [step.say])
/* what the other character says before the learner speaks (listen / ask), or '' */
export const promptLine = (step) => (step.type === 'listen' ? step.hear || '' : step.type === 'ask' ? step.ask || '' : '')

/*
 * Every line a zone may say, in the order it is needed, for preloading:
 * per step the prompt (listen / ask), Toby's line(s), the reply — then the
 * model voice (narrator) for «Tinglash» at the end. → [{ text, voice }]
 */
export function zoneLines(zone) {
  const out = []
  const seen = new Set()
  const add = (text, voice) => {
    const key = `${voice}:${text}`
    if (!text || seen.has(key)) return
    seen.add(key)
    out.push({ text, voice })
  }
  for (const s of zone.steps) {
    const who = voiceOf(speakerOf(zone, s))
    add(promptLine(s), who)
    stepLines(s).forEach(t => add(t, TOBY_VOICE))
    if (s.choice) s.choice.forEach(o => add(o.reply, who))
    add(s.reply, who)
  }
  for (const s of zone.steps) stepLines(s).forEach(t => add(t, MODEL_VOICE))
  return out
}

/* every line the game can say, in every voice (the admin «warm voices» button) → [{ text, voice }] */
export function allVoiceLines() {
  const out = [{ text: GREETING, voice: TOBY_VOICE }]
  const seen = new Set([`${TOBY_VOICE}:${GREETING}`])
  for (const l of [...ZONES.flatMap(zoneLines), ...ROOM_VOICE_LINES]) {
    const key = `${l.voice}:${l.text}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(l)
  }
  return out
}
