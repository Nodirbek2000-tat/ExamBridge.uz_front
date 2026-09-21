import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import { useThemeStore, applyTheme } from './store/themeStore'
import { lazyWithPreload, preloadAll } from './utils/lazyWithPreload'
import LazyBoundary from './components/LazyBoundary'

// ── Darhol yuklanadigan qismlar ──────────────────────────────────────────────
// Layout'lar ilovaning karkasi — ular kechiksa sidebar/tepa panel "sakrab"
// chiqadi. LoginPage esa eng ko'p ochiladigan sahifa.
import MainLayout from './components/layout/MainLayout'
import ExamLayout from './components/layout/ExamLayout'
import GamesLayout from './components/layout/GamesLayout'
import StudyLayout from './components/layout/StudyLayout'
import LoginPage from './pages/auth/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// ── Qolgan hammasi talab bo'yicha yuklanadi ──────────────────────────────────
// Oldin 80+ sahifa bitta 2.5 MB faylga birikardi va login sahifasini ochgan
// o'quvchi ham butun admin panelni yuklab olardi. Endi har sahifa alohida.
const HomePage = lazyWithPreload(() => import('./pages/home/HomePage'))
const RegisterPage = lazyWithPreload(() => import('./pages/auth/RegisterPage'))
const OnboardingPage = lazyWithPreload(() => import('./pages/auth/OnboardingPage'))

// SAT
const SATDashboard = lazyWithPreload(() => import('./pages/sat/SATDashboard'))
const SATTestList = lazyWithPreload(() => import('./pages/sat/SATTestList'))
const SATTestAttempt = lazyWithPreload(() => import('./pages/sat/SATTestAttempt'))
const SATResult = lazyWithPreload(() => import('./pages/sat/SATResult'))
const SATPractice = lazyWithPreload(() => import('./pages/sat/SATPractice'))
const SATSavedQuestions = lazyWithPreload(() => import('./pages/sat/SATSavedQuestions'))
const SATVocab = lazyWithPreload(() => import('./pages/sat/SATVocab'))
const SATModuleList = lazyWithPreload(() => import('./pages/sat/SATModuleList'))
const SATModuleResult = lazyWithPreload(() => import('./pages/sat/SATModuleResult'))
const SATTestResults = lazyWithPreload(() => import('./pages/sat/SATTestResults'))
const SATModuleHistory = lazyWithPreload(() => import('./pages/sat/SATModuleHistory'))
const SATLeaderboard = lazyWithPreload(() => import('./pages/sat/SATLeaderboard'))

// IELTS
const IELTSDashboard = lazyWithPreload(() => import('./pages/ielts/IELTSDashboard'))
const IELTSTestList = lazyWithPreload(() => import('./pages/ielts/IELTSTestList'))
const IELTSAttempt = lazyWithPreload(() => import('./pages/ielts/IELTSAttempt'))
const IELTSReadingList = lazyWithPreload(() => import('./pages/ielts/IELTSReadingList'))
const IELTSReadingAttempt = lazyWithPreload(() => import('./pages/ielts/IELTSReadingAttempt'))
const IELTSReadingResult = lazyWithPreload(() => import('./pages/ielts/IELTSReadingResult'))
const IELTSListeningList = lazyWithPreload(() => import('./pages/ielts/IELTSListeningList'))
const IELTSListeningAttempt = lazyWithPreload(() => import('./pages/ielts/IELTSListeningAttempt'))
const IELTSListeningResult = lazyWithPreload(() => import('./pages/ielts/IELTSListeningResult'))
const IELTSHistory = lazyWithPreload(() => import('./pages/ielts/IELTSHistory'))
const IELTSWritingList = lazyWithPreload(() => import('./pages/ielts/IELTSWritingList'))
const IELTSWritingAttempt = lazyWithPreload(() => import('./pages/ielts/IELTSWritingAttempt'))
const IELTSWritingResult = lazyWithPreload(() => import('./pages/ielts/IELTSWritingResult'))
const IELTSSpeakingList = lazyWithPreload(() => import('./pages/ielts/IELTSSpeakingList'))
const IELTSSpeakingAttempt = lazyWithPreload(() => import('./pages/ielts/IELTSSpeakingAttempt'))
const IELTSSpeakingResult = lazyWithPreload(() => import('./pages/ielts/IELTSSpeakingResult'))
const IELTSSpeakingReview = lazyWithPreload(() => import('./pages/ielts/IELTSSpeakingReview'))
const IELTSWritingReview = lazyWithPreload(() => import('./pages/ielts/IELTSWritingReview'))
const IELTSTestsHub = lazyWithPreload(() => import('./pages/ielts/IELTSTestsHub'))
const BookmarksPage = lazyWithPreload(() => import('./pages/ielts/BookmarksPage'))

// CEFR
const CEFRDashboard = lazyWithPreload(() => import('./pages/cefr/CEFRDashboard'))
const CEFRTestList = lazyWithPreload(() => import('./pages/cefr/CEFRTestList'))
const CEFRReadingList = lazyWithPreload(() => import('./pages/cefr/CEFRReadingList'))
const CEFRReadingAttempt = lazyWithPreload(() => import('./pages/cefr/CEFRReadingAttempt'))
const CEFRListeningList = lazyWithPreload(() => import('./pages/cefr/CEFRListeningList'))
const CEFRListeningAttempt = lazyWithPreload(() => import('./pages/cefr/CEFRListeningAttempt'))
const CEFRReadingResult = lazyWithPreload(() => import('./pages/cefr/CEFRReadingResult'))
const CEFRListeningResult = lazyWithPreload(() => import('./pages/cefr/CEFRListeningResult'))
const CEFRHistory = lazyWithPreload(() => import('./pages/cefr/CEFRHistory'))
const CEFRSpeakingList = lazyWithPreload(() => import('./pages/cefr/CEFRSpeakingList'))
const CEFRSpeakingAttempt = lazyWithPreload(() => import('./pages/cefr/CEFRSpeakingAttempt'))
const CEFRSpeakingResult = lazyWithPreload(() => import('./pages/cefr/CEFRSpeakingResult'))
const CEFRTestsHub = lazyWithPreload(() => import('./pages/cefr/CEFRTestsHub'))

// Games
const GamesHub = lazyWithPreload(() => import('./pages/games/GamesHub'))
const ShadowingGame = lazyWithPreload(() => import('./pages/games/shadowing/ShadowingGame'))

// Study Tools
const ArticlesPage = lazyWithPreload(() => import('./pages/study/ArticlesPage'))
const WritingSamplesPage = lazyWithPreload(() => import('./pages/study/WritingSamplesPage'))
const SpeakingSamplesPage = lazyWithPreload(() => import('./pages/study/SpeakingSamplesPage'))
const PodcastsPage = lazyWithPreload(() => import('./pages/study/PodcastsPage'))
const StudyShadowingPage = lazyWithPreload(() => import('./pages/study/StudyShadowingPage'))

// AI
const AIChatPage = lazyWithPreload(() => import('./pages/ai/AIChatPage'))

// Other
const ProfilePage = lazyWithPreload(() => import('./pages/profile/ProfilePage'))
const SubscriptionPage = lazyWithPreload(() => import('./pages/subscription/SubscriptionPage'))
const UniversitiesPage = lazyWithPreload(() => import('./pages/universities/UniversitiesPage'))
const VocabularyPage = lazyWithPreload(() => import('./pages/vocabulary/VocabularyPage'))

// Admin Panel — o'quvchilarga hech qachon yuklanmaydi
const AdminLayout = lazyWithPreload(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazyWithPreload(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazyWithPreload(() => import('./pages/admin/AdminUsers'))
const AdminLeaderboard = lazyWithPreload(() => import('./pages/admin/AdminLeaderboard'))
const AdminSAT = lazyWithPreload(() => import('./pages/admin/AdminSAT'))
const AdminSATPractice = lazyWithPreload(() => import('./pages/admin/AdminSATPractice'))
const AdminSATTests = lazyWithPreload(() => import('./pages/admin/AdminSATTests'))
const AdminSATRealMock = lazyWithPreload(() => import('./pages/admin/AdminSATRealMock'))
const AdminSATVocab = lazyWithPreload(() => import('./pages/admin/AdminSATVocab'))
const AdminSATImportGuide = lazyWithPreload(() => import('./pages/admin/AdminSATImportGuide'))
const AdminSATExamDate = lazyWithPreload(() => import('./pages/admin/AdminSATExamDate'))
const AdminIELTSSection = lazyWithPreload(() => import('./pages/admin/AdminIELTSSection'))
const AdminStudyArticles = lazyWithPreload(() => import('./pages/admin/AdminStudyArticles'))
const AdminStudyWritingSamples = lazyWithPreload(() => import('./pages/admin/AdminStudyWritingSamples'))
const AdminStudyPodcasts = lazyWithPreload(() => import('./pages/admin/AdminStudyPodcasts'))
const AdminCEFR = lazyWithPreload(() => import('./pages/admin/AdminCEFR'))
const AdminCEFRSection = lazyWithPreload(() => import('./pages/admin/AdminCEFRSection'))
const AdminSystem = lazyWithPreload(() => import('./pages/admin/AdminSystem'))
const AdminAIStructures = lazyWithPreload(() => import('./pages/admin/AdminAIStructures'))
const AdminReports = lazyWithPreload(() => import('./pages/admin/AdminReports'))
const AdminTestmakonUsers = lazyWithPreload(() => import('./pages/admin/AdminTestmakonUsers'))
const AdminCenters = lazyWithPreload(() => import('./pages/admin/AdminCenters'))
const AdminCenterDetail = lazyWithPreload(() => import('./pages/admin/AdminCenterDetail'))

// Center Portal
const CenterLayout = lazyWithPreload(() => import('./pages/center/CenterLayout'))
const CenterDashboard = lazyWithPreload(() => import('./pages/center/CenterDashboard'))
const CenterMembers = lazyWithPreload(() => import('./pages/center/CenterMembers'))
const CenterGroups = lazyWithPreload(() => import('./pages/center/CenterGroups'))
const CenterTeacherDetail = lazyWithPreload(() => import('./pages/center/CenterTeacherDetail'))
const CenterGroupDetail = lazyWithPreload(() => import('./pages/center/CenterGroupDetail'))
const CenterMemberProfile = lazyWithPreload(() => import('./pages/center/CenterMemberProfile'))
const CenterAssignments = lazyWithPreload(() => import('./pages/center/CenterAssignments'))
const CenterNotifications = lazyWithPreload(() => import('./pages/center/CenterNotifications'))
const MyCenters = lazyWithPreload(() => import('./pages/center/MyCenters'))
const MyTasks = lazyWithPreload(() => import('./pages/center/MyTasks'))

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

// ── Imtihon sahifalarini oldindan yuklash ────────────────────────────────────
// Eng muhim xavfsizlik chorasi: o'quvchi test ro'yxatini ko'rib turganda
// imtihon kodi fonda allaqachon yuklab qo'yiladi. Shunda "Start" bosgan payt
// internet uzilsa ham imtihon ochiladi.
const EXAM_CHUNKS = {
  sat: [SATTestAttempt, SATResult],
  ielts: [
    IELTSAttempt, IELTSReadingAttempt, IELTSListeningAttempt,
    IELTSWritingAttempt, IELTSSpeakingAttempt,
  ],
  cefr: [CEFRReadingAttempt, CEFRListeningAttempt, CEFRSpeakingAttempt],
}

function useExamPreload(pathname) {
  useEffect(() => {
    const match = pathname.match(/^\/app\/(sat|ielts|cefr)/)
    if (!match) return
    // Brauzer bo'sh turganda yuklaydi — joriy sahifaga xalaqit bermaydi.
    // Cleanup qaytarilmaydi: preload bekor qilinmasligi kerak (lazyWithPreload.js)
    preloadAll(EXAM_CHUNKS[match[1]])
  }, [pathname])
}

export default function App() {
  const fetchUser = useAuthStore((s) => s.fetchUser)
  const user = useAuthStore((s) => s.user)
  const theme = useThemeStore((s) => s.theme)
  const location = useLocation()

  useExamPreload(location.pathname)

  // App ochilganda user ma'lumotlarini yangilash (is_staff, is_premium etc)
  useEffect(() => {
    if (user) fetchUser()
  }, [])

  // Apply dark mode class to <html> whenever theme changes
  useEffect(() => {
    applyTheme(theme)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return (
    <>
    <RouteProgressBar />
    <LazyBoundary>
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
        <Route path="ielts/skills" element={<IELTSTestsHub />} />
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
        <Route path="cefr/skills" element={<CEFRTestsHub />} />
        <Route path="cefr/tests" element={<CEFRTestList />} />
        <Route path="cefr/reading" element={<CEFRReadingList />} />
        <Route path="cefr/listening" element={<CEFRListeningList />} />
        <Route path="cefr/speaking" element={<CEFRSpeakingList />} />
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
        <Route path="my-centers" element={<MyCenters />} />
        <Route path="my-tasks" element={<MyTasks />} />
      </Route>

      {/* Games — its own full-screen world, no sidebar */}
      <Route path="/games" element={<PrivateRoute><GamesLayout /></PrivateRoute>}>
        <Route index element={<GamesHub />} />
        <Route path="shadowing" element={<ShadowingGame />} />
      </Route>

      {/* Study Tools — its own section with a dedicated top nav */}
      <Route path="/study" element={<PrivateRoute><StudyLayout /></PrivateRoute>}>
        {/* Landing straight on Articles — no separate hub screen */}
        <Route index element={<Navigate to="/study/articles" replace />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="articles/:articleId" element={<ArticlesPage />} />
        <Route path="writing-samples" element={<WritingSamplesPage />} />
        <Route path="writing-samples/:sampleId" element={<WritingSamplesPage />} />
        <Route path="speaking-samples" element={<SpeakingSamplesPage />} />
        <Route path="podcasts" element={<PodcastsPage />} />
        <Route path="podcasts/:podcastId" element={<PodcastsPage />} />
        <Route path="shadowing" element={<StudyShadowingPage />} />
        <Route path="shadowing/:trackId" element={<StudyShadowingPage />} />
      </Route>

      {/* Exam mode — fullscreen, no sidebar */}
      <Route path="/exam" element={<PrivateRoute><ExamLayout /></PrivateRoute>}>
        <Route path="sat/:attemptId" element={<SATTestAttempt />} />
        <Route path="ielts/:attemptId" element={<IELTSAttempt />} />
        <Route path="ielts/writing/result/:responseId" element={<IELTSWritingResult />} />
        <Route path="ielts/writing/result" element={<IELTSWritingResult />} />
        <Route path="ielts/writing/:attemptId" element={<IELTSWritingAttempt />} />
        <Route path="ielts/speaking/result/:responseId" element={<IELTSSpeakingResult />} />
        <Route path="ielts/speaking/result" element={<IELTSSpeakingResult />} />
        <Route path="ielts/speaking/:taskId" element={<IELTSSpeakingAttempt />} />
        <Route path="cefr/speaking/result/:responseId" element={<CEFRSpeakingResult />} />
        <Route path="cefr/speaking/result" element={<CEFRSpeakingResult />} />
        <Route path="cefr/speaking/:taskId" element={<CEFRSpeakingAttempt />} />
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
        {/* Study Tools */}
        <Route path="study">
          <Route index element={<Navigate to="/admin-panel/study/articles" replace />} />
          <Route path="articles" element={<AdminStudyArticles />} />
          <Route path="writing-samples" element={<AdminStudyWritingSamples />} />
          <Route path="shadowing" element={<AdminStudyPodcasts section="shadowing" />} />
          <Route path="podcasts" element={<AdminStudyPodcasts section="podcast" />} />
        </Route>
        <Route path="testmakon-users" element={<AdminTestmakonUsers />} />
        <Route path="centers" element={<AdminCenters />} />
        <Route path="centers/:centerId" element={<AdminCenterDetail />} />
        <Route path="system" element={<AdminSystem />} />
        <Route path="ai-structures" element={<AdminAIStructures />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      {/* Center Portal */}
      <Route path="/center/:centerId" element={<PrivateRoute><CenterLayout /></PrivateRoute>}>
        <Route path="dashboard" element={<CenterDashboard />} />
        <Route path="students" element={<CenterMembers targetRole="student" />} />
        <Route path="teachers" element={<CenterMembers targetRole="teacher" />} />
        <Route path="teachers/:teacherId" element={<CenterTeacherDetail />} />
        <Route path="admins" element={<CenterMembers targetRole="admin" />} />
        <Route path="members/:userId/profile" element={<CenterMemberProfile />} />
        <Route path="groups" element={<CenterGroups />} />
        <Route path="groups/:groupId" element={<CenterGroupDetail />} />
        <Route path="assignments" element={<CenterAssignments />} />
        <Route path="notifications" element={<CenterNotifications />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </LazyBoundary>
    </>
  )
}
