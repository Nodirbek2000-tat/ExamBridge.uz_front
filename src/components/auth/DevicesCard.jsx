import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Laptop, Loader2, MonitorSmartphone, Smartphone } from 'lucide-react'
import api from '../../api/client'

function ago(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 5) return 'Active now'
  if (minutes < 60) return `Active ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Active ${hours} h ago`
  const days = Math.round(hours / 24)
  return `Active ${days} ${days === 1 ? 'day' : 'days'} ago`
}

/**
 * The devices signed in to this account. A student account works on two at a
 * time: signing in on a third signs out the one used longest ago. Any other
 * device can be signed out from here.
 */
export default function DevicesCard() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth-devices'],
    queryFn: () => api.get('/auth/devices/').then((r) => r.data),
  })
  const signOut = useMutation({
    mutationFn: (id) => api.delete(`/auth/devices/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth-devices'] }),
  })

  const devices = data?.devices ?? []

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30">
          <MonitorSmartphone size={16} className="text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">Signed-in devices</p>
          {data?.limit && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Your account works on {data.limit} devices at a time. Signing in on another one signs out the oldest.
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-4 flex justify-center"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
      ) : isError ? (
        <p className="px-5 py-4 text-sm text-gray-400">Could not load your devices.</p>
      ) : (
        <ul>
          {devices.map((device) => {
            const Icon = device.mobile ? Smartphone : Laptop
            return (
              <li key={device.id} className="flex items-center gap-3 px-5 py-3.5 border-b last:border-b-0 border-gray-50 dark:border-gray-700/60">
                <Icon size={18} className="shrink-0 text-gray-400 dark:text-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {device.name}
                    {device.current && (
                      <span className="ml-2 align-middle text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {device.current ? 'Active now' : ago(device.last_seen_at)}
                    {device.ip ? ` · ${device.ip}` : ''}
                  </p>
                </div>
                {!device.current && (
                  <button
                    type="button"
                    disabled={signOut.isPending}
                    onClick={() => signOut.mutate(device.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
                  >
                    Sign out
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
