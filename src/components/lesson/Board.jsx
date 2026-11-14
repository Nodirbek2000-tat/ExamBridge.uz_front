import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BookOpen, Brain, Calculator, Car, ChartColumn, ChartLine, ChartPie, CircleCheck, CircleHelp,
  CircleX, Clock, Coins, Compass, Divide, Droplet, Equal, Flag, Globe, GraduationCap, Headphones, House,
  KeyRound, Layers, Lightbulb, MessageCircle, Mic, PenTool, Pencil, Percent, Puzzle, Repeat, Ruler, Scale,
  Search, ShoppingCart, Sigma, Star, Sun, Target, Timer, TreePine, TriangleAlert, Trophy, Users, Zap,
} from 'lucide-react'
import { TobyAvatar } from '../../pages/games/tobys-day/Toby'
import { mathHtml } from './lessonMath'
import { parseInline } from './timeline'

const CHARS_PER_SECOND = 24        // how fast the teacher writes
const MIN_WORD_SECONDS = 0.08
const MATH_SECONDS = 0.7
const STROKE_SECONDS = 0.45
const ICON_SECONDS = 1.1
const TAG_SECONDS = 0.5            // "Exam secret" written above a secret
const STRIKE_SECONDS = 0.4         // crossing a mistake out
const ARROW_SECONDS = 0.25
const ARROW_SIZE = 12
const MIN_FIT = 0.5
const FIT_STEP = 0.08

// Board icon names (the server's board.ICONS) → their drawings
const ICONS = {
  scale: Scale, calculator: Calculator, lightbulb: Lightbulb, target: Target, clock: Clock,
  check: CircleCheck, cross: CircleX, warning: TriangleAlert, pencil: Pencil, ruler: Ruler,
  book: BookOpen, brain: Brain, puzzle: Puzzle, key: KeyRound, trophy: Trophy, flag: Flag,
  users: Users, globe: Globe, compass: Compass, 'chart-line': ChartLine, 'chart-bar': ChartColumn,
  'chart-pie': ChartPie, sigma: Sigma, percent: Percent, divide: Divide, equal: Equal,
  'arrow-right': ArrowRight, repeat: Repeat, search: Search, message: MessageCircle, mic: Mic,
  headphones: Headphones, pen: PenTool, layers: Layers, timer: Timer, star: Star, zap: Zap,
  coins: Coins, cart: ShoppingCart, car: Car, house: House, tree: TreePine, sun: Sun,
  droplet: Droplet, graduation: GraduationCap, question: CircleHelp,
}

/** Tokens of a text, each timed to start after the one before it. */
function writeOut(text, clock, rate) {
  return parseInline(text).map((token) => {
    if (token.kind === 'space') return token
    const seconds = token.kind === 'math'
      ? MATH_SECONDS
      : Math.max(MIN_WORD_SECONDS, token.value.length / CHARS_PER_SECOND)
    const timed = { ...token, delay: clock.at, seconds: seconds / rate }
    clock.at += seconds / rate
    if (token.kind === 'math') timed.html = mathHtml(token.value)
    return timed
  })
}

/* Everything the pen draws carries data-pen with its start and length in seconds,
   so the teacher can follow it (see useTeacher). */
function penProps(at, seconds) {
  return { 'data-pen': '', 'data-at': at, 'data-d': seconds, style: { '--at': `${at}s`, '--d': `${seconds}s` } }
}

function Written({ tokens }) {
  return tokens.map((token, i) => {
    if (token.kind === 'space') return ' '
    const className = `lb-w${token.bold ? ' lb-bold' : ''}`
    const pen = penProps(token.delay, token.seconds)
    if (token.kind === 'math') {
      return <span key={i} className={className} {...pen} dangerouslySetInnerHTML={{ __html: token.html }} />
    }
    return <span key={i} className={className} {...pen}>{token.value}</span>
  })
}

function arrowHead([x1, y1], [x2, y2]) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const wing = (turn) => [
    x2 - ARROW_SIZE * Math.cos(angle + turn),
    y2 - ARROW_SIZE * Math.sin(angle + turn),
  ]
  const [ax, ay] = wing(0.45)
  const [bx, by] = wing(-0.45)
  return `M${ax} ${ay} L${x2} ${y2} L${bx} ${by}`
}

/** A diagram as a list of marks to draw one after another. */
function drawOut(shapes, rate) {
  const marks = []
  let at = 0
  const stroke = (d, shape, dashed = false) => {
    marks.push({ kind: dashed ? 'dashed' : 'stroke', d, color: shape.color, at })
    at += STROKE_SECONDS / rate
  }

  for (const shape of shapes) {
    if (shape.kind === 'line') {
      const [x1, y1] = shape.from
      const [x2, y2] = shape.to
      stroke(`M${x1} ${y1} L${x2} ${y2}`, shape, shape.dashed)
      if (shape.arrow) stroke(arrowHead(shape.from, shape.to), shape)
    } else if (shape.kind === 'circle') {
      const [x, y] = shape.center
      const { r } = shape
      if (shape.filled) {
        marks.push({ kind: 'dot', x, y, r, color: shape.color, at })
        at += STROKE_SECONDS / (2 * rate)
      } else {
        stroke(`M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`, shape)
      }
    } else if (shape.kind === 'path') {
      stroke(shape.d, shape)
    } else {
      marks.push({ kind: 'label', x: shape.pos[0], y: shape.pos[1], text: shape.text, color: shape.color, at })
      at += STROKE_SECONDS / (2 * rate)
    }
  }
  return marks
}

function Diagram({ element, rate }) {
  const marks = useMemo(() => drawOut(element.shapes, rate), [element, rate])
  const { width, height } = element
  const seconds = STROKE_SECONDS / rate
  return (
    <svg
      className="lb-diagram"
      viewBox={`0 0 ${width} ${height}`}
      style={{ '--ratio': width / height }}
      role="img"
      aria-label="Diagram"
    >
      {marks.map((mark, i) => {
        const className = `lb-c-${mark.color}`
        const pen = penProps(mark.at, seconds)
        if (mark.kind === 'label') {
          return <text key={i} x={mark.x} y={mark.y} className={`lb-fade lb-label ${className}`} {...pen}>{mark.text}</text>
        }
        if (mark.kind === 'dot') {
          return <circle key={i} cx={mark.x} cy={mark.y} r={mark.r} className={`lb-fade lb-dot ${className}`} {...pen} />
        }
        if (mark.kind === 'dashed') {
          return <path key={i} d={mark.d} className={`lb-fade lb-line lb-dashed ${className}`} {...pen} />
        }
        return <path key={i} d={mark.d} pathLength="1" className={`lb-stroke lb-line ${className}`} {...pen} />
      })}
    </svg>
  )
}

function IconElement({ element, rate }) {
  const Icon = ICONS[element.name] || CircleHelp
  const seconds = ICON_SECONDS / rate
  const label = useMemo(
    () => (element.label ? writeOut(element.label, { at: seconds }, rate) : null),
    [element, rate, seconds],
  )
  return (
    <figure className="lb-figure">
      <span className="lb-icon-disc">
        <Icon className="lb-icon" strokeWidth={1.6} aria-hidden="true" {...penProps(0, seconds)} />
      </span>
      {label && <figcaption className="lb-icon-label"><Written tokens={label} /></figcaption>}
    </figure>
  )
}

function TextElement({ element, rate }) {
  const tokens = useMemo(() => writeOut(element.text, { at: 0 }, rate), [element, rate])
  return <Written tokens={tokens} />
}

function ListElement({ element, rate }) {
  const items = useMemo(() => {
    const clock = { at: 0 }
    return element.items.map((item) => writeOut(item, clock, rate))
  }, [element, rate])
  return (
    <ul>
      {items.map((tokens, i) => <li key={i}><Written tokens={tokens} /></li>)}
    </ul>
  )
}

function MathElement({ element, rate }) {
  const html = useMemo(() => mathHtml(element.tex, true), [element])
  return <div className="lb-w lb-math" {...penProps(0, MATH_SECONDS / rate)} dangerouslySetInnerHTML={{ __html: html }} />
}

/** An exam secret: a tag, then the secret written on a card. */
function SecretElement({ element, rate }) {
  const tag = TAG_SECONDS / rate
  const tokens = useMemo(() => writeOut(element.text, { at: tag }, rate), [element, rate, tag])
  return (
    <>
      <span className="lb-w lb-secret-tag" {...penProps(0, tag)}>
        <KeyRound aria-hidden="true" /> Exam secret
      </span>
      <span className="lb-secret-text"><Written tokens={tokens} /></span>
    </>
  )
}

/** A typical mistake: written, crossed out, then the right version after an arrow. */
function FixElement({ element, rate }) {
  const parts = useMemo(() => {
    const clock = { at: 0 }
    const wrong = writeOut(element.wrong, clock, rate)
    const strike = { at: clock.at, seconds: STRIKE_SECONDS / rate }
    const arrow = { at: strike.at + strike.seconds, seconds: ARROW_SECONDS / rate }
    clock.at = arrow.at + arrow.seconds
    const right = writeOut(element.right, clock, rate)
    return { wrong, strike, arrow, right }
  }, [element, rate])
  return (
    <div className="lb-fix-row">
      <span className="lb-fix-wrong">
        <span className="sr-only">Wrong: </span>
        <Written tokens={parts.wrong} />
        <span className="lb-fix-strike" {...penProps(parts.strike.at, parts.strike.seconds)} />
      </span>
      <span className="lb-w lb-fix-arrow" aria-hidden="true" {...penProps(parts.arrow.at, parts.arrow.seconds)}>→</span>
      <span className="lb-fix-right">
        <span className="sr-only">Right: </span>
        <Written tokens={parts.right} />
      </span>
    </div>
  )
}

function Content({ element, rate }) {
  if (element.type === 'secret') return <SecretElement element={element} rate={rate} />
  if (element.type === 'fix') return <FixElement element={element} rate={rate} />
  if (element.type === 'list') return <ListElement element={element} rate={rate} />
  if (element.type === 'math') return <MathElement element={element} rate={rate} />
  if (element.type === 'diagram') return <Diagram element={element} rate={rate} />
  if (element.type === 'icon') return <IconElement element={element} rate={rate} />
  return <TextElement element={element} rate={rate} />
}

const Element = memo(function Element({ element, shown, instant, rate }) {
  const classes = [
    'lb-el', `lb-${element.type}`, `lb-c-${element.color || 'chalk'}`,
    shown && 'lb-shown', instant && 'lb-instant',
  ].filter(Boolean).join(' ')
  return <div className={classes}><Content element={element} rate={rate} /></div>
})

/** Shrinks the board's type until the whole step fits, however much is on it. */
function fitContent(content) {
  let fit = 1
  content.style.setProperty('--fit', fit)
  while (content.scrollHeight > content.clientHeight + 1 && fit > MIN_FIT) {
    fit = Math.round((fit - FIT_STEP) * 100) / 100
    content.style.setProperty('--fit', fit)
  }
}

/* ── The teacher ────────────────────────────────────────────────────────────── */

// Toby's pencil tip in the "board" pose, as a share of his avatar box (viewBox -14 -16 228 262).
// He is drawn mirrored (facing left, towards what he has written), so the tip sits
// near his left edge and his body stays to the right of the pen — in the space the
// board keeps free on its right, and over words not written yet.
const TIP_X = 1 - 223 / 228
const TIP_Y = 175 / 262

/** Where the pen is now: on the mark being drawn, `elapsed` seconds into the element. */
function penPoint(element, elapsed) {
  let current = null
  let last = 0
  for (const mark of element.querySelectorAll('[data-pen]')) {
    const at = Number(mark.dataset.at)
    const d = Number(mark.dataset.d)
    last = Math.max(last, at + d)
    if (elapsed >= at && elapsed < at + d) {
      current = { mark, progress: (elapsed - at) / d }
      break
    }
  }
  if (!current) return { done: elapsed >= last, point: null }

  const { mark, progress } = current
  if (mark instanceof SVGPathElement && mark.getTotalLength) {
    const length = mark.getTotalLength()
    const local = mark.getPointAtLength(length * progress)   // real units, whatever pathLength says
    const matrix = mark.getScreenCTM()
    if (matrix) {
      const p = new DOMPoint(local.x, local.y).matrixTransform(matrix)
      return { done: false, point: { x: p.x, y: p.y } }
    }
  }
  const box = mark.getBoundingClientRect()
  return { done: false, point: { x: box.left + box.width * progress, y: box.top + box.height * 0.78 } }
}

const TRAVEL_MS = 450      // flying from his corner to the pen, before he follows it closely

/** Toby resting in the board's bottom-right corner; `instant` puts him there without walking. */
function sendHome(board, toby, instant = false) {
  const area = board.getBoundingClientRect()
  const size = toby.getBoundingClientRect()
  const place = `translate(${area.width - size.width - area.width * 0.012}px, ${area.height - size.height - area.height * 0.01}px)`
  toby.classList.remove('lb-teacher-writing')
  if (!instant) {
    toby.style.transform = place
    return
  }
  toby.style.transition = 'none'
  toby.style.transform = place
  void toby.offsetWidth        // apply the new place before the walk comes back
  toby.style.transition = ''
}

/**
 * Moves Toby to wherever the pen is writing and back to his corner when the
 * board is quiet. Runs on its own animation frame; React only hears when he
 * starts or stops writing.
 */
function useTeacher({ boardRef, contentRef, tobyRef, count, instantUpTo, paused }) {
  const [writing, setWriting] = useState(false)
  const pausedRef = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])

  // His corner, before the first paint and whenever the board changes size.
  useLayoutEffect(() => {
    const board = boardRef.current
    const toby = tobyRef.current
    sendHome(board, toby, true)
    const observer = new ResizeObserver(() => {
      if (!toby.classList.contains('lb-teacher-busy')) sendHome(board, toby, true)
    })
    observer.observe(board)
    return () => observer.disconnect()
  }, [boardRef, tobyRef])

  useEffect(() => {
    const index = count - 1
    const board = boardRef.current
    const toby = tobyRef.current
    const element = contentRef.current?.children[index]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rest = () => {
      toby.classList.remove('lb-teacher-busy')
      sendHome(board, toby)
      setWriting(false)
    }
    if (index < 0 || index < instantUpTo || !element || reduced) {
      rest()
      return undefined
    }

    const began = performance.now()
    let start = began
    let previous = began
    let frame = 0
    setWriting(true)
    toby.classList.add('lb-teacher-busy')

    const tick = (now) => {
      if (pausedRef.current) start += now - previous
      previous = now
      const { done, point } = penPoint(element, (now - start) / 1000)
      if (done) {
        rest()
        return
      }
      if (point) {
        const area = board.getBoundingClientRect()
        const size = toby.getBoundingClientRect()
        const x = Math.min(Math.max(point.x - area.left - size.width * TIP_X, 0), area.width - size.width)
        const y = Math.min(Math.max(point.y - area.top - size.height * TIP_Y, 0), area.height - size.height)
        toby.style.transform = `translate(${x}px, ${y}px)`
        // after the flight over, follow the pen closely
        if (now - began > TRAVEL_MS) toby.classList.add('lb-teacher-writing')
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [count, instantUpTo, boardRef, contentRef, tobyRef])

  return writing
}

/**
 * The whiteboard. Every element of the step is laid out from the start and only
 * hidden, so nothing shifts as Toby writes. `key` it by step: a new step starts
 * on a clean board.
 */
/** The quiet after a question to the student: "Think!" and the seconds left. */
function ThinkBubble({ seconds }) {
  return (
    <div className="lb-think" role="status" aria-live="polite">
      <span className="lb-think-label">Think!</span>
      <span key={seconds} className="lb-think-count">{seconds}</span>
    </div>
  )
}

export default function Board({ board, count, instantUpTo, rate, paused, talking, thinking = null, children }) {
  const frameRef = useRef(null)
  const boardRef = useRef(null)
  const contentRef = useRef(null)
  const tobyRef = useRef(null)
  const writing = useTeacher({ boardRef, contentRef, tobyRef, count, instantUpTo, paused })

  useLayoutEffect(() => {
    fitContent(contentRef.current)
  }, [board])

  useEffect(() => {
    const content = contentRef.current
    let width = 0
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return
      width = entry.contentRect.width
      fitContent(content)
    })
    observer.observe(frameRef.current)
    let live = true
    document.fonts?.ready.then(() => {
      if (live) fitContent(content)
    })
    return () => {
      live = false
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={frameRef} className={`lb-frame${paused ? ' lb-paused' : ''}`}>
      <div ref={boardRef} className="lb-board">
        <div ref={contentRef} className="lb-content">
          {board.map((element, i) => (
            <Element
              key={i}
              element={element}
              shown={i < count}
              instant={i < instantUpTo}
              rate={rate}
            />
          ))}
        </div>
        <div ref={tobyRef} className="lb-teacher" aria-hidden="true">
          <div className="lb-teacher-body">
            <TobyAvatar
              className="lb-teacher-svg"
              mood={writing ? 'proud' : thinking !== null ? 'listening' : 'happy'}
              pose={writing ? 'board' : talking ? 'point' : 'rest'}
              right={writing ? 'pencil' : null}
              talking={talking && !paused}
              pokes={false}
              acc="glasses"
            />
          </div>
        </div>
        {thinking !== null && !writing && <ThinkBubble seconds={thinking} />}
        {children}
      </div>
    </div>
  )
}
