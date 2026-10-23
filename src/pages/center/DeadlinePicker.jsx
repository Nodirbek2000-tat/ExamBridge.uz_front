import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

/* ── Custom Deadline Date-Time Picker ───────────────────────── */
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Mo','Tu','We','Th','Fr','Sa','Su']
const pad2 = n => String(n).padStart(2, '0')

export default function DeadlinePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const hourRef = useRef(null)
  const minRef = useRef(null)
  const secRef = useRef(null)

  const parsed = value ? (() => { const d = new Date(value); return isNaN(d) ? null : d })() : null
  const now = new Date()

  const [viewYear,  setViewYear]  = useState(() => parsed?.getFullYear() ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth()    ?? now.getMonth())
  const [selYear,   setSelYear]   = useState(() => parsed?.getFullYear() ?? null)
  const [selMonth,  setSelMonth]  = useState(() => parsed?.getMonth()    ?? null)
  const [selDay,    setSelDay]    = useState(() => parsed?.getDate()     ?? null)
  const [hour,      setHour]      = useState(() => parsed?.getHours()    ?? 23)
  const [minute,    setMinute]    = useState(() => parsed?.getMinutes()  ?? 59)
  const [second,    setSecond]    = useState(() => parsed?.getSeconds()  ?? 0)

  /* Auto-scroll to selected hour/minute/second when picker opens */
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      hourRef.current?.children[hour]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      minRef.current?.children[minute]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      secRef.current?.children[second]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 180)
    return () => clearTimeout(t)
  }, [open])

  const emit = (d, mo, y, h, m, s) => {
    if (d == null || mo == null || y == null) return
    onChange(`${y}-${pad2(mo + 1)}-${pad2(d)}T${pad2(h)}:${pad2(m)}:${pad2(s)}`)
  }

  const selectDay = (day) => {
    setSelDay(day); setSelYear(viewYear); setSelMonth(viewMonth)
    emit(day, viewMonth, viewYear, hour, minute, second)
  }

  const changeHour   = (h) => { setHour(h);   emit(selDay, selMonth, selYear, h, minute, second) }
  const changeMinute = (m) => { setMinute(m); emit(selDay, selMonth, selYear, hour, m, second)  }
  const changeSecond = (s) => { setSecond(s); emit(selDay, selMonth, selYear, hour, minute, s)  }

  const goToday = () => {
    setViewYear(now.getFullYear()); setViewMonth(now.getMonth())
    setSelYear(now.getFullYear());  setSelMonth(now.getMonth()); setSelDay(now.getDate())
    emit(now.getDate(), now.getMonth(), now.getFullYear(), hour, minute, second)
  }

  const doClear = () => { setSelDay(null); setSelYear(null); setSelMonth(null); onChange('') }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = (() => { const d = new Date(viewYear, viewMonth, 1).getDay(); return d === 0 ? 6 : d - 1 })()

  const displayStr = parsed
    ? `${pad2(parsed.getDate())} ${MONTHS_FULL[parsed.getMonth()].slice(0,3)} ${parsed.getFullYear()}  ·  ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:${pad2(parsed.getSeconds())}`
    : null

  return (
    <div>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 border rounded-xl text-sm transition-all text-left ${
          value
            ? 'border-sky-300 bg-sky-50 text-sky-700 font-semibold hover:border-sky-400'
            : 'border-gray-200 text-gray-400 hover:border-sky-300 hover:bg-gray-50'
        }`}
      >
        <Calendar size={14} className={value ? 'text-sky-500 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
        <span className="flex-1">{displayStr || 'Set deadline date & time...'}</span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={e => { e.stopPropagation(); doClear() }}
            className="text-sky-400 hover:text-red-400 transition-colors"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* ── Inline picker ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 border border-sky-100 rounded-2xl bg-white shadow-lg overflow-hidden">
              <div className="flex">

                {/* ── Calendar side ── */}
                <div className="flex-1 p-4">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={prevMonth}
                      className="w-8 h-8 rounded-xl hover:bg-sky-50 flex items-center justify-center text-gray-400 hover:text-sky-600 transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-bold text-gray-800">
                      {MONTHS_FULL[viewMonth]} {viewYear}
                    </span>
                    <button type="button" onClick={nextMonth}
                      className="w-8 h-8 rounded-xl hover:bg-sky-50 flex items-center justify-center text-gray-400 hover:text-sky-600 transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_HEADERS.map(d => (
                      <div key={d} className="h-6 flex items-center justify-center text-[10px] font-extrabold text-sky-400 uppercase">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isSel = day === selDay && viewMonth === selMonth && viewYear === selYear
                      const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
                      return (
                        <button key={day} type="button" onClick={() => selectDay(day)}
                          className={`h-8 rounded-lg text-xs font-medium transition-all ${
                            isSel
                              ? 'bg-sky-500 text-white font-bold shadow-sm shadow-sky-200'
                              : isToday
                                ? 'border-2 border-sky-300 text-sky-600 font-bold'
                                : 'hover:bg-sky-50 text-gray-700 hover:text-sky-600'
                          }`}>
                          {day}
                        </button>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={doClear}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-1">
                      Clear
                    </button>
                    <button type="button" onClick={goToday}
                      className="text-xs font-bold text-sky-500 hover:text-sky-700 transition-colors px-1">
                      Today
                    </button>
                  </div>
                </div>

                {/* ── Time picker side ── */}
                <div className="border-l border-gray-100 bg-gradient-to-b from-sky-50/40 to-white px-3 py-4 flex flex-col items-center gap-2" style={{ minWidth: 150 }}>
                  <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Time</p>

                  {/* Large selected time display */}
                  <div className="bg-sky-500 rounded-xl px-3 py-2 text-center mb-1 shadow-sm shadow-sky-200">
                    <span className="text-lg font-black text-white tabular-nums tracking-tight">
                      {pad2(hour)}<span className="opacity-60 animate-pulse">:</span>{pad2(minute)}<span className="opacity-60 animate-pulse">:</span>{pad2(second)}
                    </span>
                  </div>

                  {/* Scroll columns */}
                  <div className="flex gap-1 items-start">
                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1">HH</span>
                      <div
                        ref={hourRef}
                        className="h-36 overflow-y-auto flex flex-col gap-0.5 rounded-xl"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bae6fd transparent' }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <button key={i} type="button" onClick={() => changeHour(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                              i === hour
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'hover:bg-sky-100 text-gray-600'
                            }`}>
                            {pad2(i)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="text-gray-300 font-bold mt-9 leading-none">:</span>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1">MM</span>
                      <div
                        ref={minRef}
                        className="h-36 overflow-y-auto flex flex-col gap-0.5 rounded-xl"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bae6fd transparent' }}
                      >
                        {Array.from({ length: 60 }, (_, i) => (
                          <button key={i} type="button" onClick={() => changeMinute(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                              i === minute
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'hover:bg-sky-100 text-gray-600'
                            }`}>
                            {pad2(i)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="text-gray-300 font-bold mt-9 leading-none">:</span>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1">SS</span>
                      <div
                        ref={secRef}
                        className="h-36 overflow-y-auto flex flex-col gap-0.5 rounded-xl"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bae6fd transparent' }}
                      >
                        {Array.from({ length: 60 }, (_, i) => (
                          <button key={i} type="button" onClick={() => changeSecond(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                              i === second
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'hover:bg-sky-100 text-gray-600'
                            }`}>
                            {pad2(i)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
