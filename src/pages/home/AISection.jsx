import { useRef } from 'react'
import { MessageCircle, PlayCircle, Sparkles } from 'lucide-react'
import { AI_ITEMS } from './data'
import SectionHead from './SectionHead'
import { EASE, gsap, ScrollTrigger, useScrollMotion } from './motion'

// What the teacher writes on the board — split into words so they appear one by one.
const BOARD = [
  { text: 'Present perfect', className: 'text-[22px] sm:text-[26px] text-(--sky)' },
  { text: 'I have lived here since 2020.', underline: 'have lived', className: 'text-[19px] sm:text-[23px]' },
  { text: '→ started in the past, still true now', className: 'text-[15px] sm:text-[17px] text-white/70' },
]

function BoardLine({ text, underline, className }) {
  const before = underline ? text.slice(0, text.indexOf(underline)) : text
  const after = underline ? text.slice(text.indexOf(underline) + underline.length) : ''
  const words = (s) => s.split(' ').filter(Boolean).map((w, i) => (
    <span key={`${w}-${i}`} data-board-word className="inline-block">{w}&nbsp;</span>
  ))
  return (
    <p className={`eb-chalk leading-snug ${className}`}>
      {words(before)}
      {underline && (
        <span className="relative inline-block">
          {words(underline)}
          <span data-board-underline className="eb-chalk-u absolute -bottom-0.5 left-0 right-3 h-[2px] rounded-full bg-(--sky)" />
        </span>
      )}
      {words(after)}
    </p>
  )
}

export default function AISection() {
  const ref = useRef(null)

  // The board writes itself, then the tutor answers; loops gently while on screen.
  useScrollMotion(ref, (_, q) => {
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.4, defaults: { ease: EASE } })
    tl.from(q('[data-board-word]'), { opacity: 0, y: 6, duration: 0.45, stagger: 0.09 })
      .from(q('[data-board-underline]'), { scaleX: 0, duration: 0.7 }, '-=0.1')
      .from(q('[data-chat-user]'), { opacity: 0, y: 12, duration: 0.6 }, '+=0.3')
      .fromTo(q('[data-chat-typing]'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, '+=0.2')
      .to(q('[data-chat-typing]'), { opacity: 0, duration: 0.25 }, '+=1.1')
      .from(q('[data-chat-ai]'), { opacity: 0, y: 12, duration: 0.6 }, '<')
      .to(q('[data-board-content]'), { opacity: 0, duration: 0.6 }, '+=3.5')

    ScrollTrigger.create({
      trigger: q('[data-board]')[0],
      start: 'top 80%',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
    })
  })

  return (
    <section ref={ref} aria-labelledby="eb-ai-title" className="eb-dark eb-section">
      <div className="eb-container eb-grid gap-y-14">
        <div className="col-span-12 lg:col-span-5">
          <SectionHead
            id="eb-ai-title"
            eyebrow="AI-powered"
            lines={['Feedback that', 'actually teaches.']}
            lead="Speaking evaluation, writing band estimates, and personalized weak-area signals."
          />

          <ul className="mt-12 border-b border-(--line)">
            {AI_ITEMS.map((item) => (
              <li key={item.text} className="flex items-center gap-4 border-t border-(--line) py-5" data-reveal>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                  <item.icon aria-hidden="true" className="h-[18px] w-[18px] text-(--sky)" strokeWidth={1.75} />
                </span>
                <span className="text-[16px] text-white/85">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-12 lg:col-span-7 lg:col-start-6 xl:col-span-6 xl:col-start-7" data-reveal>
          <figure data-board className="rounded-[24px] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] lg:rounded-[28px]">
            <div className="flex items-center justify-between px-3 py-2.5 text-[13px] text-white/70">
              <span className="inline-flex items-center gap-2"><PlayCircle aria-hidden="true" className="h-4 w-4" /> AI video lesson</span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-(--sky)" /> Example
              </span>
            </div>

            <div data-board-content>
              <div className="eb-board flex min-h-[220px] flex-col justify-center gap-4 px-6 py-8 sm:min-h-[260px] sm:px-10">
                {BOARD.map((line) => <BoardLine key={line.text} {...line} />)}
              </div>

              {/* AI tutor chat */}
              <div className="mt-2 rounded-[20px] bg-white/[0.04] p-4 sm:p-5">
                <p className="flex items-center gap-2 text-[13px] text-white/70">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" /> AI tutor chat
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <p data-chat-user className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[14px] text-(--ink)">
                    Why not “I lived here since 2020”?
                  </p>
                  <div className="relative max-w-[90%] self-start">
                    <p data-chat-ai className="rounded-2xl rounded-bl-md bg-white/[0.08] px-4 py-2.5 text-[14px] leading-relaxed text-white/90">
                      <Sparkles aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-(--sky)" />
                      “Since 2020” describes a time that continues to now, so English uses the present perfect: <em className="not-italic text-white">I have lived here since 2020.</em>
                    </p>
                    <span data-chat-typing aria-hidden="true" className="eb-typing absolute left-0 top-0 flex h-10 items-center gap-1 rounded-2xl rounded-bl-md bg-white/[0.08] px-4 opacity-0">
                      <span /><span /><span />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="sr-only">
              Example of an AI video lesson on a board and an AI tutor chat answer about the present perfect.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
