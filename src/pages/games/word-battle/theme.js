/* Colours, levels and question-type names of Word Battle. */
export const ACCENT = '#5CC2FF'          // you: the polar bear
export const RIVAL = '#FF9F43'           // the opponent: the brown bear
export const OK = '#34D399'
export const BAD = '#FB7185'

export const LEVELS = ['A2', 'B1', 'B2', 'C1', 'SAT']
export const LEVEL_META = {
  A2: { title: 'Elementar', hint: 'Kundalik so‘zlar', color: '#34D399' },
  B1: { title: 'O‘rta', hint: 'Mavzuli lug‘at', color: '#5CC2FF' },
  B2: { title: 'O‘rtadan yuqori', hint: 'IELTS 6+ lug‘ati', color: '#A78BFA' },
  C1: { title: 'Yuqori', hint: 'Akademik so‘zlar', color: '#F5B14C' },
  SAT: { title: 'SAT lug‘ati', hint: 'Words in Context', color: '#FF7A8A' },
}

export const TYPE_META = {
  en_uz: { label: 'Ma’nosini toping', short: 'EN → UZ' },
  uz_en: { label: 'Inglizchasini toping', short: 'UZ → EN' },
  syn: { label: 'Ma’nodoshini toping', short: 'Sinonim' },
  ant: { label: 'Qarama-qarshisini toping', short: 'Antonim' },
  cloze: { label: 'Gapni to‘ldiring', short: 'Gap' },
  listen: { label: 'Tinglang va ma’nosini toping', short: 'Tinglash' },
}

export const POS_UZ = { noun: 'ot', verb: 'fe’l', adj: 'sifat', adv: 'ravish', phrase: 'ibora', other: '' }

export const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('ru-RU') : '—')
export const fmtSec = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`)

export function leftText(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(s / 3600)
  if (h >= 1) return `${h} soat qoldi`
  const m = Math.max(1, Math.floor(s / 60))
  return `${m} daqiqa qoldi`
}

/* [label, classes] of a duel's state for the viewer */
export function duelStatus(d) {
  if (d.status === 'done') {
    return d.result === 'me' ? ['G‘alaba', 'text-emerald-300 bg-emerald-400/10']
      : d.result === 'them' ? ['Mag‘lubiyat', 'text-rose-300 bg-rose-400/10'] : ['Durang', 'text-white/70 bg-white/[0.06]']
  }
  if (d.status === 'expired') return ['Muddati o‘tgan', 'text-white/40 bg-white/[0.04]']
  if (d.can_play) return [d.my_round_active ? 'Davom ettiring' : 'Navbatingiz', 'text-[#04121D] bg-[#5CC2FF]']
  return ['Kutilmoqda', 'text-[#FFC48A] bg-[#FF9F43]/10']
}

export function agoText(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} daqiqa oldin`
  if (s < 86400) return `${Math.round(s / 3600)} soat oldin`
  return `${Math.round(s / 86400)} kun oldin`
}
