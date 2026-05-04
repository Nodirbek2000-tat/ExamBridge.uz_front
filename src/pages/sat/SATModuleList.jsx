import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Play, BookOpen, Clock, TimerOff } from 'lucide-react'
import api from '../../api/client'

const SECTION_LABELS = { ENGLISH: 'Reading & Writing', MATH: 'Math' }

function moduleTitle(mod) {
  const sectionLabel = SECTION_LABELS[mod.section] || mod.section
  const variantLabel = `M${mod.module_number}`
  return `${sectionLabel} — ${variantLabel}`
}

export default function SATModuleList() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(null)
  const [untimed, setUntimed] = useState(false)

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['sat-modules', testId],
    queryFn: () => api.get(`/sat/tests/${testId}/modules/`).then(r => r.data),
  })

  const startMutation = useMutation({
    mutationFn: (moduleId) => api.post('/sat/module/start/', { module_id: moduleId }).then(r => r.data),
    onSuccess: (data) => navigate(`/exam/sat/${data.attempt_id}${untimed ? '?untimed=1' : ''}`),
  })

  const orderedModules = useMemo(() => modules.slice().sort((a, b) =>
    (a.section === 'ENGLISH' ? 0 : 1) - (b.section === 'ENGLISH' ? 0 : 1)
    || a.module_number - b.module_number
    || String(a.difficulty_variant).localeCompare(String(b.difficulty_variant))
  ), [modules])

  useEffect(() => {
    if (!orderedModules.length) return
    const requestedId = Number(searchParams.get('module_id') || '')
    if (Number.isFinite(requestedId) && orderedModules.some((m) => m.id === requestedId)) {
      if (selectedId !== requestedId) setSelectedId(requestedId)
      return
    }
    if (!selectedId || !orderedModules.some((m) => m.id === selectedId)) {
      setSelectedId(orderedModules[0].id)
    }
  }, [orderedModules, selectedId, searchParams])

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Back */}
        <button onClick={() => navigate('/app/sat/tests')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} />
          Back to Tests
        </button>

        <div>
          <h1 className="text-2xl font-black text-gray-900">Individual Modules</h1>
          <p className="text-gray-500 text-sm mt-1">Tanlangan modul uchun faqat Start qismi ko‘rinadi.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {selectedId && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 flex items-center gap-4 flex-wrap">
                {/* Untimed toggle */}
                <button
                  type="button"
                  onClick={() => setUntimed(v => !v)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border transition-all ${
                    untimed
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {untimed ? <TimerOff size={14} /> : <Clock size={14} />}
                  {untimed ? 'Untimed (on)' : 'Untimed'}
                </button>

                <button
                  type="button"
                  onClick={() => startMutation.mutate(selectedId)}
                  disabled={startMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2f63ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d4fff] disabled:opacity-50"
                >
                  <Play size={14} />
                  Start Practice Module
                </button>
              </div>
            )}

            {modules.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
                <p>No modules available for this test</p>
              </div>
            )}
            {modules.length > 0 && !selectedId && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">Please select a module from the previous page.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
