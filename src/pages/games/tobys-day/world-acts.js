/*
 * TOBY'S DAY — what Toby does when a line is said: his mood, pose, what he holds
 * (left / right paw), and whether he walks / rides. One entry per content.js
 * `action` (and per choice option `act`). Moods and poses are Toby.jsx names;
 * an unknown one falls back to idle / rest there. The scene adds the props and
 * effects around him (scenes.jsx and the scene-*.jsx rooms).
 */
export const ACTS = {
  /* morning */
  wake: { mood: 'yawn', pose: 'up' },
  getup: { mood: 'happy' },
  stretch: { mood: 'yawn', pose: 'up' },
  curtains: { mood: 'happy', pose: 'up' },
  makebed: { mood: 'proud', pose: 'scrub' },
  brush: { mood: 'proud', pose: 'brush', right: 'toothbrush' },
  wash: { mood: 'happy', pose: 'face' },
  towel: { mood: 'happy', pose: 'face', right: 'towel' },
  comb: { mood: 'proud', pose: 'comb' },
  dress: { mood: 'happy', pose: 'up' },

  /* breakfast */
  walk: { mood: 'happy', walking: true },
  hellomum: { mood: 'happy', pose: 'wave' },
  tea: { mood: 'happy', pose: 'belly' },
  eat: { mood: 'chew', pose: 'mouth', right: 'fork' },
  drink: { mood: 'happy', pose: 'mouth', right: 'glass', rightProps: { drain: true } },
  yum: { mood: 'love', pose: 'belly' },
  dishes: { mood: 'happy', pose: 'scrub', right: 'sponge' },
  lunch: { mood: 'happy', pose: 'clap' },
  bag: { mood: 'happy', pose: 'wave', left: 'backpack' },

  /* street */
  shoes: { mood: 'happy' },
  door: { mood: 'happy', pose: 'wave', walking: true },
  hello: { mood: 'happy', pose: 'wave' },
  redlight: { mood: 'proud', pose: 'point' },
  cross: { mood: 'happy', walking: true },
  busstop: { mood: 'happy', walking: true },
  buscome: { mood: 'surprised', pose: 'point' },
  ticket: { mood: 'happy', pose: 'give', right: 'ticket', walking: true },
  window: { mood: 'happy', pose: 'sit' },
  getoff: { mood: 'happy', pose: 'wave', walking: true },

  /* school */
  greet: { mood: 'happy', pose: 'wave', walking: true },
  sitdesk: { mood: 'happy', pose: 'sit' },
  openbook: { mood: 'proud', pose: 'point' },
  pencil: { mood: 'proud', pose: 'raise', right: 'pencil' },
  date: { mood: 'proud', pose: 'write', right: 'pencil' },
  raise: { mood: 'proud', pose: 'raise' },
  answer: { mood: 'happy', pose: 'point' },
  draw: { mood: 'happy', pose: 'write', right: 'pencil' },
  bell: { mood: 'happy', pose: 'cheer' },
  break: { mood: 'happy', pose: 'cheer' },
  play: { mood: 'happy', pose: 'throw' },
  sing: { mood: 'sing', pose: 'dance' },
  snack: { mood: 'chew', pose: 'mouth', right: 'sandwich' },
  pack: { mood: 'happy', pose: 'wave', left: 'backpack' },

  /* shop */
  enter: { mood: 'happy', walking: true, right: 'list' },
  basket: { mood: 'happy' },
  pick: { mood: 'happy' },
  price: { mood: 'proud', pose: 'think' },
  pay: { mood: 'happy', pose: 'give', right: 'coin' },
  packbag: { mood: 'happy', pose: 'clap' },
  bye: { mood: 'happy', pose: 'wave' },

  /* park */
  dog: { mood: 'happy', walking: true },
  fetch: { mood: 'happy', pose: 'throw' },
  kick: { mood: 'happy', pose: 'kick', kick: true },
  slide: { mood: 'happy', pose: 'up' },
  bike: { mood: 'happy', pose: 'ride', vehicle: 'bike', walking: true },
  ducks: { mood: 'happy', pose: 'throw', right: 'bread' },
  icecream: { mood: 'lick', pose: 'lick', right: 'icecream' },
  bench: { mood: 'relax', pose: 'sit' },

  /* cooking */
  letscook: { mood: 'happy', pose: 'cheer' },
  washhands: { mood: 'happy', pose: 'scrub' },
  washveg: { mood: 'happy', pose: 'scrub' },
  cut: { mood: 'proud', pose: 'write', right: 'knife' },
  intopot: { mood: 'happy', pose: 'give' },
  salt: { mood: 'proud', pose: 'wave', right: 'salt' },
  stir: { mood: 'happy', pose: 'stir' },
  taste: { mood: 'surprised', pose: 'mouth', right: 'spoon' },
  ready: { mood: 'love', pose: 'belly' },
  serve: { mood: 'happy', pose: 'give', right: 'bowl' },

  /* evening */
  home: { mood: 'happy', pose: 'wave', walking: true },
  homework: { mood: 'proud', pose: 'write', right: 'pencil' },
  dinner: { mood: 'chew', pose: 'mouth', right: 'fork' },
  tv: { mood: 'laugh', pose: 'belly' },
  bath: { mood: 'relax' },
  pajamas: { mood: 'proud', pose: 'brush', right: 'toothbrush' },
  read: { mood: 'proud', pose: 'read', right: 'book' },
  lamp: { mood: 'sleepy' },
  sleep: { mood: 'sleep' },
}
