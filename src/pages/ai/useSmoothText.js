import { useEffect, useState } from 'react'

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Types text out frame by frame. Each frame reveals a share of what is still waiting,
 * so it keeps an even pace, never lags far behind and never jumps a paragraph at once.
 */
function makeTyper(show) {
  let target = ''
  let shown = 0
  let frame = 0
  let whenDone = null

  const settle = () => {
    const done = whenDone
    whenDone = null
    done?.()
  }

  const tick = () => {
    frame = 0
    const waiting = target.length - shown
    if (waiting <= 0) {
      settle()
      return
    }
    let next = shown + Math.max(1, Math.ceil(waiting / 10))
    const code = target.charCodeAt(next - 1)
    if (code >= 0xd800 && code <= 0xdbff) next += 1        // never split an emoji in half
    shown = Math.min(next, target.length)
    show(target.slice(0, shown))
    frame = requestAnimationFrame(tick)
  }

  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }

  const flush = () => {
    stop()
    shown = target.length
    show(target)
    settle()
  }

  const run = () => {
    if (document.hidden || reducedMotion()) flush()         // frames do not run in a hidden tab
    else if (!frame) frame = requestAnimationFrame(tick)
  }

  return {
    /** Add a chunk that just arrived. */
    push(chunk) {
      target += chunk
      run()
    },
    /** Call `done` once everything that arrived is on screen. */
    finish(done) {
      whenDone = done
      run()
    },
    reset() {
      stop()
      target = ''
      shown = 0
      whenDone = null
      show('')
    },
    stop,
  }
}

/** Streamed text shown at an even pace, the way a real AI types, however unevenly it arrives. */
export default function useSmoothText() {
  const [text, setText] = useState('')
  const [typer] = useState(() => makeTyper((value) => setText(value)))
  useEffect(() => () => typer.stop(), [typer])
  return { text, push: typer.push, finish: typer.finish, reset: typer.reset }
}
