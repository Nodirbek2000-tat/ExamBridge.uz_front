import { Outlet } from 'react-router-dom'
import LazyBoundary from '../LazyBoundary'

// Games mode: its own full-screen world — no sidebar, no top bar.
// Each game screen (hub, play, results) handles its own header/back button.
export default function GamesLayout() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      <LazyBoundary>
        <Outlet />
      </LazyBoundary>
    </div>
  )
}
