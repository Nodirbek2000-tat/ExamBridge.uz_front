/**
 * CenterMemberProfile — profile page for admin/director members.
 * Shows name, contact, photo, password (reveal/copy). Director/admin only.
 */
import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, Eye, EyeOff, Copy, Check,
  Mail, Phone, ShieldCheck, Crown, Calendar,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.05 } }),
}

const ROLE_CONFIG = {
  director: { icon: Crown,       color: 'text-amber-600 bg-amber-50',  label: 'Director' },
  admin:    { icon: ShieldCheck, color: 'text-purple-600 bg-purple-50', label: 'Admin' },
  teacher:  { icon: ShieldCheck, color: 'text-sky-600 bg-sky-50',       label: 'Teacher' },
}

function PasswordReveal({ value }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!value) {
    return (
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-400 italic">
        No password saved (account was created before this feature)
      </div>
    )
  }

  const copy = () => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</p>
      <div className="flex items-center gap-3">
        <code className="flex-1 text-sm font-mono text-gray-800 bg-white border border-gray-200 px-3 py-2 rounded-lg">
          {show ? value : '•'.repeat(Math.min(value.length, 14))}
        </code>
        <button type="button" onClick={() => setShow(s => !s)}
          className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-sky-500 transition-colors"
          title={show ? 'Hide' : 'Show'}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button type="button" onClick={copy}
          className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-sky-500 transition-colors"
          title="Copy">
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function CenterMemberProfile() {
  const { centerId, userId } = useParams()
  const navigate = useNavigate()
  const { myRole } = useOutletContext()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['member-profile', centerId, userId],
    queryFn: () => api.get(`/centers/${centerId}/members/${userId}/profile/`).then(r => r.data),
  })

  if (myRole && !['director', 'admin'].includes(myRole)) {
    return <div className="text-center py-20 text-gray-400">Access denied.</div>
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-400" size={28} /></div>
  }
  if (isError || !data) {
    return <div className="text-center py-20 text-gray-400">Member not found.</div>
  }

  const roleCfg = ROLE_CONFIG[data.role] || ROLE_CONFIG.admin
  const RoleIcon = roleCfg.icon

  return (
    <div className="max-w-lg">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-sky-600 mb-5 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Profile card */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          {data.avatar
            ? <img src={data.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover border border-gray-100 flex-shrink-0" />
            : <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-3xl flex-shrink-0 ${roleCfg.color}`}>
                {data.full_name?.[0]?.toUpperCase() || '?'}
              </div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{data.full_name}</h1>
            <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleCfg.color}`}>
              <RoleIcon size={12} /> {roleCfg.label}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Mail size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-medium">Email</p>
              <p className="text-sm font-semibold text-gray-800">{data.email}</p>
            </div>
          </div>
          {data.phone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Phone size={16} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Phone</p>
                <p className="text-sm font-semibold text-gray-800">{data.phone}</p>
              </div>
            </div>
          )}
          {data.joined_at && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Joined</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(data.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Password section */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Login Credentials</h3>
        <div className="mb-3 p-3 rounded-xl bg-gray-50 text-sm text-gray-600">
          <span className="font-medium">Email: </span>{data.email}
        </div>
        <PasswordReveal value={data.password} />
      </motion.div>
    </div>
  )
}
