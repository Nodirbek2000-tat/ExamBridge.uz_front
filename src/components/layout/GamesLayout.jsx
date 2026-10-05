import { Outlet } from 'react-router-dom'
import LazyBoundary from '../LazyBoundary'

// Games mode: its own full-screen world — no sidebar, no top bar.
// Each game screen (hub, play, results) handles its own header/back button.
export default function GamesLayout() {
  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <LazyBoundary>
        <Outlet />
      </LazyBoundary>
    </div>
  )
}
