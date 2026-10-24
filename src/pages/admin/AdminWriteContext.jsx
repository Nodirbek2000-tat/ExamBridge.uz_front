import { createContext, useContext } from 'react'
import { useAuthStore } from '../../store/authStore'
import { tierOf, canWrite } from './adminAccess'

/**
 * "May this admin change anything?" — levels 2 and 3 may not.
 *
 * Provided once by AdminLayout and read by any nested component, so deeply
 * nested rows (table rows, accordion groups) can hide their own delete/edit
 * buttons without every page threading a prop through.
 *
 * This is presentation only. The server refuses the same calls regardless
 * (sat/accounts/admin_access.py), so a hidden button is not the security
 * boundary — it just stops admins clicking things that would fail.
 */
const AdminWriteContext = createContext(true)

export function AdminWriteProvider({ children }) {
  const user = useAuthStore((s) => s.user)
  return (
    <AdminWriteContext.Provider value={canWrite(tierOf(user))}>
      {children}
    </AdminWriteContext.Provider>
  )
}

export function useCanWriteAdmin() {
  return useContext(AdminWriteContext)
}

/**
 * "May this admin delete tests or copy their JSON?" — only the owner.
 * Level 1 can do everything else (sat/accounts/admin_access.py refuses the
 * same DELETE / export calls on the server).
 */
export function useIsOwnerAdmin() {
  const user = useAuthStore((s) => s.user)
  return tierOf(user) === 'super'
}

/** Renders its children only for the owner (deleting tests). */
export function OwnerOnly({ children }) {
  return useIsOwnerAdmin() ? children : null
}

/** Renders its children only for admins who may change things. */
export default function WriteOnly({ children }) {
  return useCanWriteAdmin() ? children : null
}
