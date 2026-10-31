import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { mathHtml } from './lessonMath'
import { parseInline } from './timeline'

const CHARS_PER_SECOND = 24        // how fast the teacher writes
const MIN_WORD_SECONDS = 0.08
const MATH_SECONDS = 0.7
const STROKE_SECONDS = 0.45
const ARROW_SIZE = 12
const MIN_FIT = 0.5
const FIT_STEP = 0.08

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

function Written({ tokens }) {
  return tokens.map((token, i) => {
    if (token.kind === 'space') return ' '
    const className = `lb-w${token.bold ? ' lb-bold' : ''}`
    const style = { '--at': `${token.delay}s`, '--d': `${token.seconds}s` }
    if (token.kind === 'math') {
      return <span key={i} className={className} style={style} dangerouslySetInnerHTML={{ __html: token.html }} />
    }
    return <span key={i} className={className} style={style}>{token.value}</span>
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
      aria-label="Chizma"
    >
      {marks.map((mark, i) => {
        const className = `lb-c-${mark.color}`
        const style = { '--at': `${mark.at}s`, '--d': `${seconds}s` }
        if (mark.kind === 'label') {
          return <text key={i} x={mark.x} y={mark.y} className={`lb-fade lb-label ${className}`} style={style}>{mark.text}</text>
        }
        if (mark.kind === 'dot') {
          return <circle key={i} cx={mark.x} cy={mark.y} r={mark.r} className={`lb-fade lb-dot ${className}`} style={style} />
        }
        if (mark.kind === 'dashed') {
          return <path key={i} d={mark.d} className={`lb-fade lb-line lb-dashed ${className}`} style={style} />
        }
        return <path key={i} d={mark.d} pathLength="1" className={`lb-stroke lb-line ${className}`} style={style} />
      })}
    </svg>
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

function MathElement({ element }) {
  const html = useMemo(() => mathHtml(element.tex, true), [element])
  return <div className="lb-w lb-math" style={{ '--at': '0s', '--d': `${MATH_SECONDS}s` }} dangerouslySetInnerHTML={{ __html: html }} />
}

function Content({ element, rate }) {
  if (element.type === 'list') return <ListElement element={element} rate={rate} />
  if (element.type === 'math') return <MathElement element={element} />
  if (element.type === 'diagram') return <Diagram element={element} rate={rate} />
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

/**
 * The chalkboard. Every element of the step is laid out from the start and only
 * hidden, so nothing shifts as the teacher writes. `key` it by step: a new step
 * starts on a clean board.
 */
export default function Board({ board, count, instantUpTo, rate, paused, children }) {
  const frameRef = useRef(null)
  const contentRef = useRef(null)

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
      <div className="lb-board">
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
        {children}
      </div>
    </div>
  )
}
