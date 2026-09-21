import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Oldin 5 daqiqa edi: "Back to list" bosilganda yoki orqaga qaytilganda
      // eski (keshdagi) ma'lumot chiqardi va faqat brauzerni yangilagandan
      // keyin to'g'ri ko'rinardi. 0 — har sahifaga kirilganda serverdan
      // yangisi olinadi, ya'ni doim brauzerni yangilagandek.
      //
      // Imtihon sahifalari o'zlarida `staleTime: Infinity` yozgan — ular bu
      // sozlamaga bo'ysunmaydi, imtihon o'rtasida savollar qayta yuklanmaydi.
      staleTime: 0,
    },
  },
})

const faviconEl = document.querySelector("link[rel='icon']")
if (faviconEl) {
  faviconEl.setAttribute('href', '/logo2-favicon.png')
  faviconEl.setAttribute('type', 'image/png')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </HelmetProvider>
  </StrictMode>,
)
