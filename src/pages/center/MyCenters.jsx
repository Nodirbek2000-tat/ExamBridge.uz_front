/**
 * MyCenters — shows all centers the logged-in user belongs to.
 * Accessible from the main app sidebar.
 */
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, ChevronRight, Loader2, GraduationCap, Users, Crown, ShieldCheck } from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.06 } }),
}

const ROLE_CONFIG = {
  director: { icon: Crown, color: 'text-amber-600 bg-amber-50', label: 'Director' },
  admin: { icon: ShieldCheck, color: 'text-purple-600 bg-purple-50', label: 'Admin' },
  teacher: { icon: GraduationCap, color: 'text-sky-600 bg-sky-50', label: 'Teacher' },
  student: { icon: Users, color: 'text-green-600 bg-green-50', label: 'Student' },
}

export default function MyCenters() {
  const navigate = useNavigate()

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ['my-centers'],
    queryFn: () => api.get('/centers/mine/').then(r => r.data),
  })

  return (
    <div className="max-w-lg mx-auto">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Centers</h1>
        <p className="text-sm text-gray-400 mt-0.5">O'quv Markazlarim — click to open your center panel</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-sky-400" />
        </div>
      ) : centers.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible"
          className="text-center py-20 text-gray-400">
          <Building2 size={44} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-lg">You are not in any center</p>
          <p className="text-sm mt-1">Ask your center director to add you</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {centers.map((c, i) => {
            const roleCfg = ROLE_CONFIG[c.role] || ROLE_CONFIG.student
            const RoleIcon = roleCfg.icon
            return (
              <motion.div key={c.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 cursor-pointer hover:border-sky-200 hover:shadow-md transition-all group"
                onClick={() => navigate(`/center/${c.id}/dashboard`)}
              >
                {c.logo
                  ? <img src={c.logo} alt={c.name} className="w-14 h-14 rounded-2xl object-cover border border-gray-100 flex-shrink-0" />
                  : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {c.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-lg">{c.name}</p>
                  <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleCfg.color}`}>
                    <RoleIcon size={11} />
                    {roleCfg.label}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-sky-400 transition-colors flex-shrink-0" />
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
