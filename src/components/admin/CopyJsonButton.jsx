import { useState } from 'react'
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import api from '../../api/client'

/**
 * Materialni import formatidagi JSON ko'rinishida nusxalash.
 *
 * Serverdan olingan JSON aynan import qilingan ko'rinishda bo'ladi —
 * nusxani to'g'ridan-to'g'ri qayta import qilsa bo'ladi
 * (backend: api/export_views.py).
 */

// navigator.clipboard faqat https va localhost'da ishlaydi.
// Ishlamasa eski usulga tushamiz — admin panel har xil sharoitda ochilishi mumkin.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* pastdagi zaxira usulga o'tamiz */ }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default function CopyJsonButton({ url, label = 'JSON', title = 'Import formatidagi JSON nusxasi', compact = false }) {
  const [state, setState] = useState('idle')   // idle | loading | done | error

  const handleClick = async (e) => {
    e.stopPropagation()          // qatorni ochib/yopib yubormasin
    if (state === 'loading') return
    setState('loading')
    try {
      const { data } = await api.get(url)
      const json = JSON.stringify(data?.data ?? data, null, 2)
      const ok = await copyText(json)
      setState(ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
    setTimeout(() => setState('idle'), 2200)
  }

  const icon = {
    idle: <Copy size={compact ? 13 : 14} />,
    loading: <Loader2 size={compact ? 13 : 14} className="animate-spin" />,
    done: <Check size={compact ? 13 : 14} />,
    error: <AlertCircle size={compact ? 13 : 14} />,
  }[state]

  const text = { idle: label, loading: '...', done: 'Nusxalandi', error: 'Xato' }[state]

  const tone = state === 'done'
    ? 'text-green-600 bg-green-50 border-green-200'
    : state === 'error'
      ? 'text-red-600 bg-red-50 border-red-200'
      : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border-gray-200'

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${tone}`}
    >
      {icon}
      {!compact && text}
    </button>
  )
}
