import { CheckCircle2 } from 'lucide-react'

/**
 * How many times a mock or a part was finished, and by how many students
 * (`done` from the admin lists: { times, students }).
 */
export default function DoneBadge({ done }) {
  if (!done) return null
  if (!done.times) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Hali ishlanmagan</span>
  }
  return (
    <span
      title={`${done.times} marta tugatilgan, ${done.students} ta o'quvchi`}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold"
    >
      <CheckCircle2 size={11} /> {done.times} marta · {done.students} o'quvchi
    </span>
  )
}
