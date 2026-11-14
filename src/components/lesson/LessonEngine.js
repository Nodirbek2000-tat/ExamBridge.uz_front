import {
  buildTimeline, formatClock, locate, sentenceAt, totalSeconds, visibleCount,
} from './timeline'

// A few updates a second are plenty for a board, a slider and subtitles, and a
// timer keeps going where animation frames stop. A laptop waking up from sleep
// must not jump ahead, so one tick can only count for so much.
const TICK_MS = 200
const MAX_TICK_SECONDS = 2
const RESTART_STEP_AFTER = 2

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

/**
 * Runs one lesson. It keeps the time and tells the page only what changed, so
 * the board re-renders when an element appears and not on every tick. The
 * slider and clock are written directly for the same reason.
 *
 * With a voice the audio element is the clock; without one (not recorded yet,
 * or it failed to load) a timer takes over and the lesson carries on silently.
 *
 * `stops` are the steps that end in a question: the lesson waits there once (the
 * `gate` state) until continueLesson() is called.
 *
 * A step with `think` seconds asked the student something: once it has been said,
 * the lesson keeps quiet that long (the `thinking` state counts down) before going on.
 */
export class LessonEngine {
  constructor(steps, { startIndex = 0, stops = [] } = {}) {
    this.timeline = buildTimeline(steps)
    this.total = totalSeconds(this.timeline)
    this.stops = new Set(stops)
    this.index = clamp(startIndex, 0, Math.max(steps.length - 1, 0))
    this.local = 0
    this.rate = 1
    this.playing = false
    this.silent = false
    this.scrubbing = false
    this.pendingSeek = null
    this.timer = 0
    this.lastTick = 0
    this.audio = null
    this.nextAudio = null
    this.thinkLeft = null
    this.dom = {}
    this.listeners = new Set()
    this.state = {
      index: this.index,
      gate: null,
      count: 0,
      instantUpTo: 0,
      sentence: 0,
      playing: false,
      started: false,
      ended: false,
      rate: 1,
      buffering: false,
      audioFailed: false,
      thinking: null,
    }
  }

  subscribe = (listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.state

  update(patch) {
    if (Object.keys(patch).every((key) => patch[key] === this.state[key])) return
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  attach() {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.addEventListener('ended', this.handleEnded)
    audio.addEventListener('error', this.handleAudioError)
    audio.addEventListener('waiting', this.handleWaiting)
    audio.addEventListener('playing', this.handlePlaying)
    audio.addEventListener('loadedmetadata', this.handleMetadata)
    this.audio = audio
    this.loadAudio()
    this.paint()
  }

  destroy() {
    clearInterval(this.timer)
    this.playing = false
    const { audio } = this
    if (!audio) return
    audio.pause()
    audio.removeEventListener('ended', this.handleEnded)
    audio.removeEventListener('error', this.handleAudioError)
    audio.removeEventListener('waiting', this.handleWaiting)
    audio.removeEventListener('playing', this.handlePlaying)
    audio.removeEventListener('loadedmetadata', this.handleMetadata)
    audio.removeAttribute('src')
    this.nextAudio?.removeAttribute('src')
    this.audio = null
    this.nextAudio = null
  }

  bindDom(dom) {
    this.dom = dom
    this.paint()
  }

  // ── Audio events ──────────────────────────────────────────────────────────

  handleEnded = () => this.finishStep()

  handleAudioError = () => {
    if (this.audio?.getAttribute('src')) this.goSilent()
  }

  handleWaiting = () => this.update({ buffering: true })

  handlePlaying = () => this.update({ buffering: false })

  handleMetadata = () => {
    if (this.pendingSeek) this.audio.currentTime = this.pendingSeek
    this.pendingSeek = null
  }

  goSilent() {
    this.silent = true
    this.update({ audioFailed: true, buffering: false })
  }

  // ── Transport ─────────────────────────────────────────────────────────────

  entry() {
    return this.timeline[this.index]
  }

  isVoiced() {
    return Boolean(this.entry().step.audio) && !this.silent
  }

  play = () => {
    if (!this.timeline.length) return
    if (this.state.gate !== null) {
      this.continueLesson()
      return
    }
    if (this.state.ended) this.jump(0, 0, false)
    this.playing = true
    this.update({ playing: true, started: true, ended: false })
    this.startAudio()
    this.lastTick = performance.now()
    clearInterval(this.timer)
    this.timer = setInterval(this.tick, TICK_MS)
  }

  pause = () => {
    this.playing = false
    clearInterval(this.timer)
    this.audio?.pause()
    this.update({ playing: false, buffering: false })
  }

  toggle = () => (this.playing ? this.pause() : this.play())

  startAudio() {
    // while thinking the step has already been said: playing it again would start it over
    if (!this.isVoiced() || !this.playing || this.thinkLeft !== null) return
    this.audio.playbackRate = this.rate
    this.audio.play().catch((error) => {
      if (error.name === 'AbortError') return          // the step changed while starting
      if (error.name === 'NotAllowedError') this.pause()
      else this.goSilent()
    })
  }

  tick = () => {
    const now = performance.now()
    const elapsed = Math.min((now - this.lastTick) / 1000, MAX_TICK_SECONDS)
    this.lastTick = now

    if (this.thinkLeft !== null) {
      this.thinkLeft -= elapsed                     // real seconds, whatever the speed
      if (this.thinkLeft > 0) {
        this.update({ thinking: Math.ceil(this.thinkLeft) })
        return
      }
      this.stopThinking()
      this.advance()
      return
    }

    if (this.isVoiced()) {
      this.local = this.audio.currentTime
    } else {
      this.local += elapsed * this.rate
      if (this.local >= this.entry().seconds) {
        this.finishStep()
        return
      }
    }
    this.paint()
  }

  /** The step has been said: quiet to think if it asked the student something, then on. */
  finishStep() {
    const { step, seconds } = this.entry()
    if (step.think > 0 && this.playing) {
      this.local = seconds
      this.paint()
      this.thinkLeft = step.think
      this.update({ thinking: step.think })
      return
    }
    this.advance()
  }

  stopThinking() {
    this.thinkLeft = null
    this.update({ thinking: null })
  }

  advance() {
    // Stopping for questions or at the end: the whole board is up at once, not frozen mid-word.
    if (this.stops.delete(this.index)) {
      this.pause()
      this.local = this.entry().seconds
      this.paint()
      this.update({ gate: this.index, instantUpTo: this.state.count })
      return
    }
    if (this.index < this.timeline.length - 1) {
      this.jump(this.index + 1, 0, false)
      return
    }
    this.pause()
    this.local = this.entry().seconds
    this.paint()
    this.update({ ended: true, instantUpTo: this.state.count })
  }

  continueLesson = () => {
    this.update({ gate: null })
    this.advance()
    if (!this.state.ended) this.play()
  }

  /** Go to a step. `instant` shows what is already up without writing it again. */
  jump(index, local, instant) {
    if (this.state.gate !== null) this.stops.add(this.state.gate)    // left unanswered: ask again
    this.stopThinking()
    const changed = index !== this.index
    this.index = index
    this.local = local
    this.silent = false
    if (changed || instant) this.pendingSeek = null

    const { step, seconds } = this.entry()
    const count = visibleCount(step.board, local / seconds)
    this.update({ index, gate: null, ended: false, audioFailed: false, instantUpTo: instant ? count : 0 })
    this.loadAudio()
    this.startAudio()
    this.paint()
  }

  loadAudio() {
    const { audio } = this
    if (!audio || !this.timeline.length) return
    const url = this.entry().step.audio

    if (!url) {
      audio.pause()
      audio.removeAttribute('src')
    } else if (audio.getAttribute('src') === url) {
      if (audio.readyState > 0) audio.currentTime = this.local
      else this.pendingSeek = this.local
    } else {
      this.pendingSeek = this.local
      audio.src = url
      this.update({ buffering: this.playing })
    }

    const next = this.timeline[this.index + 1]?.step.audio
    if (next) {
      this.nextAudio = new Audio()
      this.nextAudio.preload = 'auto'
      this.nextAudio.src = next
    }
  }

  seek = (time) => {
    const { index, local } = locate(this.timeline, clamp(time, 0, this.total))
    this.jump(index, local, true)
  }

  next = () => {
    if (this.thinkLeft !== null) {
      this.stopThinking()
      this.advance()
      return
    }
    if (this.stops.has(this.index) || this.index < this.timeline.length - 1) this.advance()
  }

  previous = () => {
    const restart = this.local > RESTART_STEP_AFTER || this.index === 0
    this.jump(restart ? this.index : this.index - 1, 0, false)
  }

  setRate = (rate) => {
    this.rate = rate
    if (this.audio) this.audio.playbackRate = rate
    this.update({ rate })
  }

  setScrubbing = (scrubbing) => {
    this.scrubbing = scrubbing
  }

  // ── Output ────────────────────────────────────────────────────────────────

  paint() {
    if (!this.timeline.length) return
    const { step, start, seconds, sentences } = this.entry()
    const fraction = clamp(this.local / seconds, 0, 1)
    const now = start + fraction * seconds

    const { slider, clock } = this.dom
    if (slider && !this.scrubbing) slider.value = now
    if (clock) {
      const label = formatClock(now)
      if (clock.textContent !== label) clock.textContent = label
    }
    this.update({
      count: visibleCount(step.board, fraction),
      sentence: sentenceAt(sentences, fraction),
    })
  }
}
