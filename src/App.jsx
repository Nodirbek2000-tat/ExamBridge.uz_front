import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'

// Layouts
import MainLayout from './components/layout/MainLayout'
import ExamLayout from './components/layout/ExamLayout'

// Pages
import HomePage from './pages/home/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OnboardingPage from './pages/auth/OnboardingPage'

// SAT
import SATDashboard from './pages/sat/SATDashboard'
import SATTestList from './pages/sat/SATTestList'
import SATTestAttempt from './pages/sat/SATTestAttempt'
import SATResult from './pages/sat/SATResult'
import SATPractice from './pages/sat/SATPractice'
import SATSavedQuestions from './pages/sat/SATSavedQuestions'
import SATVocab from './pages/sat/SATVocab'
import SATModuleList from './pages/sat/SATModuleList'
import SATModuleResult from './pages/sat/SATModuleResult'
import SATTestResults from './pages/sat/SATTestResults'
import SATModuleHistory from './pages/sat/SATModuleHistory'
import SATLeaderboard from './pages/sat/SATLeaderboard'

// IELTS
import IELTSDashboard from './pages/ielts/IELTSDashboard'
import IELTSTestList from './pages/ielts/IELTSTestList'
import IELTSAttempt from './pages/ielts/IELTSAttempt'
import IELTSReadingList from './pages/ielts/IELTSReadingList'
import IELTSReadingAttempt from './pages/ielts/IELTSReadingAttempt'
import IELTSReadingResult from './pages/ielts/IELTSReadingResult'
import IELTSListeningList from './pages/ielts/IELTSListeningList'
import IELTSListeningAttempt from './pages/ielts/IELTSListeningAttempt'
import IELTSListeningResult from './pages/ielts/IELTSListeningResult'
import IELTSHistory from './pages/ielts/IELTSHistory'
import IELTSWritingList from './pages/ielts/IELTSWritingList'
import IELTSWritingAttempt from './pages/ielts/IELTSWritingAttempt'
import IELTSWritingResult from './pages/ielts/IELTSWritingResult'
import IELTSSpeakingList from './pages/ielts/IELTSSpeakingList'
import IELTSSpeakingAttempt from './pages/ielts/IELTSSpeakingAttempt'
import IELTSSpeakingResult from './pages/ielts/IELTSSpeakingResult'
import IELTSSpeakingReview from './pages/ielts/IELTSSpeakingReview'
import IELTSWritingReview from './pages/ielts/IELTSWritingReview'
import BookmarksPage from './pages/ielts/BookmarksPage'

// CEFR
import CEFRDashboard from './pages/cefr/CEFRDashboard'
import CEFRTestList from './pages/cefr/CEFRTestList'
import CEFRReadingList from './pages/cefr/CEFRReadingList'
import CEFRReadingAttempt from './pages/cefr/CEFRReadingAttempt'
import CEFRListeningList from './pages/cefr/CEFRListeningList'
import CEFRListeningAttempt from './pages/cefr/CEFRListeningAttempt'
import CEFRReadingResult from './pages/cefr/CEFRReadingResult'
import CEFRListeningResult from './pages/cefr/CEFRListeningResult'
import CEFRHistory from './pages/cefr/CEFRHistory'

// AI
import AIChatPage from './pages/ai/AIChatPage'

// Other
import ProfilePage from './pages/profile/ProfilePage'
import SubscriptionPage from './pages/subscription/SubscriptionPage'
import UniversitiesPage from './pages/universities/UniversitiesPage'
import VocabularyPage from './pages/vocabulary/VocabularyPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin Panel
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminLeaderboard from './pages/admin/AdminLeaderboard'
import AdminSAT from './pages/admin/AdminSAT'
import AdminSATPractice from './pages/admin/AdminSATPractice'
import AdminSATTests from './pages/admin/AdminSATTests'
import AdminSATRealMock from './pages/admin/AdminSATRealMock'
import AdminSATVocab from './pages/admin/AdminSATVocab'
import AdminSATImportGuide from './pages/admin/AdminSATImportGuide'
import AdminSATExamDate from './pages/admin/AdminSATExamDate'
import AdminIELTSSection from './pages/admin/AdminIELTSSection'
import AdminCEFR from './pages/admin/AdminCEFR'
import AdminCEFRSection from './pages/admin/AdminCEFRSection'
import AdminSystem from './pages/admin/AdminSystem'
import AdminAIStructures from './pages/admin/AdminAIStructures'
import AdminReports from './pages/admin/AdminReports'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_staff) return <Navigate to="/app" replace />
  return children
}

// ── Global top progress bar — fires on every route change ─────────────────
function RouteProgressBar() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 700)
    return () => clearTimeout(timerRef.current)
  }, [location.pathname, location.search])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={location.key}
          className="fixed top-0 left-0 z-[9999] h-[4px] bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-700 rounded-r-full pointer-events-none"
          initial={{ width: '0%', opacity: 1 }}
          animate={{ width: '90%', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}
          exit={{ width: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
        />
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const fetchUser = useAuthStore((s) => s.fetchUser)
  const user = useAuthStore((s) => s.user)

  // App ochilganda user ma'lumotlarini yangilash (is_staff, is_premium etc)
  useEffect(() => {
    if (user) fetchUser()
  }, [])

  return (
    <>
    <RouteProgressBar />
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />

      {/* App — with sidebar */}
      <Route path="/app" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/app/sat" replace />} />

        {/* SAT */}
        <Route path="sat" element={<SATDashboard />} />
        <Route path="sat/tests" element={<SATTestList />} />
        <Route path="sat/result/:id" element={<SATResult />} />
        <Route path="sat/practice" element={<SATPractice />} />
        <Route path="sat/saved" element={<SATSavedQuestions />} />
        <Route path="sat/vocab" element={<SATVocab />} />
        <Route path="sat/modules/:testId" element={<SATModuleList />} />
        <Route path="sat/module-result/:attemptId" element={<SATModuleResult />} />
        <Route path="sat/tests/:testId/results" element={<SATTestResults />} />
        <Route path="sat/modules/:testId/history" element={<SATModuleHistory />} />
        <Route path="sat/leaderboard" element={<SATLeaderboard />} />

        {/* IELTS */}
        <Route path="ielts" element={<IELTSDashboard />} />
        <Route path="ielts/tests" element={<IELTSTestList />} />
        <Route path="ielts/reading" element={<IELTSReadingList />} />
        <Route path="ielts/listening" element={<IELTSListeningList />} />
        <Route path="ielts/history" element={<IELTSHistory />} />
        <Route path="ielts/writing" element={<IELTSWritingList />} />
        <Route path="ielts/writing/review/:responseId" element={<IELTSWritingReview />} />
        <Route path="ielts/speaking" element={<IELTSSpeakingList />} />
        <Route path="ielts/speaking/review/:responseId" element={<IELTSSpeakingReview />} />
        <Route path="bookmarks" element={<BookmarksPage />} />

        {/* CEFR */}
        <Route path="cefr" element={<CEFRDashboard />} />
        <Route path="cefr/tests" element={<CEFRTestList />} />
        <Route path="cefr/reading" element={<CEFRReadingList />} />
        <Route path="cefr/listening" element={<CEFRListeningList />} />
        <Route path="cefr/speaking" element={<CEFRTestList />} />
        <Route path="cefr/writing" element={<CEFRTestList />} />
        <Route path="cefr/history" element={<CEFRHistory />} />

        {/* AI Tutor */}
        <Route path="ai" element={<AIChatPage />} />
        <Route path="ai/sat" element={<AIChatPage />} />
        <Route path="ai/ielts" element={<AIChatPage />} />
        <Route path="ai/cefr" element={<AIChatPage />} />

        {/* Other */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="universities" element={<UniversitiesPage />} />
        <Route path="vocabulary" element={<VocabularyPage />} />
      </Route>

      {/* Exam mode — fullscreen, no sidebar */}
      <Route path="/exam" element={<PrivateRoute><ExamLayout /></PrivateRoute>}>
        <Route path="sat/:attemptId" element={<SATTestAttempt />} />
        <Route path="ielts/:attemptId" element={<IELTSAttempt />} />
        <Route path="ielts/writing/result" element={<IELTSWritingResult />} />
        <Route path="ielts/writing/:attemptId" element={<IELTSWritingAttempt />} />
        <Route path="ielts/speaking/result" element={<IELTSSpeakingResult />} />
        <Route path="ielts/speaking/:taskId" element={<IELTSSpeakingAttempt />} />
        <Route path="ielts/reading/:attemptId" element={<IELTSReadingAttempt />} />
        <Route path="ielts/reading/:attemptId/result" element={<IELTSReadingResult />} />
        <Route path="ielts/listening/:attemptId" element={<IELTSListeningAttempt />} />
        <Route path="ielts/listening/:attemptId/result" element={<IELTSListeningResult />} />
        <Route path="cefr/reading/:attemptId" element={<CEFRReadingAttempt />} />
        <Route path="cefr/reading/:attemptId/result" element={<CEFRReadingResult />} />
        <Route path="cefr/listening/:attemptId" element={<CEFRListeningAttempt />} />
        <Route path="cefr/listening/:attemptId/result" element={<CEFRListeningResult />} />
      </Route>

      {/* Admin Panel */}
      <Route path="/admin-panel" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="leaderboard" element={<AdminLeaderboard />} />
        {/* SAT sub-pages */}
        <Route path="sat">
          <Route index element={<Navigate to="/admin-panel/sat/practice" replace />} />
          <Route path="practice" element={<AdminSATPractice />} />
          <Route path="tests" element={<AdminSATTests />} />
          <Route path="real-mock" element={<AdminSATRealMock />} />
          <Route path="vocab" element={<AdminSATVocab />} />
          <Route path="exam-date" element={<AdminSATExamDate />} />
          <Route path="import-guide" element={<AdminSATImportGuide />} />
          <Route path="legacy" element={<AdminSAT />} />
        </Route>
        {/* IELTS — each skill is its own page */}
        <Route path="ielts">
          <Route index element={<Navigate to="/admin-panel/ielts/reading" replace />} />
          <Route path="reading"   element={<AdminIELTSSection section="reading" />} />
          <Route path="listening" element={<AdminIELTSSection section="listening" />} />
          <Route path="speaking"  element={<AdminIELTSSection section="speaking" />} />
          <Route path="writing"   element={<AdminIELTSSection section="writing" />} />
          <Route path="tests"     element={<AdminIELTSSection section="tests" />} />
        </Route>
        {/* CEFR */}
        <Route path="cefr">
          <Route index element={<Navigate to="/admin-panel/cefr/reading" replace />} />
          <Route path="reading"   element={<AdminCEFRSection section="reading" />} />
          <Route path="listening" element={<AdminCEFRSection section="listening" />} />
          <Route path="grammar"   element={<AdminCEFRSection section="grammar" />} />
          <Route path="all"       element={<AdminCEFR />} />
        </Route>
        <Route path="system" element={<AdminSystem />} />
        <Route path="ai-structures" element={<AdminAIStructures />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  )
}
