import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  XCircle,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  Play,
  Lightbulb,
  Sigma,
  FlaskConical,
  LayoutGrid,
  Flag,
  MoreHorizontal,
  Eye,
  EyeOff,
  FileText,
  SlidersHorizontal,
  Strikethrough,
  ListChecks,
  GripVertical,
} from 'lucide-react';
import api from '../../api/client';
import { InlineMath, BlockMath } from 'react-katex';
import rasm1 from '../../assets/rasm1.png';
import rasm2 from '../../assets/rasm2.png';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// ── Subject / Category config ────────────────────────────────────────────
const SUBJECTS = {
  math: {
    label: 'Math',
    subject: 'Matematika',
    icon: Calculator,
    color: 'orange',
    categories: [
      { key: 'algebra', label: 'Algebra' },
      { key: 'advanced_math', label: 'Advanced Math' },
      { key: 'problem_data', label: 'Problem-Solving & Data Analysis' },
      { key: 'geometry', label: 'Geometry & Trigonometry' },
      { key: '', label: 'All Math' },
    ],
  },
  english: {
    label: 'English',
    subject: 'Ingliz tili',
    icon: BookOpen,
    color: 'amber',
    categories: [
      { key: 'craft_structure', label: 'Craft & Structure' },
      { key: 'expression_ideas', label: 'Expression of Ideas' },
      { key: 'info_ideas', label: 'Information & Ideas' },
      { key: 'standard_english', label: 'Standard English Conventions' },
      { key: '', label: 'All English' },
    ],
  },
};

const DIFFICULTIES = [
  { key: '', label: 'All' },
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const DOMAIN_LABELS = {
  algebra: 'Algebra',
  advanced_math: 'Advanced Math',
  problem_data: 'Problem-Solving & Data Analysis',
  geometry: 'Geometry & Trigonometry',
  craft_structure: 'Craft & Structure',
  expression_ideas: 'Expression of Ideas',
  info_ideas: 'Information & Ideas',
  standard_english: 'Standard English Conventions',
};

const TOPIC_TIME_KEY = 'sat-topic-time-v1';
const PASSAGE_SPLIT_PCT_KEY = 'sat-practice-passage-split-pct-v1';

function readPassageSplitPct() {
  try {
    const v = parseFloat(localStorage.getItem(PASSAGE_SPLIT_PCT_KEY) || '');
    if (Number.isFinite(v)) return Math.min(72, Math.max(28, v));
  } catch {
    /* */
  }
  return 50;
}

function readTopicSecondsMap() {
  try {
    const raw = localStorage.getItem(TOPIC_TIME_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function bumpTopicTime(subject, category, topic, deltaSec) {
  if (!topic) return;
  const k = `${subject}|${category}|${topic}`;
  const map = readTopicSecondsMap();
  map[k] = (map[k] || 0) + deltaSec;
  try {
    localStorage.setItem(TOPIC_TIME_KEY, JSON.stringify(map));
  } catch {
    /* */
  }
}

function formatShortDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatMmSs(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Per-question max-time tracking ───────────────────────────────────────
const Q_MAX_TIME_KEY = 'sat-q-maxtime-v1';
function readQMaxTimeMap() {
  try {
    return JSON.parse(localStorage.getItem(Q_MAX_TIME_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveQMaxTime(qId, sec) {
  if (!qId || sec <= 0) return;
  const map = readQMaxTimeMap();
  if ((map[qId] || 0) < sec) {
    map[qId] = sec;
    try {
      localStorage.setItem(Q_MAX_TIME_KEY, JSON.stringify(map));
    } catch {}
  }
}
function getQMaxTime(map, qId) {
  return map?.[qId] || 0;
}

// ── Top Loading Bar (NProgress-style) ────────────────────────────────────
function TopProgressBar({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="top-progress"
          className="fixed top-0 left-0 z-[9999] h-[3px] bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 rounded-r-full"
          initial={{ width: '5%', opacity: 1 }}
          animate={{ width: '88%', transition: { duration: 1.8, ease: [0.4, 0, 0.2, 1] } }}
          exit={{ width: '100%', opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
        />
      )}
    </AnimatePresence>
  );
}

function TopicProgressRing({
  pct,
  accent = '#22c55e',
  pctClass = 'fill-emerald-500',
}) {
  const r = 33;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - p / 100);
  return (
    <svg width="88" height="88" viewBox="0 0 100 100" className="flex-shrink-0">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#d1d5db"
        strokeWidth="10"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        className={pctClass}
        fontSize="18"
        fontWeight="800"
        style={{ filter: 'drop-shadow(0 1px 0 rgba(253, 186, 116, 0.45))' }}
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}

function TopicStatBadge({ variant, children }) {
  const cls =
    variant === 'ok'
      ? 'bg-emerald-500 text-white shadow-[0_3px_0_0_#047857] active:shadow-[0_2px_0_0_#047857]'
      : 'bg-red-500 text-white shadow-[0_3px_0_0_#991b1b] active:shadow-[0_2px_0_0_#991b1b]';
  return (
    <span
      className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform active:translate-y-px ${cls}`}
    >
      {children}
    </span>
  );
}

// ── LaTeX renderer ───────────────────────────────────────────────────────
function LatexText({ text }) {
  if (!text) return null;
  const parts = [];
  let i = 0;
  const re =
    /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span
          key={i++}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(text.slice(lastIndex, match.index)),
          }}
        />
      );
    }
    const raw = match[0];
    try {
      if (raw.startsWith('\\[') || raw.startsWith('$$')) {
        const inner = raw.startsWith('\\[')
          ? raw.slice(2, -2)
          : raw.slice(2, -2);
        parts.push(<BlockMath key={i++} math={inner.trim()} />);
      } else {
        const inner = raw.startsWith('\\(')
          ? raw.slice(2, -2)
          : raw.slice(1, -1);
        parts.push(<InlineMath key={i++} math={inner.trim()} />);
      }
    } catch {
      parts.push(<span key={i++}>{raw}</span>);
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push(
      <span
        key={i++}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.slice(lastIndex)) }}
      />
    );
  }
  return <>{parts}</>;
}

// ── Desmos Calculator ────────────────────────────────────────────────────
const DESMOS_API_KEY =
  import.meta.env.VITE_DESMOS_API_KEY || 'dcb31709b452b1cf9dc26972add0fda6';
const DESMOS_URL = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${DESMOS_API_KEY}`;

function DesmosCalc({ open, onClose }) {
  const containerRef = useRef(null);
  const calcRef = useRef(null);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, window.innerWidth - 660),
    y: 60,
  }));
  const [size, setSize] = useState({ w: 620, h: 430 });

  useEffect(() => {
    if (document.querySelector('script[src*="desmos.com/api"]')) return;
    const s = document.createElement('script');
    s.src = DESMOS_URL;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!open) {
      if (calcRef.current) {
        try {
          calcRef.current.destroy();
        } catch {}
        calcRef.current = null;
      }
      return;
    }
    const tryInit = () => {
      if (window.Desmos && containerRef.current && !calcRef.current) {
        calcRef.current = window.Desmos.GraphingCalculator(
          containerRef.current,
          {
            keypad: true,
            expressions: true,
            settingsMenu: true,
            zoomButtons: true,
            border: false,
          }
        );
      }
    };
    if (window.Desmos) {
      tryInit();
    } else {
      const id = setInterval(() => {
        if (window.Desmos) {
          clearInterval(id);
          tryInit();
        }
      }, 100);
      return () => clearInterval(id);
    }
  }, [open]);

  useEffect(() => {
    if (calcRef.current && open) {
      try {
        calcRef.current.resize();
      } catch {}
    }
  }, [size, open]);

  const onMouseDown = useCallback(
    (e) => {
      if (e.target.closest('button')) return;
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initX: pos.x,
        initY: pos.y,
      };
      e.preventDefault();
    },
    [pos]
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      setPos({
        x: Math.max(
          0,
          Math.min(
            window.innerWidth - size.w,
            dragRef.current.initX + e.clientX - dragRef.current.startX
          )
        ),
        y: Math.max(
          0,
          Math.min(
            window.innerHeight - 60,
            dragRef.current.initY + e.clientY - dragRef.current.startY
          )
        ),
      });
    };
    const onUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [size.w]);

  if (!open) return null;

  if (isMobile) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[400] bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{ height: '50vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Calculator size={15} className="text-sky-500" /> Calculator
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      </motion.div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        zIndex: 9999,
        userSelect: 'none',
      }}
      className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col bg-white"
    >
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white cursor-move select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-sky-400" />
          <span className="text-xs font-bold tracking-wide">
            Desmos Graphing Calculator
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[
            ['Small', { w: 480, h: 360 }],
            ['Medium', { w: 620, h: 430 }],
            ['Large', { w: 860, h: 560 }],
          ].map(([label, s]) => (
            <button
              key={label}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setSize(s)}
              className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="w-px h-3 bg-white/20 mx-1" />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-500/80 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ width: size.w, height: size.h }} />
    </div>
  );
}

// ── Reference Sheet ──────────────────────────────────────────────────────
function ReferenceSheet({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[280] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <h3 className="font-black text-gray-900">SAT Math Reference Sheet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-6 text-sm">
          <section>
            <h4 className="font-bold text-gray-700 mb-3">Area & Perimeter</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Circle', 'A = πr², C = 2πr'],
                ['Rectangle', 'A = lw, P = 2(l+w)'],
                ['Triangle', 'A = ½bh'],
                ['Trapezoid', 'A = ½(b₁+b₂)h'],
              ].map(([name, formula]) => (
                <div key={name} className="bg-sky-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{name}</div>
                  <div className="font-mono text-sky-700 font-semibold">
                    {formula}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4 className="font-bold text-gray-700 mb-3">Volume</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Rectangular Prism', 'V = lwh'],
                ['Cylinder', 'V = πr²h'],
                ['Sphere', 'V = (4/3)πr³'],
                ['Cone', 'V = (1/3)πr²h'],
                ['Pyramid', 'V = (1/3)lwh'],
              ].map(([name, formula]) => (
                <div key={name} className="bg-sky-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{name}</div>
                  <div className="font-mono text-sky-800 font-semibold">
                    {formula}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4 className="font-bold text-gray-700 mb-3">
              Special Right Triangles
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">30°–60°–90°</div>
                <div className="font-mono text-purple-700 font-semibold">
                  x : x√3 : 2x
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">45°–45°–90°</div>
                <div className="font-mono text-purple-700 font-semibold">
                  x : x : x√2
                </div>
              </div>
            </div>
          </section>
          <section>
            <h4 className="font-bold text-gray-700 mb-3">Key Facts</h4>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                • The number of degrees in a circle is <strong>360</strong>
              </li>
              <li>
                • The number of radians in a circle is <strong>2π</strong>
              </li>
              <li>
                • The sum of angles in a triangle is <strong>180°</strong>
              </li>
            </ul>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── QCell ── grid cell driven by persisted answer status (independent of view state)
// persisted = { isCorrect: bool, hadWrong: bool, answered: bool } | undefined
function QCell({
  gi,
  q,
  persisted,   // permanent status from server/localStorage
  isCurrent,
  isSaved,
  maxTimeSec,
  onClick,
}) {
  const diff = q?.difficulty;

  function difficultyTileCls(diffRaw) {
    const d = String(diffRaw || 'medium').toLowerCase();
    if (d === 'easy') return 'bg-[#DCFCE7] text-[#15803D]';
    if (d === 'hard') return 'bg-[#FEE2E2] text-[#DE2E2E]';
    return 'bg-[#FEF3C7] text-[#D97706]';
  }

  // Background always stays difficulty-based — only the badge icon changes
  let cellCls = difficultyTileCls(diff);

  if (isCurrent) {
    cellCls = `${cellCls} ring-[3px] ring-slate-900 ring-offset-0`;
  }

  let badge = null;

  if (isSaved) {
    badge = (
      <span className="absolute -top-[6px] -right-[6px] z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-[#b45309] border-2 border-white shadow-sm">
        <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
          <path d="M2 1h6v9L5 8 2 10z" fill="white" />
        </svg>
      </span>
    );
  } else if (persisted?.answered) {
    if (persisted.isCorrect && !persisted.hadWrong) {
      badge = (
        <span className="absolute -top-[6px] -right-[6px] z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-[#047857] border-2 border-white shadow-sm">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="2,5 4,8 8,2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    } else if (persisted.isCorrect && persisted.hadWrong) {
      badge = (
        <span className="absolute -top-[6px] -right-[6px] z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-[#b45309] border-2 border-white shadow-sm">
          <span className="h-[6px] w-[6px] rounded-full bg-white" />
        </span>
      );
    } else {
      badge = (
        <span className="absolute -top-[6px] -right-[6px] z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-[#b91c1c] border-2 border-white shadow-sm">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="2" y1="2" x2="8" y2="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="8" y1="2" x2="2" y2="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
      );
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex aspect-square w-full items-center justify-center rounded-xl transition-all ${cellCls}`}
    >
      {badge}
      <span className="tabular-nums text-[13px] leading-none font-black">
        {gi}
      </span>
    </button>
  );
}

// ── Question Bank Legend ─────────────────────────────────────────────────
function QuestionBankLegend({ className = '' }) {
  return (
    <div
      className={`flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-gray-100 px-4 py-2.5 ${className}`}
    >
      {[
        {
          badge: (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#047857]">
              <Check size={8} strokeWidth={3} className="text-white" />
            </span>
          ),
          label: 'Correct',
        },
        {
          badge: (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b91c1c]">
              <X size={8} strokeWidth={3} className="text-white" />
            </span>
          ),
          label: 'Incorrect',
        },
        {
          badge: (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b45309]">
              <Bookmark
                size={8}
                className="shrink-0 fill-white text-white"
                strokeWidth={2.5}
              />
            </span>
          ),
          label: 'For Review',
        },
        {
          badge: (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b45309]">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          ),
          label: 'Correct (w/ wrong)',
        },
      ].map(({ badge, label }) => (
        <span
          key={label}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-600"
        >
          {badge}
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Question Bank Sidebar ────────────────────────────────────────────────
function QuestionBankSidebar({
  open,
  onClose,
  questions,
  persistedAnswers,   // { [qId]: { isCorrect, hadWrong, answered } }
  currentIdx,
  onGoto,
  page,
  total,
  qMaxTimeMap,
}) {
  const [tab, setTab] = useState('bank');

  useEffect(() => {
    if (!open) setTab('bank');
  }, [open]);

  const grouped = useMemo(() => {
    const correct = [], incorrect = [], review = [], unanswered = [];
    questions.forEach((q, idx) => {
      const gi = (page - 1) * 20 + idx + 1;
      const p = persistedAnswers[q.id];
      if (q.is_saved) { review.push({ q, idx, gi }); return; }
      if (!p?.answered) { unanswered.push({ q, idx, gi }); return; }
      if (p.isCorrect) correct.push({ q, idx, gi });
      else incorrect.push({ q, idx, gi });
    });
    return { correct, incorrect, review, unanswered };
  }, [questions, persistedAnswers, page]);

  const header = (
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-2.5">
      <h2 className="min-w-0 flex-1 text-[14px] font-bold tracking-tight text-gray-900">
        Question Bank
      </h2>
      <button
        type="button"
        onClick={() => setTab((t) => (t === 'bank' ? 'group' : 'bank'))}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
          tab === 'group'
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <ListChecks size={13} strokeWidth={2.25} className="shrink-0" />
        <span>{tab === 'bank' ? 'Group Answered' : 'Bank View'}</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        aria-label="Close"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );

  const currentGlobalIdx = (page - 1) * 20 + currentIdx + 1;

  const gridSection = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
      {tab === 'bank' ? (
        <>
          <p className="mb-2 shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            Page {page} · {total} total
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            <div className="grid grid-cols-6 gap-2 pt-1">
              {questions.map((q, idx) => (
                <QCell
                  key={q.id}
                  q={q}
                  gi={(page - 1) * 20 + idx + 1}
                  persisted={persistedAnswers[q.id]}
                  isCurrent={idx === currentIdx}
                  isSaved={q.is_saved}
                  maxTimeSec={getQMaxTime(qMaxTimeMap, q.id)}
                  onClick={() => { onGoto(idx); onClose(); }}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pb-2">
          {[
            {
              label: 'For Review',
              items: grouped.review,
              cellBg: 'bg-rose-50',
              cellBorder: 'border-rose-300',
              textCls: 'text-rose-800',
            },
            {
              label: 'Correct',
              items: grouped.correct,
              cellBg: 'bg-[#dcfce7]',
              cellBorder: 'border-[#86efac]',
              textCls: 'text-green-800',
            },
            {
              label: 'Incorrect',
              items: grouped.incorrect,
              cellBg: 'bg-[#fee2e2]',
              cellBorder: 'border-[#fca5a5]',
              textCls: 'text-red-700',
            },
            {
              label: 'Unanswered',
              items: grouped.unanswered,
              cellBg: 'bg-white',
              cellBorder: 'border-gray-200',
              textCls: 'text-gray-600',
            },
          ].map(
            ({ label, items, cellBg, cellBorder, textCls }) =>
              items.length > 0 && (
                <div key={label}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {label} ({items.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(({ q, idx, gi }) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          onGoto(idx);
                          onClose();
                        }}
                        className={`h-8 min-w-[2rem] rounded-md border px-2 text-[11px] font-bold transition-opacity hover:opacity-85 ${cellBg} ${cellBorder} ${textCls}`}
                      >
                        {gi}
                      </button>
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50/80 px-4 py-2">
      <span className="text-[12px] font-semibold text-gray-700">
        {currentGlobalIdx} of {total}
      </span>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
        aria-label="Close panel"
      >
        <ChevronUp size={14} strokeWidth={2.5} />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[299]"
            aria-label="Close question bank"
            onClick={onClose}
          />

          {/* Floating panel — anchored bottom-left, slides up */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed z-[300] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
            style={{
              bottom: '72px',
              left: '16px',
              width: '368px',
              maxWidth: 'calc(100vw - 32px)',
              height: '440px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-0.5">
              <div className="h-1 w-8 rounded-full bg-gray-200" />
            </div>
            {header}
            <QuestionBankLegend className="border-b bg-white" />
            {gridSection}
            {footer}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Filter Dropdown ──────────────────────────────────────────────────────
function FilterDropdown({
  icon: Icon,
  label,
  value,
  options,
  onSelect,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = value !== null && value !== undefined && value !== '';
  const selectedLabel = active
    ? options.find((o) => o.value === value)?.label
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all select-none ${
          active
            ? 'border-slate-400 bg-slate-50 text-slate-800'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
        }`}
      >
        {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
        <div className="text-left leading-tight">
          <div className="text-[13px] font-semibold">{label}</div>
          {selectedLabel && (
            <div className="text-[11px] text-slate-500 font-normal">
              {selectedLabel}
            </div>
          )}
        </div>
        {open ? (
          <ChevronUp size={13} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronDown size={13} className="text-slate-400 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 min-w-[180px] overflow-hidden"
          >
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {label}
              </p>
            </div>
            <div className="px-2 pb-2 space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSelect(opt.value === value ? null : opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                    value === opt.value
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      value === opt.value
                        ? 'border-slate-800 bg-slate-800'
                        : 'border-slate-300'
                    }`}
                  >
                    {value === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Table renderer ───────────────────────────────────────────────────────
function TableRender({ data }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <div className="overflow-x-auto my-3 border border-black bg-white">
      <table className="w-full border-collapse text-[14.5px]">
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className="bg-white">
              {(Array.isArray(row) ? row : [row]).map((cell, ci) =>
                ri === 0 ? (
                  <th
                    key={ci}
                    className="border border-black px-4 py-3 font-bold text-left text-black whitespace-nowrap"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={ci}
                    className="border border-black px-4 py-3 text-black"
                  >
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Passage renderer ─────────────────────────────────────────────────────
function PassageText({ text }) {
  if (!text) return null;
  const hasBlockHtml = /<(p|div|ul|ol|li|h[1-6]|blockquote|table)[^>]*>/i.test(
    text
  );
  if (hasBlockHtml) {
    return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />;
  }
  const html = text.replace(/\n/g, '<br>');
  return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

function CrossOutTriggerGlyph({ letter, isCrossed }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-md border-2 shadow-sm transition-colors ${
        isCrossed ? 'border-gray-900 bg-white' : 'border-gray-300 bg-white'
      }`}
    >
      <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-gray-900 bg-white text-[10px] font-black text-gray-900">
        {letter}
        <span
          className="pointer-events-none absolute left-[2px] right-[2px] top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-gray-900"
          aria-hidden
        />
      </span>
    </span>
  );
}

function ChoiceLetterBadge({ letter, labelCls, crossed, showResult }) {
  return (
    <span
      className={`relative mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-black transition-colors ${labelCls}`}
    >
      {letter}
      {crossed && !showResult && (
        <span
          className="pointer-events-none absolute left-1 right-1 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gray-900"
          aria-hidden
        />
      )}
    </span>
  );
}

// ── MCQ Card ─────────────────────────────────────────────────────────────
function MCQCard({
  question,
  onAnswer,
  userAnswer,
  showResult,
  subject,
  showExplanation,
  wrongMarks = {},
  onCheck,
  crossedOut,
  onCrossOut,
  crossOutMode = false,
  noSplit = false,
}) {
  const choices = [
    { key: 'A', text: question.choice_a, image: question.choice_a_image },
    { key: 'B', text: question.choice_b, image: question.choice_b_image },
    { key: 'C', text: question.choice_c, image: question.choice_c_image },
    { key: 'D', text: question.choice_d, image: question.choice_d_image },
  ].filter((c) => c.text || c.image);

  const isMath = subject === 'math';
  const crossed = crossedOut || {};

  const renderChoices = () => (
    <div className="space-y-2">
      {choices.map((c, idx) => {
        const isSelected = userAnswer === c.key;
        const isCorrect = question.correct_answer === c.key;
        const isCrossed = crossed[c.key];

        let rowCls =
          'border-2 border-gray-800 bg-white hover:border-gray-900 hover:bg-gray-50/70 cursor-pointer';
        let labelCls = 'border-gray-700 text-gray-900 bg-white';
        let textCls = 'text-gray-900';

        if (showResult) {
          if (isCorrect) {
            rowCls =
              'border-2 border-emerald-600 bg-emerald-100/95 cursor-default shadow-sm';
            labelCls = 'border-emerald-700 bg-emerald-700 text-white';
            textCls = 'text-emerald-950';
          } else if (wrongMarks[c.key]) {
            rowCls =
              'border-2 border-red-600 bg-red-100/95 cursor-default shadow-sm';
            labelCls = 'border-red-700 bg-red-700 text-white';
            textCls = 'text-red-950';
          } else if (isSelected && !isCorrect) {
            rowCls =
              'border-2 border-red-600 bg-red-100/95 cursor-default shadow-sm';
            labelCls = 'border-red-700 bg-red-700 text-white';
            textCls = 'text-red-950';
          } else {
            rowCls = 'border-2 border-gray-800 bg-white cursor-default';
            labelCls = 'border-gray-700 text-gray-800 bg-white';
            textCls = 'text-gray-800';
          }
        } else if (wrongMarks[c.key]) {
          rowCls = isSelected
            ? 'border-2 border-red-600 bg-red-100/95 shadow-sm cursor-pointer'
            : 'border-2 border-red-600 bg-red-100/90 cursor-default';
          labelCls = 'border-red-700 bg-red-700 text-white';
          textCls = 'text-red-950';
        } else if (isSelected && !isCrossed) {
          rowCls = 'border-2 border-gray-900 bg-white shadow-sm';
          labelCls = 'border-gray-900 bg-gray-900 text-white';
          textCls = 'text-gray-900';
        }

        if (isCrossed && !showResult) {
          rowCls = 'border-2 border-gray-800 bg-white cursor-default';
          labelCls = 'border-gray-800 bg-white text-gray-900';
          textCls =
            'text-gray-600 line-through decoration-gray-900 decoration-2';
        }

        const selectedStrong =
          isSelected && !showResult && !isCrossed && !wrongMarks[c.key];
        const crossStripRight = crossOutMode ? 'right-[40px]' : 'right-3';
        const staggerMs = 55;
        const crossStaggerDelay = crossOutMode
          ? idx * staggerMs
          : (choices.length - 1 - idx) * Math.max(40, staggerMs - 10);

        return (
          <div
            key={c.key}
            className={`relative flex min-h-[44px] items-stretch overflow-hidden rounded-xl transition-all ${rowCls}`}
          >
            {isCrossed && !showResult && (
              <span
                className={`pointer-events-none absolute left-3 top-1/2 z-[1] h-[2px] -translate-y-1/2 rounded-full bg-gray-900 transition-[right] duration-300 ease-out ${crossStripRight}`}
                style={{ transitionDelay: `${crossStaggerDelay}ms` }}
                aria-hidden
              />
            )}

            {showResult ? (
              <button
                type="button"
                disabled
                className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-2.5 text-left bg-transparent"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-black transition-colors ${labelCls}`}
                >
                  {c.key}
                </span>
                <span
                  className={`flex-1 text-[15px] leading-6 font-medium [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic ${textCls}`}
                >
                  {c.image && (
                    <img
                      src={c.image}
                      alt={`Choice ${c.key}`}
                      className="mb-2 max-h-32 max-w-full rounded-lg object-contain"
                    />
                  )}
                  {c.text && <LatexText text={c.text} />}
                </span>
                {isCorrect && (
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center self-center rounded-full bg-emerald-700">
                    <Check size={12} strokeWidth={3} className="text-white" />
                  </span>
                )}
                {!isCorrect && (wrongMarks[c.key] || isSelected) && (
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center self-center rounded-full bg-red-700">
                    <X size={12} strokeWidth={3} className="text-white" />
                  </span>
                )}
              </button>
            ) : (
              <>
                <div
                  className={`flex min-w-0 flex-1 items-stretch overflow-hidden ${crossOutMode ? 'rounded-l-xl' : 'rounded-xl'}`}
                >
                  <button
                    type="button"
                    disabled={isCrossed}
                    onClick={() => onAnswer(c.key)}
                    className="flex min-w-0 flex-1 items-start gap-3 py-2.5 pl-3.5 pr-2 text-left disabled:pointer-events-none min-h-[44px]"
                  >
                    <ChoiceLetterBadge
                      letter={c.key}
                      labelCls={labelCls}
                      crossed={isCrossed}
                      showResult={showResult}
                    />
                    <span
                      className={`min-w-0 flex-1 text-[15px] leading-6 font-medium [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic ${textCls}`}
                    >
                      {c.image && (
                        <img
                          src={c.image}
                          alt={`Choice ${c.key}`}
                          className="mb-2 max-h-32 max-w-full rounded-lg object-contain"
                        />
                      )}
                      {c.text && <LatexText text={c.text} />}
                    </span>
                  </button>
                  {isSelected &&
                    !isCrossed &&
                    typeof onCheck === 'function' &&
                    !wrongMarks[c.key] && (
                      <motion.div
                        className="flex shrink-0 items-center pr-2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.2,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCheck();
                          }}
                          className="rounded-lg bg-sky-500 px-3 py-1.5 text-[13px] font-bold text-white shadow-sm shadow-sky-500/30 outline-none transition-colors hover:bg-sky-600 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 motion-reduce:transition-none"
                        >
                          Check
                        </button>
                      </motion.div>
                    )}
                  {wrongMarks[c.key] && (
                    <div className="flex shrink-0 items-center self-center pr-2.5">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-red-700 shadow-sm ring-1 ring-white"
                        title="Incorrect"
                        aria-hidden
                      >
                        <X size={12} strokeWidth={3} className="text-white" />
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className={`flex shrink-0 overflow-hidden rounded-r-xl border-l transition-[max-width,opacity,border-color] duration-300 ease-out motion-reduce:transition-none ${
                    crossOutMode
                      ? 'max-w-[40px] border-gray-200 opacity-100'
                      : 'max-w-0 border-transparent opacity-0 pointer-events-none'
                  }`}
                  style={{ transitionDelay: `${crossStaggerDelay}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => onCrossOut(c.key)}
                    className={`flex min-h-[44px] w-10 shrink-0 flex-col items-center justify-center rounded-r-xl transition-colors motion-reduce:transition-none ${
                      selectedStrong
                        ? 'bg-gray-50 hover:bg-gray-100'
                        : isCrossed
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-gray-50/90 hover:bg-gray-100'
                    }`}
                    title={
                      isCrossed ? 'Restore choice' : 'Cross out this choice'
                    }
                    aria-label={
                      isCrossed ? 'Restore choice' : 'Cross out this choice'
                    }
                  >
                    <CrossOutTriggerGlyph
                      letter={c.key}
                      isCrossed={isCrossed}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!noSplit && !isMath && question.passage) {
    return (
      <div className="flex gap-0 h-full">
        <div className="flex-1 min-w-0 overflow-y-auto border-r border-gray-200 pr-5">
          <div className="text-[16px] text-gray-900 leading-[1.9] font-serif sm:text-[17px] [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:my-1 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic">
            <PassageText text={question.passage} />
          </div>
        </div>
        <div className="flex-shrink-0 basis-[42%] min-w-[300px] max-w-[520px] flex flex-col gap-3 pl-5 overflow-y-auto">
          {question.image && (
            <img
              src={question.image}
              alt=""
              className="max-w-full rounded-xl border border-gray-200"
            />
          )}
          {question.math_equation && (
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-[15px]">
              <LatexText text={question.math_equation} />
            </div>
          )}
          <div className="text-[15px] font-semibold text-black leading-relaxed [&_p]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold">
            <LatexText text={question.content} />
          </div>
          {renderChoices()}
          {question.explanation && showResult && showExplanation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
              <p className="font-bold mb-1">Explanation</p>
              <LatexText text={question.explanation} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3.5">
      {question.image && (
        <img
          src={question.image}
          alt=""
          className="max-w-full rounded-xl border border-gray-200"
        />
      )}
      {question.math_equation && (
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-[15px]">
          <LatexText text={question.math_equation} />
        </div>
      )}
      <div className="text-[15px] font-semibold text-black leading-relaxed [&_p]:mb-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:my-1 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic">
        <LatexText text={question.content} />
      </div>
      {renderChoices()}
      {question.explanation && showResult && showExplanation && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl text-[13px] text-violet-900">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <Lightbulb size={14} /> Explanation
          </p>
          <div className="[&_p]:mb-1 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold leading-relaxed">
            <LatexText text={question.explanation} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Math INPUT Card ──────────────────────────────────────────────────────
function MathInputCard({
  question,
  onAnswer,
  userAnswer,
  showResult,
  showExplanation,
}) {
  const [value, setValue] = useState(userAnswer || '');
  useEffect(() => {
    setValue(userAnswer || '');
  }, [userAnswer, question.id]);

  const ok =
    showResult &&
    question.correct_answer?.toLowerCase() === value?.toLowerCase();

  return (
    <div className="flex w-full flex-col gap-5">
      {question.image && (
        <img
          src={question.image}
          alt=""
          className="max-w-full rounded-xl border border-gray-200"
        />
      )}
      <div className="text-[15px] text-gray-900 leading-relaxed">
        <LatexText text={question.content} />
      </div>
      <div className="max-w-xs w-full sm:max-w-sm">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            onAnswer(v);
          }}
          disabled={showResult}
          placeholder="Your answer..."
          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-gray-50 text-center font-semibold"
        />
      </div>
      {showResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border-2 ${ok ? 'bg-[#f0fdf4] border-[#22c55e]' : 'bg-[#fff5f5] border-[#ef4444]'}`}
        >
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${ok ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} text-white`}
          >
            {ok ? (
              <Check size={18} strokeWidth={3} />
            ) : (
              <X size={18} strokeWidth={3} />
            )}
          </span>
          <div className="pt-0.5">
            <p
              className={`text-sm font-bold ${ok ? 'text-[#166534]' : 'text-[#991b1b]'}`}
            >
              {ok ? 'Correct!' : 'Incorrect'}
            </p>
            {!ok && (
              <p className="text-sm text-[#991b1b] mt-0.5">
                Correct answer: <strong>{question.correct_answer}</strong>
              </p>
            )}
          </div>
        </div>
      )}
      {question.explanation && showResult && showExplanation && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
          <p className="font-bold mb-1">Explanation</p>
          <LatexText text={question.explanation} />
        </div>
      )}
    </div>
  );
}

const REPORT_ISSUE_OPTIONS = [
  { id: 'explanation', label: 'Issue with explanation' },
  { id: 'wrong_marked', label: 'Wrong answer marked as correct' },
  { id: 'explanation_wrong', label: 'Explanation is incorrect' },
  { id: 'formatting', label: 'Formatting/display issue' },
  { id: 'other', label: 'Other issue' },
];

function ReportIssueModal({ open, onClose, questionId }) {
  const [reason, setReason] = useState('other');
  const [details, setDetails] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setReason('other');
      setDetails('');
      setMenuOpen(false);
      setSubmitted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  if (!open) return null;

  const selectedLabel =
    REPORT_ISSUE_OPTIONS.find((o) => o.id === reason)?.label || 'Other issue';

  const handleSubmit = async () => {
    if (!questionId) { setSubmitted(true); return; }
    setLoading(true);
    try {
      await api.post(`/sat/practice/${questionId}/report/`, { reason, details });
    } catch { /* silent */ }
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-issue-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-2">
            <p className="text-[17px] font-bold text-gray-900">Thank you</p>
            <p className="mt-2 text-[14px] text-gray-600 leading-relaxed">
              We received your report and will review it.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-sky-500 py-3 text-[14px] font-bold text-white hover:bg-sky-600 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2
              id="report-issue-title"
              className="text-[17px] font-bold text-gray-900 tracking-tight"
            >
              Report an issue
            </h2>
            <div ref={menuRef} className="relative mt-5">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-left text-[14px] font-medium text-gray-900 hover:bg-gray-100/80 transition-colors"
              >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {menuOpen && (
                <ul className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-[min(52vh,320px)] overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  {REPORT_ISSUE_OPTIONS.map((opt) => {
                    const sel = reason === opt.id;
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setReason(opt.id);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[14px] transition-colors ${
                            sel
                              ? 'bg-gray-100 text-sky-900 font-semibold'
                              : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span className="leading-snug">{opt.label}</span>
                          {sel && (
                            <Check
                              size={16}
                              strokeWidth={2.5}
                              className="shrink-0 text-gray-500"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details..."
              rows={4}
              className="mt-4 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-sky-600 transition-colors disabled:opacity-60"
              >
                {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionChromeBar({
  globalIdx,
  isSaved,
  onToggleSave,
  onOpenReport,
  contentClassName,
  showCrossOutControl,
  crossOutMode,
  onToggleCrossOutMode,
}) {
  return (
    <div
      className={`flex w-full flex-shrink-0 items-center gap-3 border border-gray-200 bg-[#F3F4F6] ${contentClassName}`}
    >
      <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center bg-black text-[14px] font-black text-white">
        {globalIdx}
      </span>
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={isSaved}
        className="flex items-center gap-2 text-[13px] font-semibold text-gray-900 transition-colors hover:text-black"
      >
        <Bookmark
          size={16}
          strokeWidth={2}
          className={`shrink-0 ${isSaved ? 'text-red-600 fill-red-500' : 'text-slate-600 fill-none'}`}
        />
        <span>{isSaved ? 'Marked for Review' : 'Mark for Review'}</span>
      </button>
      <div className="flex-1 min-w-[8px]" />
      <button
        type="button"
        onClick={onOpenReport}
        className="flex items-center gap-1.5 text-[14px] font-semibold text-gray-600 transition-colors hover:text-gray-900"
      >
        <Flag size={16} strokeWidth={2} className="shrink-0 text-gray-500" />
        Report
      </button>
      {showCrossOutControl && (
        <button
          type="button"
          onClick={onToggleCrossOutMode}
          aria-pressed={crossOutMode}
          title={
            crossOutMode
              ? 'Turn off cross-out mode'
              : 'Cross out answer choices you think are wrong'
          }
          aria-label={
            crossOutMode ? 'Turn off cross-out mode' : 'Turn on cross-out mode'
          }
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors ${
            crossOutMode
              ? 'border-black bg-black text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <Strikethrough size={15} strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}

// ── Main Practice Page ────────────────────────────────────────────────────
export default function SATPractice() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const subject = searchParams.get('subject') || 'math';
  const category = searchParams.get('category') || '';
  const practiceTopic = searchParams.get('topic') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const savedFilter = searchParams.get('saved') || 'all';
  const answerFilter = searchParams.get('status') || 'all';
  const phase = practiceTopic ? 'practice' : 'topics';

  const setSubject = (v) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.set('subject', v);
      n.delete('category');
      n.delete('topic');
      n.delete('difficulty');
      n.delete('saved');
      n.delete('status');
      return n;
    });
  const setCategory = (v) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.set('category', v);
      return n;
    });
  const setDifficulty = (v) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      v ? n.set('difficulty', v) : n.delete('difficulty');
      n.set('page', '1');
      n.set('idx', '0');
      return n;
    });
  const setSavedFilter = (v) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      v && v !== 'all' ? n.set('saved', v) : n.delete('saved');
      n.set('page', '1');
      n.set('idx', '0');
      return n;
    });
  const setAnswerFilter = (v) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      v && v !== 'all' ? n.set('status', v) : n.delete('status');
      n.set('page', '1');
      n.set('idx', '0');
      return n;
    });

  const currentIdx = parseInt(searchParams.get('idx') ?? '0', 10);
  const setCurrentIdx = useCallback(
    (v) => {
      setSearchParams((p) => {
        const n = new URLSearchParams(p);
        n.set(
          'idx',
          String(
            typeof v === 'function' ? v(parseInt(p.get('idx') ?? '0', 10)) : v
          )
        );
        return n;
      });
    },
    [setSearchParams]
  );

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const setPage = useCallback(
    (v) => {
      setSearchParams((p) => {
        const n = new URLSearchParams(p);
        n.set(
          'page',
          String(
            typeof v === 'function' ? v(parseInt(p.get('page') ?? '1', 10)) : v
          )
        );
        return n;
      });
    },
    [setSearchParams]
  );

  const [answers, setAnswers] = useState({});
  const [attemptMeta, setAttemptMeta] = useState({});
  const [showResult, setShowResult] = useState({});
  const [showExplanation, setShowExplanation] = useState({});
  const [wrongMarks, setWrongMarks] = useState({});
  const [crossedOut, setCrossedOut] = useState({});
  // persistedAnswers drives grid colors; independent of per-question view state
  // { [qId]: { isCorrect: bool, hadWrong: bool, answered: bool } }
  const [persistedAnswers, setPersistedAnswers] = useState({});
  const [crossOutMode, setCrossOutMode] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [practiceElapsedSec, setPracticeElapsedSec] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [questionElapsedSec, setQuestionElapsedSec] = useState(0);
  const questionElapsedSecRef = useRef(0);
  const [qMaxTimeMap, setQMaxTimeMap] = useState(readQMaxTimeMap);
  const [passageSplitPct, setPassageSplitPct] = useState(readPassageSplitPct);
  const splitContainerRef = useRef(null);
  const splitDragRef = useRef({ active: false, startX: 0, startPct: 50 });

  useEffect(() => {
    if (phase !== 'practice') setReportOpen(false);
  }, [phase]);

  useEffect(() => {
    const onMove = (e) => {
      if (!splitDragRef.current.active || !splitContainerRef.current) return;
      const w = splitContainerRef.current.getBoundingClientRect().width;
      if (w <= 0) return;
      const dx = e.clientX - splitDragRef.current.startX;
      const next = splitDragRef.current.startPct + (dx / w) * 100;
      setPassageSplitPct(Math.min(72, Math.max(28, next)));
    };
    const endDrag = () => {
      if (!splitDragRef.current.active) return;
      splitDragRef.current.active = false;
      setPassageSplitPct((pct) => {
        try {
          localStorage.setItem(PASSAGE_SPLIT_PCT_KEY, String(pct));
        } catch {
          /* */
        }
        return pct;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  const goToEndOfPrevPage = useRef(false);
  const lastHydratedKeyRef = useRef('');
  const showResultRef = useRef({});
  showResultRef.current = showResult;

  const selectTopic = (catKey, topicName) => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.set('category', catKey);
      n.set('topic', topicName || '');
      n.set('idx', '0');
      n.set('page', '1');
      return n;
    });
    lastHydratedKeyRef.current = '';
    setPracticeElapsedSec(0);
    setTimerPaused(false);
    setShowQuestionBank(false);
    setReportOpen(false);
    setWrongMarks({});
  };

  const backToTopics = () => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.delete('topic');
      n.delete('category');
      n.delete('idx');
      n.delete('page');
      return n;
    });
    lastHydratedKeyRef.current = '';
    setShowQuestionBank(false);
    setReportOpen(false);
    setPracticeElapsedSec(0);
    setTimerPaused(false);
    setWrongMarks({});
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const subjectCfg = SUBJECTS[subject] || SUBJECTS['math'];
  const subjectWatermark = subject === 'math' ? rasm1 : rasm2;
  const practiceStorageKey = `sat-practice-v2|${subject}|${category}|${practiceTopic}|${difficulty}|${page}`;

  const { data: bankOverview, isLoading: bankLoading } = useQuery({
    queryKey: [
      'sat-bank-overview',
      subjectCfg.subject,
      difficulty,
      savedFilter,
      answerFilter,
    ],
    queryFn: () =>
      api
        .get('/sat/practice/bank-overview/', {
          params: {
            subject: subjectCfg.subject,
            difficulty: difficulty || undefined,
            saved_only:
              savedFilter === 'saved'
                ? 'true'
                : savedFilter === 'not_saved'
                  ? 'false'
                  : undefined,
            answer_filter: answerFilter !== 'all' ? answerFilter : undefined,
          },
        })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      'sat-practice',
      subject,
      category,
      practiceTopic,
      difficulty,
      savedFilter,
      answerFilter,
      page,
    ],
    queryFn: () =>
      api
        .get('/sat/practice/', {
          params: {
            subject: subjectCfg.subject,
            category,
            topic: practiceTopic || undefined,
            difficulty: difficulty || undefined,
            saved_only:
              savedFilter === 'saved'
                ? 'true'
                : savedFilter === 'not_saved'
                  ? 'false'
                  : undefined,
            answer_filter: answerFilter !== 'all' ? answerFilter : undefined,
            page,
            page_size: 20,
          },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
    enabled: phase === 'practice',
  });

  const saveMutation = useMutation({
    mutationFn: ({ qId, action, user_answer, is_correct }) =>
      api.post(`/sat/practice/${qId}/save/`, { action, user_answer, is_correct }),
    onMutate: ({ qId, action }) => {
      // Optimistically flip is_saved so the flag icon turns red immediately
      const queryKey = [
        'sat-practice', subject, category, practiceTopic,
        difficulty, savedFilter, answerFilter, page,
      ];
      qc.setQueryData(queryKey, (old) => {
        if (!old?.results) return old;
        return {
          ...old,
          results: old.results.map((q) =>
            q.id === qId ? { ...q, is_saved: action === 'save' } : q
          ),
        };
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['sat-practice']);
      qc.invalidateQueries(['sat-bank-overview']);
    },
  });

  const questions = data?.results || [];
  const total = data?.total || 0;
  const question = questions[currentIdx];

  useEffect(() => {
    if (isLoading || !data?.results?.length) return;
    if (lastHydratedKeyRef.current === practiceStorageKey) return;
    // Key changed (new topic/category/page) — reset view state
    setPersistedAnswers({});
    setAnswers({});
    setShowResult({});
    setWrongMarks({});
    setAttemptMeta({});
    lastHydratedKeyRef.current = practiceStorageKey;
    const list = data.results;
    // 1. Try localStorage first (has accurate hadWrong tracking)
    try {
      const raw = localStorage.getItem(practiceStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.persistedAnswers && Object.keys(parsed.persistedAnswers).length > 0) {
          setPersistedAnswers(parsed.persistedAnswers);
          return; // successfully restored — question views stay fresh
        }
      }
    } catch {
      /* */
    }
    // 2. Fall back to server data (user_answer + is_correct from SavedBankQuestion)
    const nextPersisted = {};
    for (const q of list) {
      const ua = q.user_answer ?? q.user_last_answer;
      if (ua != null && String(ua).trim() !== '') {
        const isCorrect =
          typeof q.is_correct === 'boolean'
            ? q.is_correct
            : String(q.correct_answer).trim() === String(ua).trim();
        nextPersisted[q.id] = {
          isCorrect,
          hadWrong: !isCorrect, // if last answer wrong → hadWrong; correct from server means we can't know for sure
          answered: true,
        };
      }
    }
    if (Object.keys(nextPersisted).length)
      setPersistedAnswers((prev) => ({ ...nextPersisted, ...prev }));
  }, [practiceStorageKey, isLoading, data]);

  useEffect(() => {
    // Only persist once there's real answer data (don't overwrite with empty state on mount)
    if (!Object.keys(persistedAnswers).length) return;
    try {
      localStorage.setItem(practiceStorageKey, JSON.stringify({ persistedAnswers }));
    } catch {
      /* */
    }
  }, [practiceStorageKey, persistedAnswers]);

  useEffect(() => {
    if (!goToEndOfPrevPage.current || !questions.length) return;
    setCurrentIdx(questions.length - 1);
    goToEndOfPrevPage.current = false;
  }, [questions, page]);

  // When the user navigates to a different question, clear that question's
  // in-session view state so it appears fresh (no old answer highlighted).
  // Grid colors remain intact via persistedAnswers.
  const questionsRef = useRef([]);
  questionsRef.current = questions;
  useEffect(() => {
    const q = questionsRef.current[currentIdx];
    if (!q) return;
    const qid = q.id;
    setShowResult((p) => { if (!p[qid]) return p; const { [qid]: _, ...r } = p; return r; });
    setAnswers((p) => { if (!p[qid]) return p; const { [qid]: _, ...r } = p; return r; });
    setWrongMarks((p) => { if (!p[qid]) return p; const { [qid]: _, ...r } = p; return r; });
    setCrossedOut((p) => { if (!p[qid]) return p; const { [qid]: _, ...r } = p; return r; });
    setAttemptMeta((p) => { if (!p[qid]) return p; const { [qid]: _, ...r } = p; return r; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  const handleAnswer = useCallback((qId, answer) => {
    if (showResultRef.current[qId]) return;
    setAnswers((p) => {
      if (p[qId]?.answer === answer) {
        const { [qId]: _removed, ...rest } = p;
        return rest;
      }
      return { ...p, [qId]: { answer, isCorrect: p[qId]?.isCorrect || false } };
    });
  }, []);

  const handleCheck = useCallback(() => {
    if (!question) return;
    if (showResult[question.id]) return;
    const raw = answers[question.id]?.answer;
    const selected =
      question.question_type === 'INPUT' ? String(raw ?? '').trim() : raw;
    if (!selected) return;
    const correct = question.correct_answer;
    const isCorrect =
      question.question_type === 'MCQ'
        ? selected === correct
        : selected.toLowerCase() === String(correct).trim().toLowerCase();
    if (
      question.question_type === 'MCQ' &&
      !isCorrect &&
      wrongMarks[question.id]?.[selected]
    )
      return;
    setAnswers((p) => ({
      ...p,
      [question.id]: { answer: selected, isCorrect },
    }));
    setAttemptMeta((p) => ({
      ...p,
      [question.id]: {
        hadWrong: p[question.id]?.hadWrong || !isCorrect,
      },
    }));
    // Update persistent grid status — hadWrong is sticky (never cleared once set)
    setPersistedAnswers((p) => ({
      ...p,
      [question.id]: {
        isCorrect,
        hadWrong: !isCorrect || p[question.id]?.hadWrong || false,
        answered: true,
      },
    }));
    if (question.question_type === 'MCQ') {
      if (isCorrect) {
        setShowResult((p) => ({ ...p, [question.id]: true }));
      } else {
        setWrongMarks((p) => ({
          ...p,
          [question.id]: { ...(p[question.id] || {}), [selected]: true },
        }));
      }
    } else if (isCorrect) {
      setShowResult((p) => ({ ...p, [question.id]: true }));
    }
    saveMutation.mutate({
      qId: question.id,
      action: 'record',
      user_answer: selected,
      is_correct: isCorrect,
    });
  }, [question, answers, showResult, saveMutation, wrongMarks]);

  const handleSaveToggle = (q) => {
    if (q.is_saved) {
      saveMutation.mutate({
        qId: q.id,
        action: 'unsave',
        user_answer: '',
        is_correct: false,
      });
    } else {
      const ans = answers[q.id];
      saveMutation.mutate({
        qId: q.id,
        action: 'save',
        user_answer: ans?.answer || '',
        is_correct: ans?.isCorrect || false,
      });
    }
  };

  const handleCrossOut = useCallback((qId, choiceKey) => {
    setCrossedOut((prev) => {
      const was = !!prev[qId]?.[choiceKey];
      const now = !was;
      if (now) {
        queueMicrotask(() => {
          setAnswers((ap) => {
            if (ap[qId]?.answer !== choiceKey) return ap;
            const { [qId]: _drop, ...rest } = ap;
            return rest;
          });
        });
      }
      return { ...prev, [qId]: { ...(prev[qId] || {}), [choiceKey]: now } };
    });
  }, []);

  const goTo = (idx) => {
    const bounded = Math.max(0, Math.min(questions.length - 1, idx));
    const targetQ = questions[bounded];
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.set('idx', String(bounded));
      if (targetQ?.id) n.set('qid', String(targetQ.id));
      return n;
    });
  };

  const handlePrev = () => {
    if (currentIdx > 0) goTo(currentIdx - 1);
    else if (page > 1) {
      goToEndOfPrevPage.current = true;
      setPage((p) => p - 1);
    }
  };
  const handleNext = () => {
    if (currentIdx < questions.length - 1) goTo(currentIdx + 1);
    else if (page * 20 < total) {
      setSearchParams((p) => {
        const n = new URLSearchParams(p);
        n.set('page', String(parseInt(p.get('page') ?? '1', 10) + 1));
        n.set('idx', '0');
        n.delete('qid');
        return n;
      });
    }
  };

  const isLastQuestionInSet =
    !!question && currentIdx >= questions.length - 1 && page * 20 >= total;

  const handleBackToPracticeList = () => {
    const p = new URLSearchParams(searchParams);
    p.delete('topic');
    p.delete('page');
    p.delete('idx');
    p.delete('qid');
    navigate(`/app/sat/practice?${p.toString()}`);
  };

  const answered = answers[question?.id];
  const resultShown = showResult[question?.id];
  const globalIdx = (page - 1) * 20 + currentIdx + 1;
  const isMath = subject === 'math';
  const [isMobileView, setIsMobileView] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const h = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const hasContext =
    !isMobileView && !isMath && !!(question?.passage || question?.table_data);

  const onPassageSplitPointerDown = useCallback(
    (e) => {
      e.preventDefault();
      if (!splitContainerRef.current) return;
      splitDragRef.current = {
        active: true,
        startX: e.clientX,
        startPct: passageSplitPct,
      };
    },
    [passageSplitPct]
  );

  const switchSubject = (key) => {
    setSearchParams({ subject: key });
    lastHydratedKeyRef.current = '';
    setPersistedAnswers({});
  };

  useEffect(() => {
    if (phase !== 'practice' || !practiceTopic) return undefined;
    const id = setInterval(() => {
      bumpTopicTime(subjectCfg.subject, category, practiceTopic, 1);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, practiceTopic, subjectCfg.subject, category, subject]);

  useEffect(() => {
    if (phase !== 'practice' || timerPaused) return undefined;
    const id = setInterval(() => {
      setPracticeElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, timerPaused]);

  useEffect(() => {
    if (phase !== 'practice') return undefined;
    const thisQId = question?.id;
    questionElapsedSecRef.current = 0;
    setQuestionElapsedSec(0);
    if (!thisQId) return undefined;
    const id = setInterval(() => {
      questionElapsedSecRef.current += 1;
      setQuestionElapsedSec(questionElapsedSecRef.current);
    }, 1000);
    return () => {
      clearInterval(id);
      if (questionElapsedSecRef.current > 0) {
        saveQMaxTime(thisQId, questionElapsedSecRef.current);
        setQMaxTimeMap(readQMaxTimeMap());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, page]);

  useEffect(() => {
    if (phase !== 'practice') return undefined;
    const root = document.documentElement;
    root.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement === root)
        document.exitFullscreen?.().catch(() => {});
    };
  }, [phase]);

  return (
    <>
      {/* ── TOPICS PHASE ── */}
      {phase === 'topics' && (
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-100/80">
          <div className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-3">
            <div className="relative max-w-7xl mx-auto overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md">
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.16]"
                style={{ backgroundImage: `url(${subjectWatermark})` }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/86 via-sky-50/14 to-white/90"
                aria-hidden
              />
              <div className="relative z-[1] px-5 sm:px-8 py-5 sm:py-6">
                <div className="flex flex-wrap gap-2 rounded-xl p-1 w-full max-w-md bg-white/80 backdrop-blur-sm border border-slate-200/80 shadow-sm">
                  {Object.entries(SUBJECTS).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchSubject(key)}
                      className={`flex flex-1 min-w-[120px] justify-center items-center gap-2 px-5 py-2.5 rounded-lg text-base font-bold transition-all ${
                        subject === key
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <cfg.icon size={18} /> {cfg.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/25 flex-shrink-0">
                      <LayoutGrid size={24} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                        {subject === 'math' ? 'Math' : 'English'} Training Bank
                      </h1>
                      <p className="text-base sm:text-lg text-slate-600 mt-1 font-medium">
                        {subject === 'math' ? 'SAT Math' : 'Reading & Writing'}{' '}
                        — Professional Practice Bank
                      </p>
                    </div>
                  </div>
                  <div className="text-left lg:text-right w-full lg:w-auto lg:min-w-[280px]">
                    <div className="text-4xl sm:text-5xl font-black text-sky-600 tabular-nums leading-none">
                      {bankOverview
                        ? `${bankOverview.answered_total ?? 0}`
                        : '—'}
                      <span className="text-xl sm:text-2xl font-bold text-slate-400">
                        {' '}
                        / {bankOverview?.grand_total ?? '—'} Questions
                      </span>
                    </div>
                    {bankOverview && bankOverview.grand_total > 0 && (
                      <div className="mt-3 h-2 w-full max-w-full lg:max-w-sm lg:ml-auto rounded-full bg-slate-200/90 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, ((bankOverview.answered_total || 0) / bankOverview.grand_total) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    {bankOverview && (
                      <p className="text-sm text-slate-600 mt-2 font-medium">
                        <span className="text-emerald-600 font-bold">
                          Correct {bankOverview.correct_total}
                        </span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="text-red-500 font-bold">
                          Incorrect {bankOverview.wrong_total}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FILTER BAR ── */}
          {(() => {
            const hasActive =
              difficulty || savedFilter !== 'all' || answerFilter !== 'all';
            return (
              <div className="flex-shrink-0 px-4 sm:px-6 pb-3">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FilterDropdown
                      icon={SlidersHorizontal}
                      label="Difficulty"
                      value={difficulty || null}
                      options={[
                        { value: 'easy', label: 'Easy' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'hard', label: 'Hard' },
                      ]}
                      onSelect={(v) => setDifficulty(v || '')}
                    />
                    <FilterDropdown
                      icon={Bookmark}
                      label="Saved"
                      value={savedFilter !== 'all' ? savedFilter : null}
                      options={[
                        { value: 'saved', label: 'Saved Only' },
                        { value: 'not_saved', label: 'Not Saved' },
                      ]}
                      onSelect={(v) => setSavedFilter(v || 'all')}
                    />
                    <FilterDropdown
                      icon={CheckCircle2}
                      label="Answer Status"
                      value={answerFilter !== 'all' ? answerFilter : null}
                      options={[
                        { value: 'correct', label: 'Correct Only' },
                        { value: 'incorrect', label: 'Incorrect Only' },
                        { value: 'unanswered', label: 'Unanswered' },
                      ]}
                      onSelect={(v) => setAnswerFilter(v || 'all')}
                    />
                    {hasActive && (
                      <button
                        onClick={() => {
                          setDifficulty('');
                          setSavedFilter('all');
                          setAnswerFilter('all');
                        }}
                        className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <X size={12} /> Reset filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 min-h-0">
            <div className="max-w-7xl mx-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm p-5 sm:p-8 space-y-10 pb-10">
              {bankLoading && (
                <div className="flex justify-center py-20">
                  <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!bankLoading &&
                bankOverview?.domains?.map((domain) => {
                  const catKey = domain.category;
                  const catLabel = DOMAIN_LABELS[catKey] || catKey;
                  const catAnswered = (domain.topics || []).reduce(
                    (acc, t) => acc + (t.correct || 0) + (t.wrong || 0),
                    0
                  );
                  const timeMap = readTopicSecondsMap();
                  return (
                    <section key={catKey} className="space-y-4">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                          {catLabel}
                        </h2>
                        <span className="text-sm font-bold tabular-nums px-3 py-1.5 rounded-full bg-sky-500 text-white shadow-sm">
                          {catAnswered}/{domain.total || 0}
                        </span>
                      </div>
                      {(!domain.topics || domain.topics.length === 0) && (
                        <p className="text-sm text-slate-400">
                          No questions available in this section yet.
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(domain.topics || []).map((t, i) => {
                          const tot = t.total || 0;
                          const cor = t.correct || 0;
                          const wr = t.wrong || 0;
                          const done = cor + wr;
                          const pct =
                            tot > 0 ? Math.round((done / tot) * 100) : 0;
                          const tk = `${subjectCfg.subject}|${catKey}|${t.topic || ''}`;
                          const sec = timeMap[tk] || 0;
                          return (
                            <motion.div
                              key={`${catKey}-${t.topic}-${i}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="relative flex flex-col sm:flex-row rounded-xl border border-slate-200 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                            >
                              <div className="relative flex-1 min-w-0 overflow-hidden min-h-[128px]">
                                <div
                                  className="pointer-events-none absolute inset-0 overflow-hidden"
                                  aria-hidden
                                >
                                  <div
                                    className="absolute right-[-14%] top-1/2 h-[min(120%,340px)] w-[min(78%,360px)] bg-contain bg-right bg-no-repeat opacity-[0.86] sm:opacity-[0.95]"
                                    style={{
                                      backgroundImage: `url(${subjectWatermark})`,
                                      transform:
                                        'translateY(-50%) rotate(-12deg)',
                                    }}
                                  />
                                </div>
                                <div
                                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/15 via-white/45 to-white/78"
                                  aria-hidden
                                />
                                <div className="relative z-[1] px-4 py-4 flex flex-col justify-between h-full min-h-[128px]">
                                  <h3 className="font-extrabold text-slate-800 text-base sm:text-lg leading-snug line-clamp-3 pr-1">
                                    {t.topic_label || t.topic || '—'}
                                  </h3>
                                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                                    <span className="font-bold text-slate-800">
                                      {tot} Qs
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                                      <Clock size={14} />
                                      {formatShortDuration(sec)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex sm:flex-col items-center gap-2 sm:gap-2.5 px-3 py-3 sm:w-[152px] shrink-0 bg-white border-t sm:border-t-0 sm:border-l border-slate-200 shadow-[inset_4px_0_0_0_rgba(248,250,252,0.9)]">
                                <TopicProgressRing
                                  pct={pct}
                                  pctClass="fill-emerald-600"
                                />
                                <div className="flex w-full items-center justify-center gap-3 px-0.5">
                                  <span className="inline-flex items-center gap-1.5">
                                    <TopicStatBadge variant="ok">
                                      <Check
                                        className="h-[16px] w-[16px]"
                                        strokeWidth={3}
                                      />
                                    </TopicStatBadge>
                                    <span className="text-base font-bold tabular-nums text-emerald-600">
                                      {cor}
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <TopicStatBadge variant="bad">
                                      <X
                                        className="h-[16px] w-[16px]"
                                        strokeWidth={3}
                                      />
                                    </TopicStatBadge>
                                    <span className="text-base font-bold tabular-nums text-red-600">
                                      {wr}
                                    </span>
                                  </span>
                                </div>
                                <div className="w-full border-t border-slate-200/90 pt-2 text-center text-sm font-bold tabular-nums">
                                  <span className="text-sky-600">{done}</span>
                                  <span className="text-slate-400">/{tot}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => selectTopic(catKey, t.topic)}
                                  className="mt-auto w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border-0 px-2 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] bg-sky-500 text-white shadow-[0_4px_0_0_#075985] transition-all hover:bg-sky-600 active:translate-y-[2px] active:shadow-[0_2px_0_0_#075985]"
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
                                    <ChevronRight
                                      className="h-5 w-5 text-white"
                                      strokeWidth={3}
                                    />
                                  </span>
                                  PRACTICE
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── PRACTICE PHASE ── */}
      {phase === 'practice' && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white overflow-hidden">
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 z-[999] h-[3px] overflow-hidden">
              <div
                className="h-full bg-sky-500 animate-[loading-bar_1.2s_ease-in-out_infinite]"
                style={{ animation: 'loading-bar 1.2s ease-in-out infinite' }}
              />
            </div>
          )}
          <style>{`
            @keyframes loading-bar {
              0% { width: 0%; margin-left: 0%; }
              50% { width: 70%; margin-left: 15%; }
              100% { width: 0%; margin-left: 100%; }
            }
          `}</style>

          {/* ── TOP HEADER ── */}
          <header className="flex-shrink-0 flex items-center min-h-[76px] py-3 border-b border-gray-200 bg-white px-6 sm:px-10 lg:px-14 gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 min-w-0 sm:min-w-[200px]">
              <button
                type="button"
                onClick={backToTopics}
                className="flex items-center gap-1.5 text-[13px] sm:text-[15px] font-semibold text-gray-800 hover:text-gray-950 transition-colors"
              >
                <ChevronLeft size={18} strokeWidth={2.5} className="shrink-0" />{' '}
                Go back
              </button>
              <div
                className="hidden sm:block w-px h-5 bg-gray-200 shrink-0"
                aria-hidden
              />
              <button
                type="button"
                className="hidden sm:flex items-center gap-1.5 text-[13px] sm:text-[15px] font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Directions <ChevronDown size={15} className="shrink-0" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-2">
              {!timerHidden ? (
                <span className="text-[23px] sm:text-[25px] font-bold tabular-nums text-gray-900 leading-none tracking-tight">
                  {formatMmSs(questionElapsedSec)}
                </span>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
              <div className="flex items-center gap-2.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setTimerHidden((h) => !h)}
                  className="text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded-full px-2.5 py-0.5 hover:bg-gray-50"
                >
                  {timerHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0 sm:min-w-[220px] justify-end">
              {isMath && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCalc((v) => !v)}
                    className={`flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-colors min-w-[4.5rem] ${showCalc ? 'text-sky-700 bg-sky-50' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Calculator
                      size={22}
                      strokeWidth={2}
                      className="shrink-0"
                    />
                    <span>Calculator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRef(true)}
                    className="flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors min-w-[4.5rem]"
                  >
                    <FileText size={22} strokeWidth={2} className="shrink-0" />
                    <span>Reference</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors min-w-[3.5rem]"
              >
                <MoreHorizontal
                  size={22}
                  strokeWidth={2}
                  className="shrink-0"
                />
                <span>More</span>
              </button>
            </div>
          </header>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <BookOpen size={40} strokeWidth={1.5} />
                <p className="font-semibold">
                  No questions found for this filter
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${page}-${currentIdx}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className={
                    hasContext
                      ? 'flex-1 flex flex-col overflow-hidden bg-white'
                      : 'flex-1 overflow-y-auto bg-white'
                  }
                >
                  {question &&
                    (hasContext ? (
                      <div className="flex h-full flex-1 flex-col overflow-hidden px-4 sm:px-6 md:px-10 xl:px-14">
                        <div
                          ref={splitContainerRef}
                          className="flex min-h-0 flex-1 overflow-hidden"
                        >
                          <div
                            className="min-h-0 min-w-0 shrink-0 overflow-y-auto py-5 pl-1 pr-5 sm:pl-2 sm:pr-6"
                            style={{ width: `${passageSplitPct}%` }}
                          >
                            {question.passage && (
                              <div className="text-[16px] text-gray-900 leading-[1.9] font-serif sm:text-[17px] [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:my-1 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic">
                                <PassageText text={question.passage} />
                              </div>
                            )}
                            {question.table_data && (
                              <TableRender data={question.table_data} />
                            )}
                          </div>
                          <button
                            type="button"
                            role="separator"
                            aria-orientation="vertical"
                            aria-valuenow={Math.round(passageSplitPct)}
                            aria-valuemin={28}
                            aria-valuemax={72}
                            aria-label="Resize passage and question panels"
                            onPointerDown={onPassageSplitPointerDown}
                            className="group relative z-[2] flex w-2.5 shrink-0 cursor-col-resize touch-none select-none flex-col items-center justify-center border-x border-gray-200 bg-gray-100/90 hover:bg-sky-100/80 active:bg-sky-100"
                          >
                            <span className="pointer-events-none rounded-md bg-white/90 px-0.5 py-2 shadow-sm ring-1 ring-gray-200/80 group-hover:ring-sky-200">
                              <GripVertical
                                size={14}
                                className="text-gray-500 group-hover:text-sky-700"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                            </span>
                          </button>
                          <div className="flex min-h-0 min-w-[260px] flex-1 flex-col bg-white">
                            <div className="flex-shrink-0 bg-white pt-5 pr-1 pl-5 sm:pr-2 sm:pl-6">
                              <QuestionChromeBar
                                globalIdx={globalIdx}
                                isSaved={question.is_saved}
                                onToggleSave={() => handleSaveToggle(question)}
                                onOpenReport={() => setReportOpen(true)}
                                showCrossOutControl={
                                  question.question_type === 'MCQ'
                                }
                                crossOutMode={crossOutMode}
                                onToggleCrossOutMode={() =>
                                  setCrossOutMode((v) => !v)
                                }
                                contentClassName="rounded-xl px-3 sm:px-4 py-2"
                              />
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto bg-white pb-5 pt-4 pr-1 pl-5 sm:pr-2 sm:pl-6">
                              <MCQCard
                                question={question}
                                onAnswer={(ans) =>
                                  handleAnswer(question.id, ans)
                                }
                                userAnswer={answered?.answer}
                                showResult={resultShown}
                                showExplanation={showExplanation[question.id]}
                                subject={subject}
                                wrongMarks={wrongMarks[question.id] || {}}
                                onCheck={handleCheck}
                                crossedOut={crossedOut[question.id]}
                                onCrossOut={(key) =>
                                  handleCrossOut(question.id, key)
                                }
                                crossOutMode={crossOutMode}
                                noSplit
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 bg-white px-5 pt-6 pb-12 sm:px-8 md:px-12">
                        <QuestionChromeBar
                          globalIdx={globalIdx}
                          isSaved={question.is_saved}
                          onToggleSave={() => handleSaveToggle(question)}
                          onOpenReport={() => setReportOpen(true)}
                          showCrossOutControl={question.question_type === 'MCQ'}
                          crossOutMode={crossOutMode}
                          onToggleCrossOutMode={() =>
                            setCrossOutMode((v) => !v)
                          }
                          contentClassName="rounded-xl px-3 sm:px-4 py-2"
                        />
                        {!isMath && question.passage && (
                          <div className="text-[16px] text-gray-900 leading-[1.9] font-serif sm:text-[17px] border border-gray-200 rounded-xl p-4 bg-white [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-1 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic">
                            <PassageText text={question.passage} />
                          </div>
                        )}
                        {!isMath && question.table_data && (
                          <TableRender data={question.table_data} />
                        )}
                        <div>
                          {question.question_type === 'INPUT' ? (
                            <MathInputCard
                              question={question}
                              onAnswer={(ans) => handleAnswer(question.id, ans)}
                              userAnswer={answered?.answer}
                              showResult={resultShown}
                              showExplanation={showExplanation[question.id]}
                            />
                          ) : (
                            <MCQCard
                              question={question}
                              onAnswer={(ans) => handleAnswer(question.id, ans)}
                              userAnswer={answered?.answer}
                              showResult={resultShown}
                              showExplanation={showExplanation[question.id]}
                              subject={subject}
                              wrongMarks={wrongMarks[question.id] || {}}
                              onCheck={handleCheck}
                              crossedOut={crossedOut[question.id]}
                              onCrossOut={(key) =>
                                handleCrossOut(question.id, key)
                              }
                              crossOutMode={crossOutMode}
                              noSplit
                            />
                          )}
                        </div>
                      </div>
                    ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── BOTTOM BAR ── */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 md:px-10 xl:px-14 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] sm:pb-4">
            <div className="mx-auto flex w-full max-w-[1600px] min-h-[52px] items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowQuestionBank((v) => !v)}
                className="flex min-h-[42px] items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-[14px] font-semibold text-white tabular-nums transition-colors hover:bg-black flex-shrink-0"
              >
                {total > 0 ? `${globalIdx} of ${total}` : '—'}
                <ChevronDown
                  size={15}
                  className={`transition-transform ${showQuestionBank ? 'rotate-180' : ''}`}
                />
              </button>

              <div className="flex flex-wrap items-center justify-end gap-1.5 flex-shrink-0">
                {resultShown && question?.explanation && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowExplanation((p) => ({
                        ...p,
                        [question.id]: !p[question.id],
                      }))
                    }
                    className={`flex min-h-[42px] items-center gap-2 rounded-xl border-2 px-5 py-2.5 text-[14px] font-semibold transition-all ${
                      showExplanation[question?.id]
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-violet-500 bg-white text-violet-600 hover:bg-violet-50'
                    }`}
                  >
                    <Lightbulb size={16} strokeWidth={2} /> Explanation
                  </button>
                )}
                {!resultShown &&
                  question &&
                  (question.question_type === 'MCQ' ||
                    question.question_type === 'INPUT') && (
                    <button
                      type="button"
                      onClick={handleCheck}
                      disabled={
                        question.question_type === 'MCQ'
                          ? !answered?.answer ||
                            !!wrongMarks[question.id]?.[answered.answer]
                          : !String(answered?.answer || '').trim()
                      }
                      className="flex min-h-[40px] items-center gap-2.5 rounded-xl bg-sky-500 px-4.5 py-2 text-[14px] font-bold text-white shadow-sm shadow-sky-500/25 transition-colors hover:bg-sky-600 disabled:opacity-35"
                    >
                      <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-white text-sky-600 ring-1 ring-white/80 shadow-sm">
                        <Check size={9} strokeWidth={3} className="shrink-0" />
                      </span>
                      Check
                    </button>
                  )}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={page === 1 && currentIdx === 0}
                  className="min-h-[40px] rounded-xl border-2 border-gray-400 bg-white px-4 py-2 text-[14px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                {isLastQuestionInSet ? (
                  <button
                    type="button"
                    onClick={handleBackToPracticeList}
                    className="min-h-[40px] rounded-xl border-2 border-gray-900 bg-gray-900 px-4 py-2 text-[14px] font-semibold text-white hover:bg-black transition-colors"
                  >
                    Back to list
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!question}
                    className="min-h-[40px] rounded-xl border-2 border-gray-400 bg-white px-4 py-2 text-[14px] font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>

          <ReportIssueModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            questionId={question?.id}
          />

          <QuestionBankSidebar
            open={showQuestionBank}
            onClose={() => setShowQuestionBank(false)}
            questions={questions}
            persistedAnswers={persistedAnswers}
            currentIdx={currentIdx}
            onGoto={goTo}
            page={page}
            total={total}
            qMaxTimeMap={qMaxTimeMap}
          />

          <AnimatePresence>
            {showCalc && (
              <DesmosCalc open={showCalc} onClose={() => setShowCalc(false)} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showRef && <ReferenceSheet onClose={() => setShowRef(false)} />}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

