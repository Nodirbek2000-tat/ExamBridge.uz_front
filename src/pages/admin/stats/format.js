export const SECTION_LABEL = { SAT: 'SAT', IELTS: 'IELTS', CEFR: 'CEFR', FULL: 'Full Mock' }

export function timeAgo(iso) {
  if (!iso) return '—'
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function usd(value) {
  const digits = value > 0 && value < 0.01 ? 4 : 2
  return `$${value.toFixed(digits)}`
}

export function shortDate(value) {
  const date = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
