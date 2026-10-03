/*
 * TOBY'S DAY — plain numbers and helpers shared by the scene files (no JSX).
 *
 * A scene is a 360 × 300 picture drawn with `preserveAspectRatio="xMidYMax meet"`.
 * Every room paints its wall and floor far past those edges (the "bleed"), so a
 * wide desktop stage shows more room on both sides and a tall phone stage shows
 * more wall above — never empty bars, never a cropped Toby.
 */
export const VIEW_W = 360
export const VIEW_H = 300
export const FLOOR = 236                 // where the back wall meets the floor
export const BX = -300                   // bleed: left edge of the painted area
export const BW = VIEW_W - 2 * BX        // bleed: painted width (960)
export const BY = -260                   // bleed: top edge of the painted area
export const BH = VIEW_H - BY            // bleed: painted height

// style for a group moved with x / y and scaled / rotated around its own 0,0
export const AT0 = { transformBox: 'view-box', originX: '0px', originY: '0px' }

// a point in Toby's own 200 × 240 box → scene coordinates (sp = { x, y, s } from spotFor)
export const at = (sp, x, y) => [sp.x + sp.s * (x - 100), sp.y + sp.s * (y - 236)]
// Toby's paws in the rest pose (his box)
export const LEFT_PAW = [56.5, 207.2]
export const RIGHT_PAW = [143.5, 207.2]
// Biscuit the dog is drawn at this scale in the park
export const DOG_S = 0.9

export const SKY = {
  day: ['#7DD3FC', '#E0F2FE'],
  night: ['#0B1033', '#3730A3'],
  dusk: ['#7C3AED', '#F472B6', '#FB923C'],
  morning: ['#60A5FA', '#BAE6FD', '#FEF3C7'],
}

export const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif'
export const CHALK = "'Chalkboard SE', 'Comic Sans MS', 'Segoe Print', 'Marker Felt', cursive"
export const HAND = "'Segoe Print', 'Comic Sans MS', 'Chalkboard SE', 'Bradley Hand', cursive"

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December']
/* "Saturday, 3 October" — the date on the classroom board */
export function dateLabel(d = new Date()) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/* the last thing picked on a choice step (the pick is appended to world.basket) → that option */
export function chosenOption(step, w) {
  if (!step.choice || !w.basket?.length) return null
  const last = w.basket[w.basket.length - 1]
  return step.choice.find(o => o.item === last) || null
}
