import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, Clock, CheckCircle2, XCircle, Receipt, Loader2, Save, X, ChevronLeft, ChevronRight, Wallet, CalendarDays,
} from 'lucide-react'
import api from '../../api/client'
import { useCanWriteAdmin } from './AdminWriteContext'

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const STATUS = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
}

const som = (v) => `${Math.round(v || 0).toLocaleString('en-US').replace(/,/g, ' ')} so'm`
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'no end')

function Stat({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}><Icon size={14} /></span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-black tabular-nums text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ── Card and price settings ───────────────────────────────────────────────────
function SettingsCard() {
  const { data } = useQuery({
    queryKey: ['admin-payment-settings'],
    queryFn: () => api.get('/admin/payments/settings/').then((r) => r.data),
  })
  if (!data) {
    return <div className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-white" />
  }
  // Keyed by the save time, so the form starts over from what the server stored.
  return <SettingsForm key={data.updated_at || 'new'} initial={data} />
}

function SettingsForm({ initial }) {
  const canWrite = useCanWriteAdmin()
  const qc = useQueryClient()
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (payload) => api.put('/admin/payments/settings/', payload).then((r) => r.data),
    onSuccess: (d) => {
      qc.setQueryData(['admin-payment-settings'], d)
      qc.invalidateQueries({ queryKey: ['payment-plans'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })
  const errors = save.error?.response?.data || {}
  const set =(k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-gray-50'
  const field = (k, label, props = {}) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <input value={form[k] ?? ''} onChange={set(k)} disabled={!canWrite} className={input} {...props} />
      {errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>}
    </label>
  )

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(form) }}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-gray-900"><CreditCard size={17} className="text-sky-500" /> Card & prices</h2>
          <p className="mt-0.5 text-xs text-gray-500">Students see this card in the Telegram bot and transfer the plan price to it.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={!!form.accepting} onChange={set('accepting')} disabled={!canWrite} className="h-4 w-4 accent-sky-600" />
          Accepting payments
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {field('card_number', 'Card number', { inputMode: 'numeric', placeholder: '8600 1234 5678 9012' })}
        {field('card_holder', 'Card holder', { placeholder: 'Name on the card' })}
        {field('card_label', 'Card type / bank', { placeholder: 'Uzcard, Humo…' })}
        {field('price_1month', "1 month (so'm)", { inputMode: 'numeric' })}
        {field('price_3month', "3 months (so'm)", { inputMode: 'numeric' })}
      </div>

      {!form.card_number && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
          No card yet — the bot and the pricing page show “payments are paused” until you add one.
        </p>
      )}

      {canWrite && (
        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">Saved</span>}
        </div>
      )}
    </form>
  )
}

// ── Receipt viewer ────────────────────────────────────────────────────────────
function ReceiptModal({ payment, onClose }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl
    api.get(`/admin/payments/${payment.id}/receipt/`, { responseType: 'blob' })
      .then((r) => { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl) })
      .catch(() => setFailed(true))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [payment.id])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-bold text-gray-900">Receipt #{payment.id} · {som(payment.amount)}</p>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-gray-50">
          {failed && <p className="text-sm text-gray-500">Could not load the receipt.</p>}
          {!failed && !url && <Loader2 className="animate-spin text-gray-400" />}
          {url && payment.receipt_type === 'pdf' && <iframe title="Receipt" src={url} className="h-[75vh] w-full" />}
          {url && payment.receipt_type !== 'pdf' && <img src={url} alt={`Receipt ${payment.id}`} className="max-h-[75vh] w-auto object-contain" />}
        </div>
      </div>
    </div>
  )
}

// ── One payment ───────────────────────────────────────────────────────────────
function PaymentRow({ p, reasons, onView }) {
  const canWrite = useCanWriteAdmin()
  const qc = useQueryClient()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const done = () => qc.invalidateQueries({ queryKey: ['admin-payments'] })

  const approve = useMutation({ mutationFn: () => api.post(`/admin/payments/${p.id}/approve/`), onSuccess: done, onError: done })
  const reject = useMutation({ mutationFn: (r) => api.post(`/admin/payments/${p.id}/reject/`, { reason: r }), onSuccess: done, onError: done })
  const status = STATUS[p.status]
  const busy = approve.isPending || reject.isPending
  const error = approve.error || reject.error

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400">#{p.id}</span>
            <span className="font-bold text-gray-900">{p.user.name || '—'}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.className}`}>
              <status.icon size={11} /> {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {[p.user.phone, p.user.email, p.telegram?.username ? `@${p.telegram.username}` : null].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black tabular-nums text-gray-900">{som(p.amount)}</p>
          <p className="text-xs text-gray-500">{p.months === 1 ? '1 month' : `${p.months} months`} · {when(p.created_at)}</p>
        </div>
      </div>

      {p.status === 'approved' && (
        <p className="mt-3 text-xs text-gray-500">
          Approved by {p.decided_by || '—'} · {when(p.decided_at)} · Premium until <b className="text-gray-700">{day(p.premium_until)}</b>
        </p>
      )}
      {p.status === 'rejected' && (
        <p className="mt-3 text-xs text-gray-500">
          Rejected by {p.decided_by || '—'} · {when(p.decided_at)} · <span className="text-red-600">{p.reject_reason}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onView(p)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <Receipt size={14} /> View receipt
        </button>
        {canWrite && p.status === 'pending' && !rejecting && (
          <>
            <button
              onClick={() => approve.mutate()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle size={14} /> Reject
            </button>
          </>
        )}
        {canWrite && p.status === 'pending' && rejecting && (
          <>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-sky-400 focus:outline-none"
            >
              <option value="">Choose a reason…</option>
              {reasons.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <button
              onClick={() => reject.mutate(reason)}
              disabled={!reason || busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {reject.isPending && <Loader2 size={14} className="animate-spin" />} Reject payment
            </button>
            <button onClick={() => setRejecting(false)} className="px-2 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800">Cancel</button>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error.response?.data?.detail || 'Something went wrong. Refresh and try again.'}
        </p>
      )}
    </div>
  )
}

export default function AdminPayments() {
  const [tab, setTab] = useState('pending')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-payments', tab, page],
    queryFn: () => api.get('/admin/payments/', { params: { status: tab, page } }).then((r) => r.data),
    refetchInterval: tab === 'pending' ? 30_000 : false,
    placeholderData: (prev) => prev,
  })
  const { data: reasonData } = useQuery({
    queryKey: ['admin-payment-reasons'],
    queryFn: () => api.get('/admin/payments/reject-reasons/').then((r) => r.data),
    staleTime: Infinity,
  })
  const totals = data?.totals

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Card payments from the Telegram bot. Approving opens Premium and tells the student in Telegram.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Clock} label="Waiting for a check" value={totals?.pending ?? '—'} tone="bg-amber-50 text-amber-600" />
        <Stat icon={CalendarDays} label="Today" value={som(totals?.today_sum)} sub={`${totals?.today_count ?? 0} approved`} tone="bg-sky-50 text-sky-600" />
        <Stat icon={Wallet} label="This month" value={som(totals?.month_sum)} sub={`${totals?.month_count ?? 0} approved`} tone="bg-violet-50 text-violet-600" />
        <Stat icon={CheckCircle2} label="All time" value={som(totals?.total_sum)} sub={`${totals?.approved ?? 0} approved · ${totals?.rejected ?? 0} rejected`} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <SettingsCard />

      <div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1) }}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {t.key === 'pending' && totals?.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[11px] font-black text-amber-950">{totals.pending}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white" />)}
          {isError && <p className="text-sm text-red-600">Could not load payments.</p>}
          {data && data.results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              {tab === 'pending' ? 'No receipts waiting. 🎉' : 'Nothing here yet.'}
            </div>
          )}
          {data?.results.map((p) => (
            <PaymentRow key={p.id} p={p} reasons={reasonData?.reasons || []} onView={setViewing} />
          ))}
        </div>

        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((n) => n - 1)} className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="text-gray-600">Page {page} of {data.pages}</span>
            <button disabled={page >= data.pages} onClick={() => setPage((n) => n + 1)} className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {viewing && <ReceiptModal payment={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
