import { CheckCircle2, Eye, Lightbulb, ListChecks, Trophy, Users } from 'lucide-react'

function Stat({ icon, label, value, hint, tone }) {
  const Icon = icon
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-black leading-tight text-gray-900 tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      </div>
    </div>
  )
}

const pct = (value) => (value == null ? '—' : `${value}%`)

/** How students used a lesson: opens, who started and finished it, how they answered. */
export default function LessonStats({ stats }) {
  if (!stats) return null
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">Statistics</h3>
        <p className="text-xs text-gray-400 mt-0.5">Opens are counted once per student per half hour; admins are not counted.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Eye} tone="bg-sky-50 text-sky-600" label="Times opened" value={stats.views} />
        <Stat icon={Users} tone="bg-violet-50 text-violet-600" label="Students" value={stats.students} hint="started the lesson" />
        <Stat
          icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" label="Finished" value={stats.finished}
          hint={stats.finished_pct == null ? null : `${stats.finished_pct}% of those who started`}
        />
        <Stat
          icon={ListChecks} tone="bg-amber-50 text-amber-600" label="Answers right" value={pct(stats.right_pct)}
          hint={`${stats.answers} answers`}
        />
        <Stat
          icon={Trophy} tone="bg-rose-50 text-rose-600" label="Final test right" value={pct(stats.quiz_right_pct)}
          hint={`${stats.quiz_answers} answers`}
        />
        <Stat icon={Lightbulb} tone="bg-yellow-50 text-yellow-600" label="Hints opened" value={stats.hints_used} />
      </div>
    </section>
  )
}
