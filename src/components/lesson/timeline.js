/**
 * The lesson's clock maths and text parsing, free of React and the DOM.
 *
 * A step lasts as long as its recorded voice. Until a voice exists the length is
 * estimated from the words, so the same lesson plays silently with subtitles.
 */
const WORDS_PER_SECOND = 2.4
const MIN_STEP_SECONDS = 3

export function stepSeconds(step) {
  if (step.audio_seconds > 0) return step.audio_seconds
  const words = step.say.trim().split(/\s+/).length
  return Math.max(MIN_STEP_SECONDS, words / WORDS_PER_SECOND)
}

/** Sentences of a step, each with the share of the step at which it ends. */
export function splitSentences(say) {
  const parts = say.match(/[^.!?…]+[.!?…]*\s*/g) || [say]
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  let reached = 0
  return parts.map((part) => {
    reached += part.length
    return { text: part.trim(), end: reached / total }
  })
}

export function sentenceAt(sentences, fraction) {
  const found = sentences.findIndex((s) => fraction < s.end)
  return found === -1 ? sentences.length - 1 : found
}

export function buildTimeline(steps) {
  let start = 0
  return steps.map((step) => {
    const seconds = stepSeconds(step)
    const entry = { step, start, seconds, sentences: splitSentences(step.say) }
    start += seconds
    return entry
  })
}

export function totalSeconds(timeline) {
  const last = timeline[timeline.length - 1]
  return last ? last.start + last.seconds : 0
}

/** Which step a moment of the whole lesson falls in. */
export function locate(timeline, time) {
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    if (time >= timeline[i].start) {
      return { index: i, local: Math.min(time - timeline[i].start, timeline[i].seconds) }
    }
  }
  return { index: 0, local: 0 }
}

/** How many board elements are up at this share of the step. */
export function visibleCount(board, fraction) {
  const hidden = board.findIndex((element) => element.at > fraction)
  return hidden === -1 ? board.length : hidden
}

export function formatClock(seconds) {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Board text → tokens. **bold** and \( inline math \) are the only markup, and
 * everything else stays plain text, so lesson content can never inject HTML.
 */
export function parseInline(text) {
  const tokens = []
  String(text).split('**').forEach((chunk, i) => {
    const bold = i % 2 === 1
    chunk.split(/\\\((.+?)\\\)/).forEach((piece, j) => {
      if (j % 2 === 1) {
        tokens.push({ kind: 'math', value: piece, bold })
        return
      }
      for (const word of piece.match(/\s+|\S+/g) || []) {
        tokens.push(word.trim() ? { kind: 'word', value: word, bold } : { kind: 'space' })
      }
    })
  })
  return tokens
}
