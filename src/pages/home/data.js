// Landing page content. Every text here comes from the previous landing page or
// from the real app (route names, game titles, study tools). Do not add user
// counts, ratings, partner logos or testimonials — none of them exist yet.
import {
  Calculator, Globe, BookOpen,
  Shield, BarChart3, Sparkles, Star,
  Zap, Brain, Target, Trophy, Layers,
  Mic, PenLine, SpellCheck, TrendingUp,
} from 'lucide-react'

export const NAV = [
  { label: 'SAT', href: '/app/sat' },
  { label: 'IELTS', href: '/app/ielts' },
  { label: 'CEFR', href: '/app/cefr' },
  { label: 'Games', href: '/games', isNew: true },
  { label: 'Study Tools', href: '/study', isNew: true },
]

export const EXAMS = [
  {
    icon: Calculator,
    name: 'SAT',
    href: '/app/sat',
    desc: 'Full-length adaptive SAT with timed Math & Reading/Writing modules.',
    skills: ['Math', 'Reading & Writing', 'Mock Tests'],
    badge: '400 – 1600',
    scale: 'sat',
  },
  {
    icon: Globe,
    name: 'IELTS',
    href: '/app/ielts',
    desc: 'Academic & General paths — AI writing scores and speaking evaluation.',
    skills: ['Reading', 'Listening', 'Speaking', 'Writing'],
    badge: 'Band 0 – 9',
    scale: 'ielts',
  },
  {
    icon: BookOpen,
    name: 'CEFR',
    href: '/app/cefr',
    desc: 'Level-based English from A1 to C2 with structured grammar practice.',
    skills: ['Grammar', 'Reading', 'A1 → C2'],
    badge: 'A1 → C2',
    scale: 'cefr',
  },
]

export const FEATURES = [
  { icon: Shield, title: 'Real Exam Mode', desc: 'Fullscreen, timed, locked-down exam simulation — just like test day.', demo: 'timer' },
  { icon: Sparkles, title: 'AI Feedback', desc: 'Writing and speaking analyzed with scores and improvement hints.', demo: 'score' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Weak areas, accuracy by topic, streaks — all in one dashboard.', demo: 'chart' },
  { icon: Star, title: 'Premium Question Bank', desc: 'Curated exam-style questions updated for serious test prep.', demo: 'stack' },
]

export const SKILLS = [
  { label: 'Reading', desc: 'Passages, inference, and timed drills.' },
  { label: 'Listening', desc: 'Authentic audio and accent exposure.' },
  { label: 'Speaking', desc: 'AI evaluation with actionable feedback.' },
  { label: 'Writing', desc: 'Band estimates and grammar insights.' },
]

export const MARQUEE_ITEMS = [
  { icon: Trophy, text: 'SAT Full Mocks' },
  { icon: Zap, text: 'AI Speaking Eval' },
  { icon: Brain, text: 'Adaptive Practice' },
  { icon: Target, text: 'IELTS Band 9 Prep' },
  { icon: Layers, text: 'CEFR A1 → C2' },
  { icon: Shield, text: 'Real Exam Mode' },
  { icon: BarChart3, text: 'Progress Tracking' },
  { icon: Star, text: 'Premium Questions' },
  { icon: Sparkles, text: 'AI Writing Scores' },
  { icon: Globe, text: 'Digital SAT 2025' },
]

export const STEPS = [
  { title: 'Choose your exam', desc: 'Pick SAT, IELTS or CEFR — each path is built for depth, not generic drills.' },
  { title: 'Take a real timed mock', desc: 'Fullscreen, timed, locked-down exam mode in the real format — just like test day.' },
  { title: 'Get AI feedback and analytics', desc: 'Scores, weak areas and accuracy by topic, with AI hints on what to fix next.' },
]

export const AI_ITEMS = [
  { icon: Mic, text: 'Speaking evaluation & fluency cues' },
  { icon: PenLine, text: 'Writing band estimate & structure tips' },
  { icon: SpellCheck, text: 'Grammar and vocabulary suggestions' },
  { icon: TrendingUp, text: 'Personalized weak-area detection' },
]

// Games that are live today (Word Battle and Runner are still marked "soon" in GamesHub)
export const GAMES = ['Toby’s Day', 'Voice Drive', 'Speaking']
export const STUDY_TOOLS = ['Articles', 'Shadowing', 'Writing Samples', 'Speaking Samples', 'Podcasts']

export const SOCIALS = {
  channel: 'https://t.me/exambridge_uz',
  support: 'https://t.me/nodirbek_shukurov1',
  instagram: 'https://www.instagram.com/exambridge.uz/',
  phone: { label: '+998 50 005 68 21', href: 'tel:+998500056821' },
}

// Hero product preview. These are illustrations, labelled "Example" in the UI.
export const PREVIEW = [
  {
    exam: 'SAT',
    section: 'Math · Module 2',
    time: 1122,
    question: 'If 3x + 7 = 22, what is the value of 2x?',
    options: ['5', '10', '15', '30'],
    answer: 1,
    score: { kind: 'number', from: 400, to: 1540, suffix: '/ 1600', label: 'Total score', pct: 0.95 },
  },
  {
    exam: 'IELTS',
    section: 'Reading · Passage 3',
    time: 1394,
    question: 'The writer claims urban gardens mainly improve air quality.',
    options: ['True', 'False', 'Not given'],
    answer: 2,
    score: { kind: 'band', from: 0, to: 8.5, suffix: 'Band', label: 'Overall band', pct: 0.94 },
  },
  {
    exam: 'CEFR',
    section: 'Grammar · B2',
    time: 845,
    question: 'By the time we arrived, the film ___.',
    options: ['has started', 'had already started', 'was starting', 'starts'],
    answer: 1,
    score: { kind: 'level', steps: ['A1', 'A2', 'B1', 'B2', 'C1'], suffix: 'Level', label: 'CEFR level', pct: 0.83 },
  },
]
