import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Save, Users, Loader2, Search, Edit2, Check, X, UsersRound } from 'lucide-react'
import api from '../../api/client'

const MONTHS = [
  { num: '01', name: 'January' }, { num: '02', name: 'February' }, { num: '03', name: 'March' },
  { num: '04', name: 'April' }, { num: '05', name: 'May' }, { num: '06', name: 'June' },
  { num: '07', name: 'July' }, { num: '08', name: 'August' }, { num: '09', name: 'September' },
  { num: '10', name: 'October' }, { num: '11', name: 'November' }, { num: '12', name: 'December' },
]
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

function formatDate(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

export default function AdminSATExamDate() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Bulk date state (Year + Month + Day)
  const today = new Date()
  const yearOptions = [today.getFullYear(), today.getFullYear() + 1, today.getFullYear() + 2]
  const [bulkYear, setBulkYear] = useState(today.getFullYear())
  const [bulkMonth, setBulkMonth] = useState('')
  const [bulkDay, setBulkDay] = useState('')

  // Per-user inline edit state: { [userId]: { year, month, day } }
  const [editingId, setEditingId] = useState(null)
  const [editState, setEditState] = useState({})

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users/').then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, date }) =>
      api.post(`/admin/users/${userId}/exam-date/`, { exam_date: date }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditingId(null)
    },
  })

  const [applyAllDone, setApplyAllDone] = useState(false)
  const [applyingAll, setApplyingAll] = useState(false)

  const filteredUsers = (users || []).filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase())
  )

  const buildDate = (year, month, day) => {
    if (!year || !month || !day) return null
    return `${year}-${month}-${day}`
  }

  const handleBulkApply = (userId) => {
    const date = buildDate(bulkYear, bulkMonth, bulkDay)
    if (!date) return
    updateMutation.mutate({ userId, date })
  }

  const handleApplyAll = async () => {
    const date = buildDate(bulkYear, bulkMonth, bulkDay)
    if (!date || !users?.length) return
    setApplyingAll(true)
    setApplyAllDone(false)
    try {
      for (const u of users) {
        await api.post(`/admin/users/${u.id}/exam-date/`, { exam_date: date })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setApplyAllDone(true)
      setTimeout(() => setApplyAllDone(false), 3000)
    } finally {
      setApplyingAll(false)
    }
  }

  const startEdit = (user) => {
    const cur = user.sat_exam_date || user.stats?.sat_exam_date || ''
    // parse YYYY-MM-DD
    const parts = cur ? cur.split('-') : []
    setEditState({
      year: parts[0] ? Number(parts[0]) : bulkYear,
      month: parts[1] || '',
      day: parts[2] || '',
    })
    setEditingId(user.id)
  }

  const saveEdit = (userId) => {
    const date = buildDate(editState.year, editState.month, editState.day)
    if (!date) return
    updateMutation.mutate({ userId, date })
  }

  const canBulkApply = bulkMonth && bulkDay

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-sm">
          <CalendarDays size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">SAT Exam Dates</h1>
          <p className="text-sm text-gray-500">View and manage user SAT exam dates</p>
        </div>
      </div>

      {/* Bulk date picker */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-black text-gray-900 mb-1">Bulk exam date</h2>
        <p className="text-sm text-gray-500 mb-4">Select a date, then click "Apply" next to any user.</p>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Year */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Year</label>
            <select value={bulkYear} onChange={(e) => setBulkYear(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Month */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Month</label>
            <select value={bulkMonth} onChange={(e) => setBulkMonth(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 w-36">
              <option value="">— Month —</option>
              {MONTHS.map((m) => <option key={m.num} value={m.num}>{m.name}</option>)}
            </select>
          </div>
          {/* Day */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Day</label>
            <select value={bulkDay} onChange={(e) => setBulkDay(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 w-24">
              <option value="">— Day —</option>
              {DAYS.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
            </select>
          </div>
        </div>
        {canBulkApply && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-sky-700">{Number(bulkDay)} {MONTHS.find(m => m.num === bulkMonth)?.name} {bulkYear}</span>
              {' '}— click <strong>Apply</strong> next to each user, or:
            </p>
            <button
              onClick={handleApplyAll}
              disabled={applyingAll || !users?.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition disabled:opacity-50"
            >
              {applyingAll
                ? <><Loader2 size={14} className="animate-spin" /> Setting for all...</>
                : applyAllDone
                  ? <><Check size={14} /> Done! ({users?.length} users)</>
                  : <><UsersRound size={14} /> Set for All Users ({users?.length})</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Users size={16} className="text-gray-400" />
          <h2 className="font-black text-gray-900">All Users</h2>
          <div className="ml-auto relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
              className="h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 w-48" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredUsers.map((user) => {
              const currentDate = user.sat_exam_date || user.stats?.sat_exam_date || null
              const isEditing = editingId === user.id
              const isSaving = updateMutation.isPending && updateMutation.variables?.userId === user.id

              return (
                <div key={user.id} className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-sky-600">
                        {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.first_name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Current date display */}
                      <span className="text-xs min-w-[80px] text-right">
                        {currentDate ? (
                          <span className="text-sky-600 font-semibold">{formatDate(currentDate)}</span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </span>

                      {/* Edit button */}
                      {!isEditing && (
                        <>
                          <button onClick={() => startEdit(user)}
                            className="h-8 w-8 rounded-lg border border-gray-200 text-gray-400 hover:text-sky-600 hover:border-sky-300 flex items-center justify-center transition"
                            title="Edit date">
                            <Edit2 size={13} />
                          </button>
                          {canBulkApply && (
                            <button
                              onClick={() => handleBulkApply(user.id)}
                              disabled={isSaving}
                              className="h-8 px-3 rounded-lg bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition disabled:opacity-50 flex items-center gap-1">
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Apply
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="mt-3 ml-12 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Year</label>
                        <select value={editState.year} onChange={(e) => setEditState(s => ({ ...s, year: Number(e.target.value) }))}
                          className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-sky-400">
                          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Month</label>
                        <select value={editState.month} onChange={(e) => setEditState(s => ({ ...s, month: e.target.value }))}
                          className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-sky-400 w-28">
                          <option value="">—</option>
                          {MONTHS.map((m) => <option key={m.num} value={m.num}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Day</label>
                        <select value={editState.day} onChange={(e) => setEditState(s => ({ ...s, day: e.target.value }))}
                          className="h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-sky-400 w-16">
                          <option value="">—</option>
                          {DAYS.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
                        </select>
                      </div>
                      <button onClick={() => saveEdit(user.id)}
                        disabled={isSaving || !editState.month || !editState.day}
                        className="h-8 px-3 rounded-lg bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 disabled:opacity-50 flex items-center gap-1 transition">
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="h-8 px-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 flex items-center transition">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {filteredUsers.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">No users found</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
