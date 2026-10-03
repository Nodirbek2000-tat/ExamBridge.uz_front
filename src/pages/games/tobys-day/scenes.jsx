/*
 * TOBY'S DAY — the animated scene in the middle of the screen.
 *
 * One 360 × 300 SVG (`xMidYMax meet`; every room is painted wider and taller,
 * so a wide desktop stage shows more room and a tall phone stage more wall):
 * the room (back layer) → action props behind Toby → Toby → furniture in front
 * of him (table, desk, blanket, kitchen island) → effects.
 * The scene is driven by data only: the step, the world state (what earlier
 * steps changed), and the phase (ready / listening / fail / success / done).
 *
 * Rooms live in scene-home / scene-town / scene-street / scene-school /
 * scene-cooking; what Toby does per action is ACTS (world-acts.js).
 *
 * Props: step, world, phase, speaker ('toby' | 'other'), tickle, bounce (a new
 * number = one hop), onPoke, reduced, acc (Toby's accessory, see Toby.jsx).
 */
import { useId } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import Toby from './Toby'
import { Dog } from './characters'
import { ACTS } from './world-acts'
import { PLACE_KEYS } from './world-places'
import { DOG_S, LEFT_PAW, at, chosenOption } from './world-geo'
import { Bathroom, Bedroom, Hall, Kitchen, Living } from './scene-home'
import { Park, Shop } from './scene-town'
import { BusInside, BusStop, Street } from './scene-street'
import { Classroom } from './scene-school'
import { CookingRoom } from './scene-cooking'
import ActionFx from './scene-fx'

const PLACES = {
  bedroom: Bedroom, night: Bedroom, bathroom: Bathroom, kitchen: Kitchen, living: Living,
  hall: Hall, street: Street, busstop: BusStop, bus: BusInside,
  classroom: Classroom, shop: Shop, park: Park, cooking: CookingRoom,
}
if (import.meta.env?.DEV) {
  const missing = PLACE_KEYS.filter(k => !PLACES[k])
  if (missing.length) console.warn('[tobys-day] places without a room:', missing)
}
// rooms whose effects are drawn by scene-fx.jsx (the newer rooms draw their own)
const FX_PLACES = new Set(['bedroom', 'night', 'bathroom', 'kitchen', 'living', 'shop', 'park'])
// places where world.sitting means Toby sits down (sit pose)
const SEATS = new Set(['park', 'bus', 'classroom'])

/* where Toby's feet are, and how big he is (o: opacity, od: its delay) */
function spotFor(place, w, action) {
  switch (place) {
    case 'bedroom':
    case 'night':
      return w.inBed ? { x: 272, y: 236, s: 0.56 } : { x: 120, y: 288, s: 0.74 }
    case 'bathroom': return w.bathed ? { x: 300, y: 240, s: 0.5 } : { x: 196, y: 288, s: 0.74 }
    case 'kitchen': return w.here ? { x: 180, y: 270, s: 0.72 } : { x: 46, y: 292, s: 0.6 }
    case 'shop': return w.here === false ? { x: 40, y: 292, s: 0.6 } : { x: 124, y: 288, s: 0.72 }
    case 'park':
      if (w.sitting) return { x: 76, y: 238, s: 0.6 }
      return w.here ? { x: 190, y: 290, s: 0.72 } : { x: 44, y: 292, s: 0.6 }
    case 'living':
      if (!w.here) return { x: 57, y: 238, s: 0.56 }
      if (action === 'homework' || action === 'dinner') return { x: 180, y: 268, s: 0.72 }
      if (action === 'tv') return { x: 146, y: 288, s: 0.72 }
      return { x: 176, y: 288, s: 0.72 }
    case 'hall': return w.outside ? { x: 280, y: 250, s: 0.58 } : { x: 150, y: 290, s: 0.74 }
    case 'street':
      if (w.crossed) return { x: 222, y: 194, s: 0.5 }
      return w.atCurb ? { x: 142, y: 292, s: 0.7 } : { x: 118, y: 292, s: 0.7 }
    case 'busstop':
      if (w.onBus) return { x: 282, y: 250, s: 0.5, o: 0, od: 1.3 }
      return w.atStop ? { x: 186, y: 292, s: 0.72 } : { x: 312, y: 292, s: 0.62 }
    case 'bus':
      if (w.arrived) return { x: 278, y: 292, s: 0.68 }
      return w.sitting ? { x: 150, y: 215, s: 0.66 } : { x: 172, y: 292, s: 0.7 }
    case 'classroom':
      if (!w.here) return { x: 38, y: 282, s: 0.56 }
      return w.sitting ? { x: 190, y: 284, s: 0.7 } : { x: 190, y: 288, s: 0.74 }
    case 'cooking':          // behind the kitchen island (its top is at y 272)
      if (action === 'washhands' || action === 'washveg') return { x: 84, y: 288, s: 0.7 }
      if (action === 'cut') return { x: 168, y: 288, s: 0.7 }
      if (['intopot', 'salt', 'stir', 'taste', 'ready'].includes(action)) return { x: 222, y: 288, s: 0.7 }
      return { x: 172, y: 288, s: 0.7 }
    default: return { x: 180, y: 288, s: 0.72 }
  }
}

/* whole-body trips: [target, transition] (only while the success plays) */
const TRIPS = {
  park: {
    bike: (sp) => [{ x: [sp.x, 300, 64, sp.x], y: sp.y, scale: sp.s, opacity: 1 }, { duration: 3.4, ease: 'easeInOut', times: [0, 0.35, 0.75, 1] }],
    slide: (sp) => [
      { x: [sp.x, 318, 318, 296, 212, sp.x], y: [sp.y, 290, 170, 166, 284, sp.y], scale: [sp.s, 0.66, 0.58, 0.58, 0.7, sp.s], opacity: 1 },
      { duration: 4, ease: 'easeInOut', times: [0, 0.2, 0.45, 0.52, 0.84, 1] },
    ],
  },
}

/* ── Toby's pose for this moment ─────────────────────────────────────── */
function tobyProps(step, w, phase, acting, tickle, bounce, place) {
  const chosen = acting ? chosenOption(step, w) : null
  const act = acting ? ACTS[chosen?.act || step.action] || {} : {}
  const sleeping = !!w.asleep || w.awake === false
  const seated = !!w.sitting && SEATS.has(place)
  let mood = 'idle'
  let pose = seated ? 'sit' : 'rest'
  let left = null
  let right = null
  let leftProps
  let rightProps
  if (acting) {
    mood = act.mood || 'happy'
    pose = act.pose || pose
    left = act.left || null
    right = act.right || null
    rightProps = act.rightProps
  } else if (phase === 'listening') mood = sleeping ? 'stir' : 'listening'
  else if (phase === 'fail') {
    mood = sleeping ? 'sleep' : 'confused'
    if (!sleeping && !seated) pose = 'shrug'
  } else mood = sleeping ? 'sleep' : tickle ? 'laugh' : 'idle'
  if (w.hasBasket && !left) {
    left = 'basket'
    leftProps = { basket: w.basket, fresh: acting && step.action === 'pick' }
  } else if (w.bagged && !left && !(acting && step.action === 'packbag')) {
    left = 'shopbag'
    leftProps = { basket: w.basket }
  }
  return {
    mood, pose, left, right, leftProps, rightProps,
    outfit: w.outfit || 'tshirt',
    hair: w.hair || 'neat',
    cap: w.outfit === 'pyjamas' && (!!w.inBed || sleeping),
    walking: acting && phase === 'success' && !!act.walking,
    vehicle: acting ? act.vehicle || null : null,
    jump: bounce,                       // a new number = one hop (success, tickle)
    kick: acting && act.kick ? step.id : 0,
  }
}

export default function Scene({ step, world, phase, speaker, tickle = false, bounce = 0, onPoke, reduced = false, acc = null }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const place = PLACES[step.place] ? step.place : 'kitchen'
  const Place = PLACES[place]
  const acting = phase === 'success' || phase === 'done'
  const chosen = acting ? chosenOption(step, world) : null
  const sp = spotFor(place, world, step.action)
  const t = tobyProps(step, world, phase, acting, tickle, bounce, place)
  // ids per room: while two rooms cross-fade, each keeps its own gradients
  const roomProps = { w: world, uid: `${uid}${place}`, acting, action: step.action, reduced, speaker, night: place === 'night', sp, chosen, acc }
  const fx = FX_PLACES.has(place)

  // a trip (bike ride, the slide): Toby goes there and comes back
  const trip = acting && phase === 'success' && !reduced ? TRIPS[place]?.[step.action] : null
  const [target, move] = trip ? trip(sp)
    : [{ x: sp.x, y: sp.y, scale: sp.s, opacity: sp.o ?? 1 },
      reduced ? { duration: 0 } : { type: 'spring', stiffness: 55, damping: 14, opacity: { duration: 0.5, delay: sp.od || 0 } }]

  const dog = place === 'park' && world.dog
  const dogX = world.sitting ? 156 : sp.x - 80
  const showLead = dog && !world.sitting && ['dog', 'fetch', 'icecream'].includes(step.action)
  const paw = at(sp, LEFT_PAW[0], LEFT_PAW[1])
  const collar = [dogX + 14 * DOG_S, 292 - 28 * DOG_S]

  return (
    <svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 h-full w-full" role="img"
      aria-label={`Toby — ${chosen?.say || step.say}`}>
      {/* no initial={false} here: framer keeps that flag for every motion element later
          mounted inside the first room, which would freeze its effects at their end state */}
      <AnimatePresence>
        <Motion.g key={place} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <Place layer="back" {...roomProps} />
        </Motion.g>
      </AnimatePresence>
      {fx && <ActionFx layer="back" step={step} w={world} sp={sp} acting={acting} reduced={reduced} />}

      {dog && (
        <Motion.g initial={{ x: -60, y: 292, opacity: 0 }} animate={{ x: dogX, y: 292, opacity: 1 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 50, damping: 13 }}>
          <g transform={`scale(${DOG_S})`}>
            <Dog happy={acting} walking={acting && phase === 'success' && step.action === 'dog'} sit={world.sitting}
              jump={acting && step.action === 'fetch' ? step.id : 0} reduced={reduced} />
          </g>
        </Motion.g>
      )}

      <Motion.g style={{ transformBox: 'view-box', originX: '0px', originY: '0px' }} initial={false} animate={target} transition={move}>
        <g transform="translate(-100 -236)" onClick={onPoke} style={{ cursor: onPoke ? 'pointer' : undefined }}>
          <Toby {...t} acc={acc} talking={speaker === 'toby'} reduced={reduced} />
        </g>
      </Motion.g>

      {showLead && (
        <path d={`M${paw[0]} ${paw[1]}Q${(paw[0] + collar[0]) / 2} ${Math.max(paw[1], collar[1]) + 18} ${collar[0]} ${collar[1]}`}
          stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}

      <AnimatePresence>
        <Motion.g key={place} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <Place layer="front" {...roomProps} />
        </Motion.g>
      </AnimatePresence>
      {fx && <ActionFx layer="front" step={step} w={world} sp={sp} acting={acting} reduced={reduced} />}
    </svg>
  )
}
