import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'

// Exam mode: fullscreen, no sidebar, anti-cheat
export default function ExamLayout() {
  useEffect(() => {
    // Request fullscreen
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})

    // Block right-click
    const blockCtx = (e) => e.preventDefault()
    document.addEventListener('contextmenu', blockCtx)

    return () => {
      document.removeEventListener('contextmenu', blockCtx)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}
