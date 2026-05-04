import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center text-center px-6">
      <div>
        <div className="text-8xl font-black text-gradient mb-4">404</div>
        <h1 className="text-2xl font-black mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="px-6 py-3 rounded-xl gradient-primary text-white font-bold shadow-glow hover:opacity-90 transition-opacity">
          Go Home
        </Link>
      </div>
    </div>
  )
}


