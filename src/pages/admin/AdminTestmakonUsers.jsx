import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, ExternalLink, Search, Crown, CheckCircle2, Clock } from 'lucide-react'
import api from '../../api/client'

const TESTMAKON_URL = 'https://testmakon.uz'

export default function AdminTestmakonUsers() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['testmakon-users'],
    queryFn: () => api.get('/admin/testmakon/users/').then(r => r.data),
    refetchInterval: 60000,
  })

  const users = data?.users || []
  const filtered = search
    ? users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">TestMakon Users</h1>
              <p className="text-gray-500 text-sm">testmakon.uz foydalanuvchilari</p>
            </div>
          </div>
          <a
            href={TESTMAKON_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors"
          >
            <ExternalLink size={15} />
            TestMakon ga o'tish
          </a>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Jami', value: data?.total_users, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Premium', value: data?.premium_users, color: 'text-amber-600', bg: 'bg-amber-50', icon: Crown },
          { label: 'Bugun aktiv', value: data?.active_today, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Bu hafta', value: data?.active_week, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`${s.bg} rounded-2xl p-4`}
          >
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>
              {isLoading ? <span className="inline-block w-10 h-6 bg-gray-200 rounded animate-pulse" /> : (s.value ?? '—')}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Foydalanuvchi qidiring..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        />
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-3" />
            Yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Foydalanuvchi topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Foydalanuvchi</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">XP</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Testlar</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Premium</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Ro'yxatdan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {(u.first_name || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{u.first_name || u.username}</p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email || '—'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{u.xp_points?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-gray-600">{u.total_tests_taken || 0}</td>
                    <td className="px-4 py-3">
                      {u.is_premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          <Crown size={10} /> Premium
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.date_joined ? new Date(u.date_joined).toLocaleDateString('uz-UZ') : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
