/*
 * VOICE DRIVE art: the six road themes, the five cars and every sprite, drawn
 * once with Path2D (SVG path data) into small off-screen canvases. The road
 * renderer then only calls drawImage per frame — cheap enough for 60 fps on a
 * mid-range phone. No external images, no logos, no brand names.
 */

/* ── themes (palettes) ──────────────────────────────────────────────── */
const DAY_LEAF = ['#2f7d3a', '#3f9a47', '#69bf6c']

export const THEMES = {
  day: {
    uz: 'Kunduzgi shahar', en: 'City day',
    skyTop: '#1f7fe0', skyMid: '#5ab8f5', skyBottom: '#cdeeff',
    sun: '#fff7c2', sunGlow: 'rgba(255,244,190,0.55)', sunX: 0.8, sunY: 0.32, sunR: 0.06, sunStripes: false,
    clouds: 'rgba(255,255,255,0.9)', bg: 'city',
    hills: ['#86c2a6', '#6aac8f'], skyline: '#a9c9e2', skylineLit: null,
    fog: [205, 238, 255], grass: ['#55b25a', '#4ca651'], road: ['#4a4f5c', '#454955'],
    rumble: ['#e53945', '#f5f5f5'], lane: '#f8fafc', rock: '#8c8a86', rockDark: '#6e6c69',
    trunk: '#7a4a24', leaf: DAY_LEAF, bush: ['#3d8f45', '#58ad5d'],
    bldg: ['#f2c6a0', '#e8a87c', '#cfd8e3', '#f6e3b4', '#b9d7c9'], win: '#9fd2f5', winLit: '#9fd2f5', roof: '#c2554b',
    night: false, stars: false, lights: false, weather: null,
    scenery: ['tree', 'tree', 'house', 'house', 'lamp', 'bush', 'billboard', 'building', 'tree'],
    far: ['tower', 'tower', 'building', 'tree', 'tower'],
    words: ['HELLO!', 'PIZZA', 'BOOKS', 'SMILE', 'MUSIC', 'WELCOME'],
  },
  sunset: {
    uz: 'Quyosh botishi bulvari', en: 'Sunset boulevard',
    skyTop: '#1a1240', skyMid: '#6e2a78', skyBottom: '#ff8d52',
    sun: '#ffcf6b', sunGlow: 'rgba(255,140,90,0.55)', sunX: 0.5, sunY: 0.62, sunR: 0.13, sunStripes: true,
    clouds: 'rgba(255,170,150,0.35)', bg: 'city',
    hills: ['#4a2457', '#3a1c46'], skyline: '#2c1640', skylineLit: '#ff9e6b',
    fog: [255, 141, 92], grass: ['#3b6a43', '#355f3c'], road: ['#34313f', '#302d3a'],
    rumble: ['#ff4d6d', '#fde2e4'], lane: '#fff1e6', rock: '#5b4a5e', rockDark: '#45374a',
    trunk: '#5b3a29', leaf: ['#1f5132', '#2b6b3f', '#3f8a52'], bush: ['#245a35', '#2f7343'],
    bldg: ['#4b2a5c', '#5d2f63', '#3d2950', '#6b3a58'], win: '#ffb37a', winLit: '#ffd59e', roof: '#2a1838',
    night: false, stars: false, lights: false, weather: null,
    scenery: ['palm', 'palm', 'bush', 'building', 'lamp', 'billboard', 'palm'],
    far: ['tower', 'palm', 'building', 'tower'],
    words: ['BEACH', 'ICE CREAM', 'SURF', 'HOTEL', 'SUNNY', 'JUICE'],
  },
  night: {
    uz: 'Tungi shahar chiroqlari', en: 'Night city lights',
    skyTop: '#02040f', skyMid: '#081233', skyBottom: '#1b2a63',
    sun: '#f1f5ff', sunGlow: 'rgba(170,190,255,0.35)', sunX: 0.78, sunY: 0.28, sunR: 0.045, sunStripes: false, moon: true,
    clouds: null, bg: 'city',
    hills: ['#0d1430', '#0a1028'], skyline: '#0c1230', skylineLit: '#ffd27a',
    fog: [27, 42, 99], grass: ['#14301f', '#112a1b'], road: ['#262732', '#22232d'],
    rumble: ['#e11d48', '#cbd5e1'], lane: '#e2e8f0', rock: '#2a2f45', rockDark: '#1c2033',
    trunk: '#3b2a1e', leaf: ['#0f3b24', '#155030', '#1f6b40'], bush: ['#123824', '#1a4a30'],
    bldg: ['#1b2141', '#232a52', '#1a1d33', '#2a2246'], win: '#1e2748', winLit: '#ffd98a', roof: '#11152b',
    night: true, stars: true, lights: true, weather: null,
    scenery: ['building', 'building', 'lamp', 'billboard', 'tree', 'lamp'],
    far: ['tower', 'tower', 'building'],
    words: ['CINEMA', 'PIZZA', 'OPEN', 'GOOD NIGHT', 'TAXI', 'MUSIC'],
  },
  desert: {
    uz: 'Cho‘l yo‘li', en: 'Desert road',
    skyTop: '#2f86d6', skyMid: '#8cc8ee', skyBottom: '#fde7c4',
    sun: '#fff3c4', sunGlow: 'rgba(255,236,170,0.65)', sunX: 0.25, sunY: 0.3, sunR: 0.07, sunStripes: false,
    clouds: 'rgba(255,255,255,0.5)', bg: 'mesas',
    hills: ['#e8b479', '#d99b5c'], skyline: '#c27448', skylineLit: null,
    fog: [253, 226, 186], grass: ['#e8c48c', '#dfb77c'], road: ['#5b5048', '#554a43'],
    rumble: ['#f97316', '#fff7ed'], lane: '#fef3c7', rock: '#b8683f', rockDark: '#94502d',
    trunk: '#7a5230', leaf: ['#2f7d4a', '#3c9a5a', '#6cc07f'], bush: ['#a3894f', '#bfa264'],
    bldg: ['#e7c79a', '#d9b282', '#f0dcb8'], win: '#7cc3e8', winLit: '#7cc3e8', roof: '#b45a3c',
    night: false, stars: false, lights: false, weather: null,
    scenery: ['cactus', 'cactus', 'rock', 'billboard', 'deadbush', 'none', 'cactus'],
    far: ['mesa', 'mesa', 'rock', 'cactus'],
    words: ['WATER', 'OASIS', 'HOT!', 'CAMELS', 'SUNNY', 'DRINK'],
  },
  snow: {
    uz: 'Qorli tog‘', en: 'Snowy mountain',
    skyTop: '#6f9bd1', skyMid: '#b4cdeb', skyBottom: '#eef4fb',
    sun: '#ffffff', sunGlow: 'rgba(255,255,255,0.5)', sunX: 0.7, sunY: 0.3, sunR: 0.05, sunStripes: false,
    clouds: 'rgba(255,255,255,0.75)', bg: 'mountains',
    hills: ['#dfe8f4', '#cddaea'], skyline: '#93a9c6', skylineLit: null,
    fog: [238, 244, 251], grass: ['#f4f7fc', '#e5ecf6'], road: ['#4b5361', '#464e5b'],
    rumble: ['#e11d48', '#f8fafc'], lane: '#f8fafc', rock: '#7d8796', rockDark: '#5f6876',
    trunk: '#5b3a29', leaf: ['#1f5a46', '#2a6d55', '#f1f6fc'], bush: ['#dbe5f1', '#eef3fa'],
    bldg: ['#8b5a3c', '#a06a46'], win: '#ffd98a', winLit: '#ffd98a', roof: '#f8fafc',
    night: false, stars: false, lights: false, weather: 'snow',
    scenery: ['snowpine', 'snowpine', 'snowpine', 'cabin', 'snowman', 'rock', 'none', 'billboard'],
    far: ['snowpine', 'snowpine', 'peak', 'snowpine'],
    words: ['SKI', 'HOT TEA', 'SNOW', 'WINTER', 'COLD!', 'SCARF'],
  },
  rain: {
    uz: 'Yomg‘irli kun', en: 'Rainy day',
    skyTop: '#39424f', skyMid: '#5b6676', skyBottom: '#8d97a5',
    sun: '#cbd5e1', sunGlow: 'rgba(0,0,0,0)', sunX: 0.7, sunY: 0.3, sunR: 0, sunStripes: false,
    clouds: 'rgba(70,78,92,0.85)', bg: 'city',
    hills: ['#55665f', '#4a5a54'], skyline: '#6b7584', skylineLit: '#e8dcab',
    fog: [141, 151, 165], grass: ['#3f6a46', '#3a6141'], road: ['#383b43', '#34373f'],
    rumble: ['#dc2626', '#e5e7eb'], lane: '#e5e7eb', rock: '#666b73', rockDark: '#50545b',
    trunk: '#4b3221', leaf: ['#24553a', '#2e6a47', '#4a875d'], bush: ['#2b5a3a', '#376d48'],
    bldg: ['#8d99a8', '#a3adb9', '#7c8796', '#b2a99b'], win: '#c9d9e6', winLit: '#ffe39a', roof: '#5b5f66',
    night: false, stars: false, lights: true, weather: 'rain',
    scenery: ['tree', 'house', 'building', 'lamp', 'bush', 'billboard', 'tree'],
    far: ['tower', 'building', 'tree'],
    words: ['UMBRELLA', 'RAINY', 'HOT SOUP', 'TAXI', 'BOOKS', 'CAFE'],
  },
}
export const PALETTES = THEMES
/* Themes change every few hundred metres, in this order (the level picks the first one). */
export const THEME_ORDER = ['day', 'sunset', 'desert', 'snow', 'night', 'rain']

/* ── colour helpers ─────────────────────────────────────────────────── */
export function shade(hex, amt) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0
  const t = amt < 0 ? 0 : 255
  const p = Math.min(1, Math.abs(amt))
  const ch = (v) => Math.round(v + (t - v) * p)
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`
}

/* deterministic random so a theme always looks the same */
export function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── the five cars, rear view (what the road shows) ─────────────────── */
const TIRE = '#0b0f1a'
const tire = (x, y, w, h, r = 6) => `M${x} ${y}h${w}v${h - r}a${r} ${r} 0 0 1-${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1-${r}-${r}Z`
const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0-${2 * rx} 0Z`
const circleD = (cx, cy, r) => ellipse(cx, cy, r, r)

/*
 * parts: { d, fill, stroke?, width? } — fill may be 'grad:body' | 'grad:cabin' | 'grad:glass'
 * or a token: 'body' (the car colour), 'bodyDark', 'bodyLight'.
 * tail = brake-light glow centres, exhaust = pipe centres, trim = the bumper strip that turns chrome / gold with the engine upgrades.
 */
export const CAR_MODELS = {
  klassik: {
    w: 200, h: 150, units: 0.84,
    tail: [[40, 96], [160, 96]], exhaust: [[146, 130]], trim: [10, 112, 180, 4],
    parts: [
      { d: tire(18, 110, 34, 40), fill: TIRE },
      { d: tire(148, 110, 34, 40), fill: TIRE },
      { d: 'M10 82C10 71 17 66 30 65L170 65C183 66 190 71 190 82L192 118C192 126 186 131 176 131L24 131C14 131 8 126 8 118Z', fill: 'grad:body' },
      { d: 'M36 67C42 42 53 24 72 20L128 20C147 24 158 42 164 67Z', fill: 'grad:cabin' },
      { d: 'M49 63C54 44 63 30 78 27L122 27C137 30 146 44 151 63Z', fill: 'grad:glass' },
      { d: 'M62 59L84 30L95 30L73 59Z', fill: 'rgba(255,255,255,0.32)' },
      { d: 'M80 20.5L120 20.5L120 23L80 23Z', fill: 'rgba(255,255,255,0.35)' },
      { d: 'M14 72C24 68 40 67 60 67L140 67C160 67 176 68 186 72L186 75C176 71 160 70 140 70L60 70C40 70 24 71 14 75Z', fill: 'rgba(255,255,255,0.28)' },
      { d: 'M22 84L178 84L178 86L22 86Z', fill: 'rgba(0,0,0,0.18)' },
      { d: 'M12 88L68 87L68 106L14 107C11 101 11 94 12 88Z', fill: '#b91c1c' },
      { d: 'M16 90L64 89.5L64 96L16 96.5Z', fill: '#ef4444' },
      { d: 'M14 99L68 98.5L68 106L14 107Z', fill: '#f59e0b' },
      { d: 'M188 88L132 87L132 106L186 107C189 101 189 94 188 88Z', fill: '#b91c1c' },
      { d: 'M184 90L136 89.5L136 96L184 96.5Z', fill: '#ef4444' },
      { d: 'M186 99L132 98.5L132 106L186 107Z', fill: '#f59e0b' },
      { d: 'M74 88h52v19h-52Z', fill: 'rgba(0,0,0,0.22)' },
      { d: 'M78 90h44v14h-44Z', fill: '#f8fafc', stroke: '#0f172a', width: 1.5 },
      { d: 'M8 110L192 110L191 121C190 127 185 131 176 131L24 131C15 131 10 127 9 121Z', fill: 'bodyDark' },
      { d: 'M10 112h180v4h-180Z', fill: '#1f2937' },
      { d: 'M14 119h12v4h-12Z', fill: '#dc2626' },
      { d: 'M174 119h12v4h-12Z', fill: '#dc2626' },
      { d: ellipse(146, 130, 6, 3.5), fill: '#475569' },
    ],
    plate: { x: 100, y: 97, text: '01 A 777', size: 8.5 },
  },
  sedan: {
    w: 200, h: 150, units: 0.88,
    tail: [[34, 77], [166, 77]], exhaust: [[150, 130]], trim: [30, 122, 140, 5],
    parts: [
      { d: tire(18, 112, 34, 38), fill: TIRE },
      { d: tire(148, 112, 34, 38), fill: TIRE },
      { d: 'M10 84C10 68 22 60 40 58L160 58C178 60 190 68 190 84L193 117C193 126 186 131 172 131L28 131C14 131 7 126 7 117Z', fill: 'grad:body' },
      { d: 'M40 60C47 34 63 16 88 13L112 13C137 16 153 34 160 60Z', fill: 'grad:cabin' },
      { d: 'M52 56C58 36 70 22 90 20L110 20C130 22 142 36 148 56Z', fill: 'grad:glass' },
      { d: 'M64 52L86 23L96 23L74 52Z', fill: 'rgba(255,255,255,0.32)' },
      { d: 'M44 60L156 60L154 64L46 64Z', fill: 'rgba(0,0,0,0.2)' },
      { d: 'M9 74C16 67 30 65 50 65L66 67L64 84L14 88C9 84 8 79 9 74Z', fill: '#dc2626' },
      { d: 'M16 74C22 71 32 70 48 70L60 71L59 79L18 82C15 80 15 77 16 74Z', fill: '#fb7185' },
      { d: 'M191 74C184 67 170 65 150 65L134 67L136 84L186 88C191 84 192 79 191 74Z', fill: '#dc2626' },
      { d: 'M184 74C178 71 168 70 152 70L140 71L141 79L182 82C185 80 185 77 184 74Z', fill: '#fb7185' },
      { d: 'M66 70L134 70L134 76L66 76Z', fill: '#d1d5db' },
      { d: 'M66 70L134 70L134 71.5L66 71.5Z', fill: '#ffffff' },
      { d: 'M80 89h40v14h-40Z', fill: '#f8fafc', stroke: '#0f172a', width: 1.5 },
      { d: 'M8 106L192 106L190 119C189 127 183 131 172 131L28 131C17 131 11 127 10 119Z', fill: 'bodyDark' },
      { d: 'M30 122h140v5h-140Z', fill: 'rgba(0,0,0,0.35)' },
      { d: 'M14 110h14v4h-14Z', fill: '#ef4444' },
      { d: 'M172 110h14v4h-14Z', fill: '#ef4444' },
      { d: ellipse(150, 130, 6, 3.5), fill: '#475569' },
    ],
    plate: { x: 100, y: 96, text: '01 S 101', size: 8 },
  },
  van: {
    w: 200, h: 190, units: 0.8,
    tail: [[34, 124], [166, 124]], exhaust: [[58, 175]], trim: [30, 150, 140, 3],
    parts: [
      { d: tire(32, 150, 28, 40), fill: TIRE },
      { d: tire(140, 150, 28, 40), fill: TIRE },
      { d: 'M28 28C28 15 36 9 52 9L148 9C164 9 172 15 172 28L176 160C176 170 170 176 160 176L40 176C30 176 24 170 24 160Z', fill: 'grad:body' },
      { d: 'M36 9h128v4h-128Z', fill: 'rgba(255,255,255,0.5)' },
      { d: 'M40 24C40 20 43 18 47 18L153 18C157 18 160 20 160 24L162 84C162 88 159 90 155 90L45 90C41 90 38 88 38 84Z', fill: 'grad:glass' },
      { d: 'M56 86L92 22L104 22L68 86Z', fill: 'rgba(255,255,255,0.3)' },
      { d: 'M33 16L167 16L170 146L30 146Z', stroke: 'rgba(0,0,0,0.22)', width: 1.6 },
      { d: 'M26 98L42 98L42 140L28 140C27 126 26 112 26 98Z', fill: '#dc2626' },
      { d: 'M26 98L42 98L42 110L26 110Z', fill: '#f59e0b' },
      { d: 'M174 98L158 98L158 140L172 140C173 126 174 112 174 98Z', fill: '#dc2626' },
      { d: 'M174 98L158 98L158 110L174 110Z', fill: '#f59e0b' },
      { d: 'M86 100h28v6h-28Z', fill: '#334155' },
      { d: 'M78 116h44v15h-44Z', fill: '#f8fafc', stroke: '#0f172a', width: 1.5 },
      { d: 'M22 148L178 148L177 166C176 172 171 176 160 176L40 176C29 176 24 172 23 166Z', fill: '#4b5563' },
      { d: 'M30 150h140v3h-140Z', fill: 'rgba(255,255,255,0.2)' },
      { d: ellipse(58, 175, 6, 3.5), fill: '#475569' },
    ],
    plate: { x: 100, y: 123.5, text: '01 D 550', size: 8.5 },
  },
  jip: {
    w: 200, h: 185, units: 0.96,
    tail: [[16, 124], [184, 124]], exhaust: [[158, 171]], trim: [8, 152, 184, 3],
    parts: [
      { d: tire(10, 140, 40, 45), fill: TIRE },
      { d: tire(150, 140, 40, 45), fill: TIRE },
      { d: 'M14 6h172v8h-172Z', fill: '#0b0d10' },
      { d: 'M30 2h6v6h-6Z', fill: '#0b0d10' },
      { d: 'M164 2h6v6h-6Z', fill: '#0b0d10' },
      { d: 'M8 22C8 15 13 12 22 12L178 12C187 12 192 15 192 22L195 156C195 164 189 168 179 168L21 168C11 168 5 164 5 156Z', fill: 'grad:body' },
      { d: 'M22 22L178 22L176 74L24 74Z', fill: 'grad:glass' },
      { d: 'M22 22h156v3h-156Z', fill: 'rgba(0,0,0,0.3)' },
      { d: 'M40 72L66 24L78 24L52 72Z', fill: 'rgba(255,255,255,0.28)' },
      { d: 'M150 80h2.5v70h-2.5Z', fill: 'rgba(0,0,0,0.35)' },
      { d: 'M30 90h8v11h-8Z', fill: '#0b0d10' },
      { d: 'M30 128h8v11h-8Z', fill: '#0b0d10' },
      { d: circleD(100, 110, 36), fill: '#0b0d10' },
      { d: circleD(100, 110, 30), fill: 'grad:body' },
      { d: circleD(100, 110, 24), stroke: '#9ca3af', width: 2.2 },
      { d: circleD(100, 110, 7), fill: '#9ca3af' },
      { d: 'M7 108L26 108L26 146L8 146Z', fill: '#dc2626' },
      { d: 'M7 108L26 108L26 118L7 118Z', fill: '#f59e0b' },
      { d: 'M8 140L26 140L26 146L8 146Z', fill: '#f1f5f9' },
      { d: 'M193 108L174 108L174 146L192 146Z', fill: '#dc2626' },
      { d: 'M193 108L174 108L174 118L193 118Z', fill: '#f59e0b' },
      { d: 'M192 140L174 140L174 146L192 146Z', fill: '#f1f5f9' },
      { d: 'M4 150L196 150L196 162C196 168 190 172 180 172L20 172C10 172 4 168 4 162Z', fill: '#1f2328' },
      { d: 'M78 152h44v14h-44Z', fill: '#f8fafc', stroke: '#0f172a', width: 1.5 },
      { d: ellipse(158, 171, 6, 3.5), fill: '#475569' },
    ],
    plate: { x: 100, y: 159, text: '01 G 001', size: 8.5 },
  },
  sport: {
    w: 200, h: 122, units: 0.92,
    tail: [[30, 63], [170, 63]], exhaust: [[54, 104], [68, 104], [132, 104], [146, 104]], trim: [38, 94, 124, 3],
    parts: [
      { d: tire(14, 92, 38, 30, 5), fill: TIRE },
      { d: tire(148, 92, 38, 30, 5), fill: TIRE },
      { d: 'M40 36h8v13h-8Z', fill: '#111827' },
      { d: 'M152 36h8v13h-8Z', fill: '#111827' },
      { d: 'M3 72C3 57 15 49 36 47L164 47C185 49 197 57 197 72L199 99C199 108 193 112 181 112L19 112C7 112 1 108 1 99Z', fill: 'grad:body' },
      { d: 'M46 49C54 29 70 19 90 18L110 18C130 19 146 29 154 49Z', fill: 'grad:cabin' },
      { d: 'M58 47C64 33 76 25 92 24L108 24C124 25 136 33 142 47Z', fill: 'grad:glass' },
      { d: 'M68 45L86 27L95 27L77 45Z', fill: 'rgba(255,255,255,0.32)' },
      { d: 'M4 28L196 28L193 37L7 37Z', fill: '#111827' },
      { d: 'M6 28L194 28L194 30L6 30Z', fill: 'rgba(255,255,255,0.25)' },
      { d: 'M8 52C40 49 160 49 192 52L192 55C160 52 40 52 8 55Z', fill: 'rgba(255,255,255,0.3)' },
      { d: 'M12 60L188 60L186 67L14 67Z', fill: '#991b1b' },
      { d: 'M16 62L184 62L183 65L17 65Z', fill: '#f87171' },
      { d: 'M80 73h40v13h-40Z', fill: '#f8fafc', stroke: '#0f172a', width: 1.4 },
      { d: 'M8 80L30 80L28 92L10 92Z', fill: '#111827' },
      { d: 'M192 80L170 80L172 92L190 92Z', fill: '#111827' },
      { d: 'M38 97L162 97L158 113L42 113Z', fill: '#111827' },
      { d: 'M84 99h3v13h-3ZM98.5 99h3v13h-3ZM113 99h3v13h-3Z', fill: '#374151' },
      { d: circleD(54, 104, 5.5) + circleD(68, 104, 5.5) + circleD(132, 104, 5.5) + circleD(146, 104, 5.5), fill: '#9ca3af' },
      { d: circleD(54, 104, 3.5) + circleD(68, 104, 3.5) + circleD(132, 104, 3.5) + circleD(146, 104, 3.5), fill: '#0b0f1a' },
    ],
    plate: { x: 100, y: 83.5, text: '01 X 999', size: 7.5 },
  },
}

export const RIM_COLORS = ['#64748b', '#e5e7eb', '#fbbf24']

/* The car colour → the three gradients its parts use. */
export function carGrads(model, color) {
  const m = CAR_MODELS[model] || CAR_MODELS.klassik
  const dark = shade(color, -0.45)
  const light = shade(color, 0.35)
  const top = m.parts.find(p => p.fill === 'grad:cabin')
  return {
    body: { x1: 0, y1: m.h * 0.3, x2: 0, y2: m.h * 0.92, stops: [[0, light], [0.45, color], [1, dark]] },
    cabin: { x1: 0, y1: top ? 10 : 0, x2: 0, y2: m.h * 0.45, stops: [[0, shade(color, 0.15)], [1, shade(color, -0.3)]] },
    glass: { x1: 0, y1: 10, x2: 0, y2: m.h * 0.5, stops: [[0, '#e0f2fe'], [0.5, '#38bdf8'], [1, '#0c4a6e']] },
  }
}

/* A part's fill as a CSS colour (tokens resolved), or null for a gradient. */
export function partFill(fill, color) {
  if (!fill) return 'none'
  if (fill === 'body') return color
  if (fill === 'bodyDark') return shade(color, -0.3)
  if (fill === 'bodyLight') return shade(color, 0.3)
  return fill
}

/* ── tiny canvas helpers ── */
function makeCanvas(w, h, scale) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const g = c.getContext('2d')
  g.scale(scale, scale)
  return { c, g }
}
function sprite(w, h, draw, { scale = 2, ax = 0.5 } = {}) {
  const { c, g } = makeCanvas(w, h, scale)
  draw(g)
  return { img: c, w, h, ax }
}
function fillPath(g, d, fill) { g.fillStyle = fill; g.fill(new Path2D(d)) }
function circle(g, x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h) }
function rrect(g, x, y, w, h, r, fill) {
  g.fillStyle = fill
  g.beginPath()
  if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h)
  g.fill()
}
function text(g, str, x, y, size, color, weight = 900) {
  g.fillStyle = color
  g.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(str, x, y)
}
/* write `str` as big as fits into maxW */
function fitText(g, str, x, y, maxSize, maxW, color) {
  let size = maxSize
  g.font = `900 ${size}px system-ui, sans-serif`
  const w = g.measureText(str).width
  if (w > maxW) size = Math.max(8, Math.floor(size * (maxW / w)))
  text(g, str, x, y, size, color)
}

/* The player's car sprite (rear view), coloured and with its upgrade accents. */
const carCache = new Map()
export function carSprite(model, color, engine = 1) {
  const key = `${model}:${color}:${engine}`
  let s = carCache.get(key)
  if (!s) {
    const m = CAR_MODELS[model] || CAR_MODELS.klassik
    const grads = carGrads(model, color)
    s = sprite(m.w, m.h, (g) => {
      const made = {}
      for (const [id, gr] of Object.entries(grads)) {
        const lg = g.createLinearGradient(gr.x1, gr.y1, gr.x2, gr.y2)
        gr.stops.forEach(([o, c]) => lg.addColorStop(o, c))
        made[id] = lg
      }
      for (const p of m.parts) {
        const path = new Path2D(p.d)
        if (p.fill) { g.fillStyle = p.fill.startsWith('grad:') ? made[p.fill.slice(5)] : partFill(p.fill, color); g.fill(path) }
        if (p.stroke) { g.strokeStyle = p.stroke; g.lineWidth = p.width || 1; g.stroke(path) }
      }
      if (engine >= 2 && m.trim) { const [x, y, w, h] = m.trim; rect(g, x, y, w, h, RIM_COLORS[Math.min(2, engine - 1)]); rect(g, x, y, w, Math.max(1, h * 0.35), 'rgba(255,255,255,0.55)') }
      if (m.plate) text(g, m.plate.text, m.plate.x, m.plate.y, m.plate.size, '#0f172a', 800)
    }, { scale: 2.4 })
    s.model = m
    carCache.set(key, s)
  }
  return s
}

/* ── road furniture (the same in every theme) ── */
function truckSprite(color, accent) {
  return sprite(180, 210, (g) => {
    rect(g, 14, 176, 34, 32, '#0b0f1a')
    rect(g, 132, 176, 34, 32, '#0b0f1a')
    fillPath(g, 'M4 10a6 6 0 0 1 6-6h160a6 6 0 0 1 6 6v166h-172Z', color)
    rect(g, 4, 8, 172, 10, 'rgba(255,255,255,0.35)')
    rect(g, 4, 18, 8, 158, 'rgba(0,0,0,0.10)')
    rect(g, 168, 18, 8, 158, 'rgba(0,0,0,0.16)')
    rect(g, 88.5, 18, 3, 140, 'rgba(0,0,0,0.3)')
    rect(g, 18, 26, 64, 118, 'rgba(255,255,255,0.08)')
    rect(g, 98, 26, 64, 118, 'rgba(0,0,0,0.05)')
    rect(g, 76, 76, 6, 36, '#475569')
    rect(g, 98, 76, 6, 36, '#475569')
    ;[30, 70, 120].forEach(y => { rect(g, 6, y, 6, 12, '#64748b'); rect(g, 168, y, 6, 12, '#64748b') })
    for (let x = 8; x < 172; x += 16) { rect(g, x, 148, 8, 7, '#ef4444'); rect(g, x + 8, 148, 8, 7, '#f8fafc') }
    rect(g, 20, 40, 140, 14, accent)
    rect(g, 8, 166, 164, 14, '#111827')
    rect(g, 12, 160, 24, 11, '#ef4444')
    rect(g, 144, 160, 24, 11, '#ef4444')
    rect(g, 74, 168, 32, 10, '#fde047')
    rect(g, 6, 6, 10, 5, '#f59e0b')
    rect(g, 164, 6, 10, 5, '#f59e0b')
  }, { scale: 1.6 })
}

function coneSprite() {
  return sprite(60, 80, (g) => {
    fillPath(g, 'M4 72h52v6a2 2 0 0 1-2 2h-48a2 2 0 0 1-2-2Z', '#1f2937')
    fillPath(g, 'M23 6L37 6L52 72L8 72Z', '#f97316')
    fillPath(g, 'M18 26L42 26L45 38L15 38Z', '#fff7ed')
    fillPath(g, 'M13 48L47 48L49.5 58L10.5 58Z', '#fff7ed')
    fillPath(g, 'M24 3L36 3L37.5 9L22.5 9Z', '#fdba74')
    fillPath(g, 'M30 6L37 6L52 72L41 72Z', 'rgba(0,0,0,0.12)')
  }, { scale: 2 })
}

function stripes(g, x, y, w, h, a, b, step = 16) {
  g.save()
  g.beginPath(); g.rect(x, y, w, h); g.clip()
  rect(g, x, y, w, h, a)
  g.fillStyle = b
  for (let i = -h; i < w + h; i += step * 2) {
    g.beginPath()
    g.moveTo(x + i, y + h); g.lineTo(x + i + step, y + h); g.lineTo(x + i + step + h, y); g.lineTo(x + i + h, y)
    g.closePath(); g.fill()
  }
  g.restore()
}

function worksSprite() {
  return sprite(160, 120, (g) => {
    rect(g, 16, 36, 8, 84, '#64748b')
    rect(g, 136, 36, 8, 84, '#64748b')
    rect(g, 6, 112, 28, 8, '#334155')
    rect(g, 126, 112, 28, 8, '#334155')
    stripes(g, 6, 32, 148, 30, '#f8fafc', '#e11d48', 14)
    stripes(g, 6, 70, 148, 22, '#f8fafc', '#e11d48', 14)
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2
    g.strokeRect(6, 32, 148, 30); g.strokeRect(6, 70, 148, 22)
    circle(g, 20, 20, 10, '#f59e0b'); circle(g, 20, 20, 6, '#fde68a')
    circle(g, 140, 20, 10, '#f59e0b'); circle(g, 140, 20, 6, '#fde68a')
  }, { scale: 1.6 })
}

function beamSprite() {
  return sprite(320, 56, (g) => {
    ;[8, 156, 304].forEach(x => { rect(g, x, 18, 10, 38, '#475569'); rect(g, x - 6, 50, 22, 6, '#1f2937') })
    stripes(g, 0, 6, 320, 22, '#fef2f2', '#dc2626', 18)
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(1, 6, 318, 22)
    ;[40, 120, 200, 280].forEach(x => circle(g, x, 17, 4, '#fde047'))
  }, { scale: 1.4 })
}

function arrow(g, dir) {
  g.save(); g.translate(30, 30)
  g.rotate(dir === 'left' ? Math.PI : dir === 'up' ? -Math.PI / 2 : 0)
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(-12, 0); g.lineTo(11, 0); g.moveTo(2, -9); g.lineTo(12, 0); g.lineTo(2, 9); g.stroke()
  g.restore()
}
const warn = (g) => { fillPath(g, 'M30 4L57 52L3 52Z', '#dc2626'); fillPath(g, 'M30 13L49.5 47L10.5 47Z', '#fff') }
const blue = (g) => { rrect(g, 4, 4, 52, 52, 6, '#f8fafc'); rrect(g, 7, 7, 46, 46, 4, '#2563eb') }
function stick(g, x, y, s, color = '#111827') {
  circle(g, x, y - 13 * s, 3.4 * s, color)
  g.strokeStyle = color; g.lineWidth = 3 * s; g.lineCap = 'round'
  g.beginPath(); g.moveTo(x, y - 9 * s); g.lineTo(x - 1 * s, y + 1 * s); g.lineTo(x - 5 * s, y + 8 * s)
  g.moveTo(x - 1 * s, y + 1 * s); g.lineTo(x + 4 * s, y + 8 * s)
  g.moveTo(x, y - 6 * s); g.lineTo(x - 5 * s, y - 2 * s); g.moveTo(x, y - 6 * s); g.lineTo(x + 5 * s, y - 3 * s); g.stroke()
}

const SIGN_FACE = {
  left: (g) => { circle(g, 30, 30, 27, '#f8fafc'); circle(g, 30, 30, 24, '#2563eb'); arrow(g, 'left') },
  right: (g) => { circle(g, 30, 30, 27, '#f8fafc'); circle(g, 30, 30, 24, '#2563eb'); arrow(g, 'right') },
  straight: (g) => { circle(g, 30, 30, 27, '#f8fafc'); circle(g, 30, 30, 24, '#2563eb'); arrow(g, 'up') },
  round: (g) => {
    circle(g, 30, 30, 27, '#f8fafc'); circle(g, 30, 30, 24, '#2563eb')
    g.strokeStyle = '#fff'; g.lineWidth = 4.5
    for (let k = 0; k < 3; k++) {
      const a0 = k * (Math.PI * 2 / 3) - 0.2
      g.beginPath(); g.arc(30, 30, 12, a0, a0 + 1.5); g.stroke()
      const a1 = a0 + 1.5
      const hx = 30 + Math.cos(a1) * 12
      const hy = 30 + Math.sin(a1) * 12
      g.save(); g.translate(hx, hy); g.rotate(a1 + Math.PI / 2)
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(5, 0); g.lineTo(-3, -5); g.lineTo(-3, 5); g.closePath(); g.fill()
      g.restore()
    }
  },
  bump: (g) => { warn(g); fillPath(g, 'M15 43Q30 24 45 43Z', '#111827') },
  lights: (g) => {
    warn(g)
    rect(g, 25.5, 22, 9, 22, '#111827')
    circle(g, 30, 26, 2.6, '#ef4444'); circle(g, 30, 33, 2.6, '#f59e0b'); circle(g, 30, 40, 2.6, '#22c55e')
  },
  ped: (g) => { fillPath(g, 'M5 5h50v50h-50Z', '#2563eb'); fillPath(g, 'M30 10L51 48L9 48Z', '#fff'); stick(g, 30, 34, 0.9) },
  rail: (g) => {
    g.save(); g.translate(30, 30)
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      g.save(); g.rotate(a)
      rect(g, -28, -6, 56, 12, '#dc2626'); rect(g, -26, -4, 52, 8, '#f8fafc')
      g.restore()
    }
    g.restore()
  },
  works: (g) => { warn(g); rect(g, 28, 22, 4, 14, '#111827'); circle(g, 30, 41, 2.5, '#111827') },
  school: (g) => { warn(g); stick(g, 25, 37, 0.62); stick(g, 35, 38, 0.52); rect(g, 22, 34, 6, 5, '#111827') },
  animals: (g) => {
    warn(g)
    fillPath(g, 'M17 33h20a4 4 0 0 1 4 4v3h-24Z', '#111827')
    fillPath(g, 'M37 30h6l2 5h-8Z', '#111827')
    rect(g, 19, 40, 2.6, 6, '#111827'); rect(g, 34, 40, 2.6, 6, '#111827')
  },
  tunnel: (g) => {
    blue(g)
    fillPath(g, 'M14 28a8 8 0 0 1 8-8h4v16h-4a8 8 0 0 1-8-8Z', '#fff')
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'
    g.beginPath()
    for (const y of [22, 28, 34]) { g.moveTo(31, y); g.lineTo(45, y + (y - 28) * 0.4) }
    g.stroke()
  },
  fuel: (g) => {
    blue(g)
    rrect(g, 17, 17, 18, 28, 3, '#fff'); rect(g, 20, 21, 12, 8, '#2563eb')
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'
    g.beginPath(); g.moveTo(35, 24); g.lineTo(41, 28); g.lineTo(41, 40); g.lineTo(44, 40); g.stroke()
  },
  pickup: (g) => {
    blue(g)
    circle(g, 30, 19, 4.5, '#fff')
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'
    g.beginPath(); g.moveTo(30, 25); g.lineTo(30, 38); g.lineTo(25, 47); g.moveTo(30, 38); g.lineTo(35, 47)
    g.moveTo(30, 28); g.lineTo(39, 18); g.moveTo(30, 28); g.lineTo(23, 34); g.stroke()
  },
  turbo: (g) => {
    rrect(g, 4, 4, 52, 52, 8, '#111827'); rrect(g, 7, 7, 46, 46, 6, '#f97316')
    fillPath(g, 'M33 10L18 33h10l-4 17 17-25h-11l5-15Z', '#fff7ed')
  },
}

function signSprite(face) {
  return sprite(60, 150, (g) => {
    rect(g, 27, 40, 6, 110, '#94a3b8')
    rect(g, 27, 40, 2, 110, '#cbd5e1')
    SIGN_FACE[face](g)
  }, { scale: 2 })
}

function pedSprite(shirt, skin, hair, legs, { kid = false, wave = 0 } = {}) {
  return sprite(40, 100, (g) => {
    if (kid) { g.translate(4, 28); g.scale(0.8, 0.72) }
    rect(g, 13, 62, 6, 36, legs); rect(g, 21, 62, 6, 36, legs)
    rect(g, 11, 94, 9, 6, '#111827'); rect(g, 20, 94, 9, 6, '#111827')
    if (kid) rrect(g, 9, 30, 22, 26, 5, '#f59e0b')
    fillPath(g, 'M9 34a8 8 0 0 1 8-8h6a8 8 0 0 1 8 8v32h-22Z', shirt)
    rect(g, 4, 32, 6, 26, shirt)
    if (wave) {
      g.save(); g.translate(33, 32); g.rotate(wave > 0 ? -2.6 : -2.1)
      rect(g, -3, 0, 6, 26, shirt); circle(g, 0, 28, 3.4, skin)
      g.restore()
    } else {
      rect(g, 30, 32, 6, 26, shirt); circle(g, 33, 60, 3.2, skin)
    }
    circle(g, 7, 60, 3.2, skin)
    circle(g, 20, 15, 10, skin)
    fillPath(g, 'M10 14a10 10 0 0 1 20 0q-4-5-10-5t-10 5Z', hair)
    circle(g, 16.5, 16, 1.4, '#111827'); circle(g, 23.5, 16, 1.4, '#111827')
  }, { scale: 2 })
}

function coinSprite() {
  return sprite(64, 64, (g) => {
    circle(g, 32, 32, 30, '#b45309')
    circle(g, 32, 32, 27, '#fbbf24')
    circle(g, 32, 32, 20, '#f59e0b')
    circle(g, 32, 32, 17, '#fcd34d')
    fillPath(g, 'M32 19l4 8.5 9.3 1.1-6.9 6.3 1.9 9.1-8.3-4.6-8.3 4.6 1.9-9.1-6.9-6.3 9.3-1.1Z', '#d97706')
    fillPath(g, 'M14 22a20 20 0 0 1 14-10l-2 4a16 16 0 0 0-9 8Z', 'rgba(255,255,255,0.7)')
  }, { scale: 1.5 })
}

function glowSprite(r, g2, b) {
  return sprite(64, 64, (g) => {
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    rg.addColorStop(0, `rgba(${r},${g2},${b},0.95)`)
    rg.addColorStop(0.35, `rgba(${r},${g2},${b},0.45)`)
    rg.addColorStop(1, `rgba(${r},${g2},${b},0)`)
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64)
  }, { scale: 1 })
}

/* A sheep, side view (faces left; the renderer mirrors it). */
function sheepSprite() {
  return sprite(84, 66, (g) => {
    for (const x of [24, 34, 54, 62]) rect(g, x, 42, 5, 22, '#1f2937')
    const wool = [[34, 26, 14], [48, 22, 15], [62, 27, 13], [42, 36, 13], [58, 37, 12], [70, 33, 9], [30, 36, 10]]
    for (const [x, y, r] of wool) circle(g, x, y + 2, r, '#cbd5e1')
    for (const [x, y, r] of wool) circle(g, x, y, r, '#f8fafc')
    circle(g, 44, 18, 6, 'rgba(255,255,255,0.9)')
    fillPath(g, 'M8 26c0-8 6-13 12-13s10 5 10 12-4 14-11 14S8 34 8 26Z', '#1f2937')
    fillPath(g, 'M18 14c-4-4-10-3-12 0 3 1 6 2 9 4Z', '#1f2937')
    circle(g, 14, 24, 2.2, '#f8fafc'); circle(g, 14.5, 24.2, 1.1, '#111827')
    circle(g, 11, 33, 1.4, '#f472b6')
  }, { scale: 1.6 })
}

/* A cow, side view (faces left). */
function cowSprite() {
  return sprite(124, 96, (g) => {
    for (const x of [34, 46, 88, 100]) { rect(g, x, 60, 8, 32, '#f8fafc'); rect(g, x, 86, 8, 8, '#1f2937') }
    rrect(g, 28, 26, 84, 40, 16, '#f8fafc')
    fillPath(g, 'M46 28c10-4 18 2 16 12s-14 10-20 4-4-14 4-16Z', '#111827')
    fillPath(g, 'M80 40c8-6 18-2 18 6s-10 12-16 8-8-8-2-14Z', '#111827')
    fillPath(g, 'M98 28c6 0 10 2 12 6-4 2-8 2-12 0Z', '#111827')
    fillPath(g, 'M58 64c4 6 14 6 18 0Z', '#f9a8d4')
    g.strokeStyle = '#f8fafc'; g.lineWidth = 3; g.lineCap = 'round'
    g.beginPath(); g.moveTo(112, 34); g.quadraticCurveTo(122, 46, 116, 62); g.stroke()
    circle(g, 116, 64, 3.5, '#111827')
    rrect(g, 6, 22, 30, 34, 12, '#f8fafc')
    fillPath(g, 'M8 30c4-6 12-8 18-4-2 6-10 10-18 4Z', '#111827')
    rrect(g, 2, 40, 22, 16, 8, '#f9a8d4')
    circle(g, 9, 48, 1.8, '#9d174d'); circle(g, 17, 48, 1.8, '#9d174d')
    circle(g, 18, 32, 2.6, '#111827'); circle(g, 18.8, 31.4, 0.9, '#fff')
    fillPath(g, 'M14 22c-2-8 2-14 6-16-1 6 0 10 2 14Z', '#e5e7eb')
    fillPath(g, 'M28 22c2-8-1-14-5-16 0 6-1 10-3 14Z', '#e5e7eb')
    fillPath(g, 'M32 26c6-2 10 0 12 4-5 1-9 0-12-4Z', '#f9a8d4')
  }, { scale: 1.5 })
}

/* The gas station: canopy, two pumps, a tall price sign with "GAS". */
function stationSprite() {
  return sprite(300, 180, (g) => {
    rect(g, 150, 70, 140, 100, '#e5e7eb')
    rect(g, 150, 70, 140, 10, '#ef4444')
    rect(g, 168, 96, 44, 40, '#7dd3fc'); rect(g, 228, 96, 44, 74, '#0ea5e9')
    rect(g, 228, 96, 22, 74, 'rgba(255,255,255,0.25)')
    rect(g, 150, 160, 140, 10, '#94a3b8')
    text(g, 'SHOP', 220, 86, 11, '#fff')
    rect(g, 36, 44, 10, 126, '#cbd5e1'); rect(g, 196, 44, 10, 126, '#cbd5e1')
    rect(g, 14, 22, 214, 26, '#f8fafc')
    rect(g, 14, 36, 214, 12, '#ef4444')
    rect(g, 14, 22, 214, 4, '#fde047')
    text(g, 'PETROL', 120, 30, 10, '#ef4444')
    for (const x of [74, 136]) {
      rrect(g, x, 104, 30, 62, 5, '#dc2626')
      rect(g, x + 5, 112, 20, 14, '#111827')
      rect(g, x + 7, 114, 16, 5, '#22c55e')
      rect(g, x + 4, 162, 22, 8, '#374151')
      g.strokeStyle = '#111827'; g.lineWidth = 3
      g.beginPath(); g.moveTo(x + 30, 130); g.quadraticCurveTo(x + 40, 140, x + 36, 156); g.stroke()
    }
    rect(g, 2, 50, 8, 120, '#64748b')
    rrect(g, -2, 4, 40, 50, 5, '#1d4ed8')
    rrect(g, 1, 7, 34, 18, 3, '#fde047')
    text(g, 'GAS', 18, 16.5, 13, '#1d4ed8')
    text(g, '1.25', 18, 37, 12, '#fff')
  }, { scale: 1.3, ax: 0.5 })
}

/* A bus stop shelter with a bench. */
function busstopSprite() {
  return sprite(140, 120, (g) => {
    rect(g, 10, 20, 6, 98, '#64748b'); rect(g, 112, 20, 6, 98, '#64748b')
    rect(g, 4, 14, 120, 10, '#1e3a8a')
    rect(g, 16, 30, 96, 56, 'rgba(186,230,253,0.55)')
    rect(g, 16, 30, 96, 3, 'rgba(255,255,255,0.7)')
    rect(g, 26, 88, 76, 6, '#92400e'); rect(g, 30, 94, 4, 20, '#334155'); rect(g, 94, 94, 4, 20, '#334155')
    rect(g, 128, 10, 5, 108, '#94a3b8')
    circle(g, 130.5, 14, 11, '#f8fafc'); circle(g, 130.5, 14, 9, '#16a34a')
    text(g, 'BUS', 130.5, 14.5, 7.5, '#fff')
  }, { scale: 1.5, ax: 0.45 })
}

/* Corner buildings with an English word on them: bank, school, park. */
function landmarkSprite(kind) {
  return sprite(180, 170, (g) => {
    if (kind === 'bank') {
      rect(g, 8, 150, 164, 20, '#d6d3d1'); rect(g, 16, 142, 148, 10, '#e7e5e4')
      fillPath(g, 'M8 52L90 12L172 52Z', '#e7e5e4')
      fillPath(g, 'M26 48L90 20L154 48Z', '#d6d3d1')
      rect(g, 14, 52, 152, 22, '#f5f5f4')
      fitText(g, 'BANK', 90, 64, 18, 120, '#1e3a8a')
      for (let i = 0; i < 5; i++) { rect(g, 24 + i * 31, 76, 14, 66, '#fafaf9'); rect(g, 24 + i * 31, 76, 4, 66, 'rgba(0,0,0,0.08)') }
      rect(g, 78, 104, 24, 38, '#78350f')
      circle(g, 90, 36, 6, '#fbbf24')
    } else if (kind === 'school') {
      rect(g, 6, 50, 168, 120, '#c2410c')
      for (let y = 58; y < 168; y += 8) rect(g, 6, y, 168, 1.2, 'rgba(0,0,0,0.12)')
      fillPath(g, 'M0 54L90 18L180 54Z', '#7c2d12')
      circle(g, 90, 40, 11, '#f8fafc'); circle(g, 90, 40, 9, '#fef3c7')
      g.strokeStyle = '#111827'; g.lineWidth = 2; g.beginPath(); g.moveTo(90, 40); g.lineTo(90, 33); g.moveTo(90, 40); g.lineTo(95, 42); g.stroke()
      rrect(g, 30, 60, 120, 22, 4, '#fef3c7')
      fitText(g, 'SCHOOL', 90, 71.5, 17, 110, '#b91c1c')
      for (const x of [18, 50, 112, 144]) for (const y of [92, 126]) { rect(g, x, y, 20, 22, '#e0f2fe'); rect(g, x + 9, y, 2, 22, '#c2410c') }
      rect(g, 76, 120, 28, 50, '#1e3a8a')
      rect(g, 170, 4, 3, 50, '#94a3b8'); rect(g, 150, 4, 20, 13, '#16a34a')
    } else {
      for (const [x, y, r] of [[30, 70, 30], [150, 70, 30], [90, 52, 34], [56, 46, 24], [124, 46, 24]]) circle(g, x, y, r, '#2f7d3a')
      for (const [x, y, r] of [[40, 60, 12], [100, 40, 14], [140, 58, 10]]) circle(g, x, y, r, '#69bf6c')
      rect(g, 14, 64, 12, 106, '#57534e'); rect(g, 154, 64, 12, 106, '#57534e')
      rrect(g, 10, 66, 160, 30, 8, '#166534')
      fitText(g, 'PARK', 90, 81, 20, 120, '#fef9c3')
      for (let x = 30; x < 152; x += 12) rect(g, x, 128, 4, 42, '#a16207')
      rect(g, 26, 134, 130, 5, '#a16207'); rect(g, 26, 152, 130, 5, '#a16207')
      circle(g, 60, 116, 6, '#f472b6'); circle(g, 120, 118, 6, '#facc15')
    }
  }, { scale: 1.3 })
}

/* Everything that looks the same in every theme. Built once (~20 ms). */
let common = null
export function commonSprites() {
  if (common) return common
  common = {
    trucks: [truckSprite('#e2e8f0', '#0ea5e9'), truckSprite('#f97316', '#fde68a'), truckSprite('#14b8a6', '#f8fafc')],
    cone: coneSprite(),
    works: worksSprite(),
    beam: beamSprite(),
    coin: coinSprite(),
    signs: Object.fromEntries(Object.keys(SIGN_FACE).map(k => [k, signSprite(k)])),
    peds: [
      pedSprite('#f43f5e', '#f1c27d', '#3b2416', '#1e3a8a'),
      pedSprite('#22c55e', '#c68642', '#111827', '#334155'),
      pedSprite('#a855f7', '#e0ac69', '#7c2d12', '#1f2937'),
    ],
    kids: [
      pedSprite('#38bdf8', '#f1c27d', '#3b2416', '#1e3a8a', { kid: true }),
      pedSprite('#f472b6', '#e0ac69', '#111827', '#334155', { kid: true }),
      pedSprite('#facc15', '#c68642', '#7c2d12', '#1f2937', { kid: true }),
    ],
    wave: [pedSprite('#0ea5e9', '#e0ac69', '#3b2416', '#334155', { wave: 1 }), pedSprite('#0ea5e9', '#e0ac69', '#3b2416', '#334155', { wave: -1 })],
    sheep: sheepSprite(),
    cow: cowSprite(),
    station: stationSprite(),
    busstop: busstopSprite(),
    landmark: { bank: landmarkSprite('bank'), school: landmarkSprite('school'), park: landmarkSprite('park') },
    glow: {
      red: glowSprite(255, 70, 70), green: glowSprite(60, 230, 120), amber: glowSprite(255, 190, 60), white: glowSprite(255, 245, 220),
      cyan: glowSprite(60, 220, 255), orange: glowSprite(255, 140, 40), blue: glowSprite(90, 140, 255),
    },
  }
  return common
}

/* ── scenery (drawn in each theme's colours) ── */
function treeSprite(p, rnd) {
  return sprite(100, 140, (g) => {
    rect(g, 45, 82, 10, 58, p.trunk)
    rect(g, 45, 82, 4, 58, 'rgba(255,255,255,0.12)')
    circle(g, 50, 60, 40, p.leaf[0])
    circle(g, 32 + rnd() * 6, 72, 26, p.leaf[1])
    circle(g, 68 - rnd() * 6, 70, 26, p.leaf[1])
    circle(g, 50, 44, 28, p.leaf[1])
    circle(g, 40, 38, 15, p.leaf[2])
    circle(g, 62, 56, 9, p.leaf[2])
  }, { scale: 1.6 })
}

function pineSprite(p, snow) {
  return sprite(80, 160, (g) => {
    rect(g, 36, 128, 8, 32, p.trunk)
    fillPath(g, 'M40 6L70 64L10 64Z', p.leaf[1])
    fillPath(g, 'M40 36L76 100L4 100Z', p.leaf[0])
    fillPath(g, 'M40 66L80 136L0 136Z', p.leaf[0])
    fillPath(g, 'M40 6L48 22L36 60L22 64Z', 'rgba(255,255,255,0.12)')
    fillPath(g, 'M40 66L80 136L58 136Z', 'rgba(0,0,0,0.15)')
    if (snow) {
      const s = '#f8fbff'
      fillPath(g, 'M40 6L52 30Q46 26 40 32Q34 26 28 30Z', s)
      fillPath(g, 'M14 64Q26 56 34 62Q40 54 48 62Q56 56 66 64L62 58Q50 52 40 56Q30 52 18 58Z', s)
      fillPath(g, 'M8 100Q20 92 30 98Q40 90 50 98Q60 92 72 100L68 94Q54 88 40 92Q26 88 12 94Z', s)
      fillPath(g, 'M2 136Q16 128 28 134Q40 126 52 134Q64 128 78 136L74 130Q58 124 40 128Q22 124 6 130Z', s)
    }
  }, { scale: 1.6 })
}

function palmSprite(p) {
  return sprite(120, 180, (g) => {
    g.strokeStyle = p.trunk; g.lineWidth = 9; g.lineCap = 'round'
    g.beginPath(); g.moveTo(52, 180); g.quadraticCurveTo(64, 110, 58, 46); g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3
    g.beginPath(); g.moveTo(50, 176); g.quadraticCurveTo(61, 110, 56, 48); g.stroke()
    const fronds = [[-1.0, 56], [-0.4, 58], [0.15, 56], [0.7, 54], [-2.6, 52], [2.4, 50], [-1.9, 48], [1.6, 50]]
    fronds.forEach(([a, len], i) => {
      g.save(); g.translate(58, 46); g.rotate(a)
      g.fillStyle = p.leaf[i % 2]
      g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(len * 0.6, -18, len, 10); g.quadraticCurveTo(len * 0.5, -2, 0, 5); g.closePath(); g.fill()
      g.restore()
    })
    circle(g, 56, 50, 6, '#3b2416')
  }, { scale: 1.5 })
}

function bushSprite(p) {
  return sprite(100, 60, (g) => {
    circle(g, 28, 40, 22, p.bush[0]); circle(g, 72, 40, 22, p.bush[0])
    circle(g, 50, 30, 28, p.bush[1]); circle(g, 40, 22, 9, 'rgba(255,255,255,0.15)')
    rect(g, 6, 40, 88, 20, p.bush[0])
  }, { scale: 1.4 })
}

function buildingSprite(p, rnd, i, tall = false) {
  const w = tall ? 120 : 100
  const h = tall ? Math.round(300 + rnd() * 120) : Math.round(140 + rnd() * 140)
  return sprite(w, h, (g) => {
    const base = p.bldg[i % p.bldg.length]
    rect(g, 0, 10, w, h - 10, base)
    rect(g, 0, 4, w, 8, 'rgba(0,0,0,0.25)')
    rect(g, w - 14, 10, 14, h - 10, 'rgba(0,0,0,0.14)')
    if (tall) { rect(g, w / 2 - 2, -2, 4, 12, '#94a3b8'); if (p.night) circle(g, w / 2, -1, 3, '#ef4444') }
    else if (rnd() < 0.5) rect(g, 18, 4, 16, 8, 'rgba(0,0,0,0.3)')
    else rect(g, 70, 0, 3, 8, 'rgba(255,255,255,0.4)')
    const cols = tall ? 5 : 3 + Math.floor(rnd() * 2)
    const cw = (w - 22) / cols
    for (let y = 22; y < h - 36; y += tall ? 18 : 22) {
      for (let c = 0; c < cols; c++) {
        const lit = p.night || p.lights ? rnd() < 0.5 : true
        g.fillStyle = lit ? p.winLit : p.win
        if ((p.night || p.lights) && !lit) g.fillStyle = 'rgba(0,0,0,0.25)'
        g.fillRect(9 + c * cw + 3, y, cw - 6, tall ? 10 : 13)
        if (!p.night) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(9 + c * cw + 3, y, (cw - 6) * 0.35, tall ? 10 : 13) }
      }
    }
    rect(g, w / 2 - 11, h - 30, 22, 30, 'rgba(0,0,0,0.45)')
    rect(g, w / 2 - 15, h - 33, 30, 4, 'rgba(255,255,255,0.25)')
  }, { scale: tall ? 1.1 : 1.3 })
}

function houseSprite(p, rnd, i) {
  return sprite(120, 110, (g) => {
    const base = p.bldg[(i + 1) % p.bldg.length]
    rect(g, 10, 44, 100, 66, base)
    rect(g, 96, 44, 14, 66, 'rgba(0,0,0,0.12)')
    fillPath(g, 'M0 48L60 6L120 48Z', p.roof)
    fillPath(g, 'M60 6L120 48L104 48Z', 'rgba(0,0,0,0.18)')
    rect(g, 52, 74, 18, 36, '#6b4226')
    ;[[22, 62], [80, 62]].forEach(([x, y]) => {
      rect(g, x, y, 20, 20, '#f8fafc'); rect(g, x + 2, y + 2, 16, 16, p.lights ? p.winLit : p.win)
      rect(g, x + 9, y + 2, 2, 16, '#f8fafc'); rect(g, x + 2, y + 9, 16, 2, '#f8fafc')
    })
    if (rnd() < 0.6) rect(g, 84, 10, 10, 22, '#7c2d12')
  }, { scale: 1.4 })
}

function cabinSprite(p) {
  return sprite(120, 110, (g) => {
    rect(g, 12, 50, 96, 60, '#8b5a3c')
    for (let y = 54; y < 110; y += 9) rect(g, 12, y, 96, 2, 'rgba(0,0,0,0.2)')
    fillPath(g, 'M0 54L60 12L120 54Z', '#5b3a29')
    fillPath(g, 'M-2 56L60 10L122 56L114 56L60 18L6 56Z', '#f8fbff')
    fillPath(g, 'M8 50L60 14L112 50L104 50L60 22L16 50Z', '#e8eff8')
    rect(g, 50, 76, 20, 34, '#3b2416')
    rect(g, 22, 66, 18, 16, p.winLit); rect(g, 80, 66, 18, 16, p.winLit)
    rect(g, 84, 18, 10, 24, '#57534e'); rect(g, 82, 16, 14, 5, '#f8fbff')
  }, { scale: 1.4 })
}

function snowmanSprite() {
  return sprite(64, 96, (g) => {
    circle(g, 32, 72, 22, '#f8fbff'); circle(g, 32, 72, 22, 'rgba(148,163,184,0.15)')
    circle(g, 32, 42, 16, '#f8fbff')
    circle(g, 32, 20, 12, '#f8fbff')
    rect(g, 22, 2, 20, 12, '#111827'); rect(g, 17, 12, 30, 4, '#111827')
    circle(g, 28, 18, 1.8, '#111827'); circle(g, 36, 18, 1.8, '#111827')
    fillPath(g, 'M32 21l12 3-12 2Z', '#f97316')
    rect(g, 20, 30, 24, 6, '#dc2626'); rect(g, 36, 34, 6, 12, '#dc2626')
    for (const y of [40, 48, 62, 72]) circle(g, 32, y, 1.8, '#111827')
  }, { scale: 1.6 })
}

function cactusSprite(p, variant) {
  return sprite(70, 130, (g) => {
    const c = p.leaf[variant ? 1 : 0]
    rrect(g, 27, 10, 16, 120, 8, c)
    if (variant) { rrect(g, 8, 50, 12, 36, 6, c); rect(g, 14, 78, 16, 10, c) } else { rrect(g, 8, 38, 12, 40, 6, c); rect(g, 14, 70, 16, 10, c) }
    rrect(g, 50, variant ? 34 : 56, 12, 34, 6, c); rect(g, 40, variant ? 60 : 82, 14, 10, c)
    rect(g, 32, 14, 2, 112, 'rgba(0,0,0,0.16)'); rect(g, 38, 14, 2, 112, 'rgba(255,255,255,0.18)')
    circle(g, 35, 11, 4, '#f472b6')
  }, { scale: 1.6 })
}

function rockSprite(p) {
  return sprite(110, 64, (g) => {
    fillPath(g, 'M6 64L14 30L34 14L62 10L88 22L104 44L108 64Z', p.rockDark)
    fillPath(g, 'M14 30L34 14L62 10L70 26L48 40L20 46Z', p.rock)
    fillPath(g, 'M62 10L88 22L80 34L70 26Z', shade(p.rock.startsWith('#') ? p.rock : '#888888', 0.18))
    if (p.weather === 'snow') fillPath(g, 'M24 22L34 14L62 10L84 20L70 22L50 18L34 24Z', '#f8fbff')
  }, { scale: 1.4 })
}

function deadbushSprite(p) {
  return sprite(80, 50, (g) => {
    g.strokeStyle = p.bush[0]; g.lineWidth = 3; g.lineCap = 'round'
    g.beginPath()
    for (const [a, l] of [[-2.4, 30], [-2.0, 36], [-1.6, 40], [-1.2, 36], [-0.8, 30], [-1.8, 24], [-1.4, 26]]) {
      g.moveTo(40, 48); g.lineTo(40 + Math.cos(a) * l, 48 + Math.sin(a) * l)
    }
    g.stroke()
  }, { scale: 1.4 })
}

function mesaSprite(p, rnd) {
  return sprite(320, 140, (g) => {
    const top = 20 + rnd() * 20
    fillPath(g, `M0 140L40 ${top + 30}L70 ${top}L230 ${top - 4}L262 ${top + 26}L320 140Z`, p.rock)
    fillPath(g, `M230 ${top - 4}L262 ${top + 26}L320 140L250 140Z`, p.rockDark)
    for (let k = 1; k < 4; k++) rect(g, 30 + k * 6, top + k * 24, 260 - k * 12, 4, 'rgba(0,0,0,0.12)')
  }, { scale: 1 })
}

function peakSprite(p) {
  return sprite(320, 180, (g) => {
    fillPath(g, 'M0 180L120 20L170 70L210 40L320 180Z', p.rock)
    fillPath(g, 'M120 20L170 70L210 40L320 180L200 180Z', p.rockDark)
    fillPath(g, 'M120 20L150 60L132 54L118 66L104 56L92 58Z', '#f8fbff')
    fillPath(g, 'M210 40L236 72L222 68L210 78L198 66L188 70Z', '#f8fbff')
  }, { scale: 1 })
}

function lampSprite(p, mirror) {
  return sprite(90, 220, (g) => {
    if (mirror) { g.translate(90, 0); g.scale(-1, 1) }
    if (p.night || p.lights) {
      const rg = g.createRadialGradient(76, 14, 0, 76, 14, 34)
      rg.addColorStop(0, 'rgba(255,226,150,0.9)'); rg.addColorStop(1, 'rgba(255,226,150,0)')
      g.fillStyle = rg; g.fillRect(40, 0, 50, 50)
    }
    rect(g, 7, 20, 6, 200, '#475569')
    rect(g, 7, 20, 2, 200, 'rgba(255,255,255,0.25)')
    g.strokeStyle = '#475569'; g.lineWidth = 5
    g.beginPath(); g.moveTo(10, 24); g.quadraticCurveTo(10, 8, 30, 8); g.lineTo(70, 8); g.stroke()
    fillPath(g, 'M62 6h26l-4 9h-18Z', '#334155')
    rect(g, 66, 14, 18, 3, p.night || p.lights ? '#fff3c4' : '#e2e8f0')
    rect(g, 3, 212, 14, 8, '#334155')
  }, { scale: 1.4, ax: mirror ? 80 / 90 : 10 / 90 })
}

const BOARD = ['#fde047', '#38bdf8', '#f472b6', '#4ade80', '#fb923c', '#a78bfa']
function billboardSprite(p, word, i) {
  return sprite(220, 160, (g) => {
    const lit = p.night || p.lights
    rect(g, 50, 96, 8, 64, '#475569'); rect(g, 162, 96, 8, 64, '#475569')
    rect(g, 46, 150, 16, 10, '#334155'); rect(g, 158, 150, 16, 10, '#334155')
    if (lit) {
      const rg = g.createRadialGradient(110, 52, 10, 110, 52, 120)
      rg.addColorStop(0, 'rgba(255,240,200,0.35)'); rg.addColorStop(1, 'rgba(255,240,200,0)')
      g.fillStyle = rg; g.fillRect(0, 0, 220, 130)
    }
    rrect(g, 6, 6, 208, 96, 8, '#1f2937')
    rrect(g, 12, 12, 196, 84, 5, BOARD[i % BOARD.length])
    rect(g, 12, 12, 196, 6, 'rgba(255,255,255,0.35)')
    fitText(g, word, 110, 56, 44, 180, '#111827')
    if (lit) for (const x of [40, 110, 180]) { rect(g, x - 2, 100, 4, 8, '#334155'); circle(g, x, 100, 4, '#fff7c2') }
  }, { scale: 1.1 })
}

const themeCache = new Map()
/* The scenery sprites of one theme. ~10–25 ms, built once per theme (the road warms the next one early). */
export function themeSprites(name) {
  if (themeCache.has(name)) return themeCache.get(name)
  const p = THEMES[name] || THEMES.day
  const rnd = seeded(name.length * 7919 + name.charCodeAt(0) * 31 + 13)
  const need = new Set([...p.scenery, ...p.far, 'lamp'])
  const s = { words: [] }
  if (need.has('tree')) s.tree = [treeSprite(p, rnd), treeSprite(p, rnd)]
  if (need.has('pine')) s.pine = [pineSprite(p, false)]
  if (need.has('snowpine')) s.snowpine = [pineSprite(p, true)]
  if (need.has('palm')) s.palm = [palmSprite(p)]
  if (need.has('bush')) s.bush = [bushSprite(p)]
  if (need.has('building')) s.building = [0, 1, 2, 3, 4].map(i => buildingSprite(p, rnd, i))
  if (need.has('tower')) s.tower = [0, 1, 2].map(i => buildingSprite(p, rnd, i + 1, true))
  if (need.has('house')) s.house = [0, 1, 2].map(i => houseSprite(p, rnd, i))
  if (need.has('cabin')) s.cabin = [cabinSprite(p)]
  if (need.has('snowman')) s.snowman = [snowmanSprite()]
  if (need.has('cactus')) s.cactus = [cactusSprite(p, 0), cactusSprite(p, 1)]
  if (need.has('rock')) s.rock = [rockSprite(p)]
  if (need.has('deadbush')) s.deadbush = [deadbushSprite(p)]
  if (need.has('mesa')) s.mesa = [mesaSprite(p, rnd), mesaSprite(p, rnd)]
  if (need.has('peak')) s.peak = [peakSprite(p)]
  if (need.has('billboard')) s.billboard = p.words.map((w, i) => billboardSprite(p, w, i + name.length))
  s.lampL = lampSprite(p, false)
  s.lampR = lampSprite(p, true)
  themeCache.set(name, s)
  return s
}
