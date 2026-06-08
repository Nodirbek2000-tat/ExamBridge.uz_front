/**
 * useCenterStudent — detects the logged-in user's role in any learning center.
 *
 * Returns:
 *  - isCenterStudent   — user is a student in some center
 *  - isManagerRole     — user is director / admin / teacher in some center
 *  - managerRole       — 'director' | 'admin' | 'teacher' | null
 *  - managerCenterId   — the center id for the primary manager membership
 *  - managerCenterName — the center name
 *  - pendingCount      — pending/overdue assignments (students only)
 *  - notifCount        — unread notifications (students only)
 */
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export function useCenterStudent() {
  const user = useAuthStore((s) => s.user)

  /* ── 1. Fetch all center memberships ─────────────────────── */
  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['my-centers'],
    queryFn: () => api.get('/centers/mine/').then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  })

  const studentMembership = centers.find((c) => c.role === 'student')
  const isCenterStudent = !!studentMembership

  // First manager membership (priority: director > admin > teacher)
  const managerMembership =
    centers.find((c) => c.role === 'director') ||
    centers.find((c) => c.role === 'admin') ||
    centers.find((c) => c.role === 'teacher') ||
    null
  const isManagerRole = !!managerMembership

  /* ── 2. Fetch pending assignments (only when student) ─────── */
  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => api.get('/centers/my-assignments/').then((r) => r.data),
    enabled: isCenterStudent,
    staleTime: 0,
    refetchInterval: 20_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const pendingCount = assignments.filter(
    (a) => a.status === 'pending' || a.status === 'overdue'
  ).length

  /* ── 3. Notification count (only when student) ────────────── */
  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/centers/notifications/count/').then((r) => r.data),
    enabled: isCenterStudent,
    refetchInterval: 30_000,
  })

  return {
    isCenterStudent,
    studentCenterId: studentMembership?.id,
    studentCenterName: studentMembership?.name,
    pendingCount,
    notifCount: notifData?.unread ?? 0,
    isLoading: centersLoading,
    // Manager fields
    isManagerRole,
    managerRole: managerMembership?.role ?? null,
    managerCenterId: managerMembership?.id ?? null,
    managerCenterName: managerMembership?.name ?? null,
  }
}
