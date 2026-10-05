/*
 * TOBY'S DAY — at the doctor: a calm mint surgery with an eye chart, a height
 * chart, the examination bed Toby sits on, the doctor's desk, and Mum next to
 * a waiting chair. The doctor holds what he uses (thermometer, stethoscope, medicine)
 * and the scene shows it working (a fever reading, heartbeats, a deep breath).
 * Room props: { layer, w, uid, acting, action, reduced, speaker, talker, sp, chosen }.
 */
import { motion as Motion } from 'framer-motion'
import { ItemArt } from './items'
import { Doctor, Mum } from './characters'
import { AT0, BW, BX, FONT, SKY, at } from './world-geo'
import { Floor, Grad, Pop, Sparkles, Wall } from './scene-kit'

const HEART = 'M0 6C-12-2-9-12-3-11-1-10.6 0-9 0-8c0-1 1-2.6 3-3 6-1 9 9-3 17z'
const CHART = [['E', 15], ['F P', 11], ['T O Z', 8], ['L P E D', 6]]

/* what the doctor holds for each action */
const TOOL = { thermo: 'thermometer', heartbeat: 'stethoscope', breath: 'stethoscope', medicine: 'medicine' }

export function ClinicRoom({ layer, w, uid, acting, action, reduced, speaker, talker, sp, chosen }) {
  const talks = (who) => speaker === 'other' && talker === who
  if (layer === 'front') {
    const [cx, cy] = at(sp, 100, 180)          // Toby's chest
    const [mx, my] = at(sp, 120, 138)          // next to his mouth
    return (
      <g>
        {/* the bed's front edge, once Toby sits on it */}
        {w.sitting && (
          <g>
            <rect x="70" y="250" width="150" height="10" rx="5" fill="#E2E8F0" />
            <rect x="74" y="258" width="142" height="6" rx="3" fill="#CBD5E1" />
          </g>
        )}
        {acting && action === 'thermo' && (
          <Motion.g style={AT0} initial={reduced ? { x: mx + 34, y: my - 56, opacity: 1 } : { x: mx + 20, y: my - 30, opacity: 0, scale: 0.6 }}
            animate={{ x: mx + 34, y: my - 56, opacity: 1, scale: 1 }} transition={{ delay: 1.4, type: 'spring', stiffness: 260, damping: 16 }}>
            <rect x="-26" y="-14" width="52" height="24" rx="8" fill="#fff" stroke="#FCA5A5" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fontSize="13" fontWeight="900" fill="#DC2626" fontFamily={FONT}>37.6°</text>
          </Motion.g>
        )}
        {acting && action === 'heartbeat' && !reduced && [0, 1, 2].map(i => (
          <Motion.g key={i} style={AT0} initial={{ x: cx, y: cy, scale: 0, opacity: 0 }}
            animate={{ x: cx + 30 + i * 18, y: cy - 30 - i * 16, scale: [0, 1.1, 0.9], opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.35 }}>
            <path d={HEART} fill="#F43F5E" />
          </Motion.g>
        ))}
        {acting && action === 'heartbeat' && <Pop x={cx + 60} y={cy - 70} text="ba-dum!" size={14} fill="#FECDD3" stroke="#BE123C" delay={0.6} reduced={reduced} repeat />}
        {acting && action === 'medicine' && <Sparkles x={mx} y={my} r={26} delay={1} reduced={reduced} colors={['#FDBA74', '#fff', '#FDE047']} />}
        {acting && action === 'better' && <Sparkles x={at(sp, 100, 60)[0]} y={at(sp, 100, 60)[1]} r={56} n={8} delay={0.4} reduced={reduced} />}
        {acting && action === 'byedoc' && (
          <Motion.g style={AT0} initial={reduced ? { x: cx - 18, y: cy - 6 } : { x: 300, y: 170, opacity: 0, rotate: 0 }}
            animate={{ x: cx - 18, y: cy - 6, opacity: 1, rotate: -20 }} transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}>
            <circle r="9" fill="#FDE047" stroke="#F59E0B" strokeWidth="1.5" />
            <path d="M0-5l1.5 3 3.4.5-2.5 2.4.6 3.4L0 2.7l-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#fff" />
          </Motion.g>
        )}
        {chosen && acting && ['head', 'throatache', 'tummyache'].includes(chosen.act) && (
          <Pop x={at(sp, 100, 20)[0] + 40} y={at(sp, 100, 20)[1]} text="ouch!" size={14} fill="#FEF3C7" stroke="#B45309" delay={0.5} reduced={reduced} />
        )}
      </g>
    )
  }

  const tool = acting ? TOOL[action] : null
  const doctorX = acting && ['thermo', 'heartbeat', 'breath', 'medicine'].includes(action) ? 262 : 292
  return (
    <g>
      <defs>
        <Grad id={`${uid}wall`} stops={['#ECFDF5', '#D1FAE5']} />
        <Grad id={`${uid}sky`} stops={SKY.day} />
      </defs>
      <Wall fill={`url(#${uid}wall)`} />
      <rect x={BX} y="168" width={BW} height="68" fill="#A7F3D0" opacity="0.55" />
      <rect x={BX} y="164" width={BW} height="6" fill="#fff" />
      {/* window with a tree */}
      <rect x="-6" y="36" width="92" height="92" rx="10" fill="#fff" />
      <rect x="0" y="42" width="80" height="80" rx="6" fill={`url(#${uid}sky)`} />
      <circle cx="54" cy="82" r="22" fill="#4ADE80" />
      <circle cx="34" cy="94" r="16" fill="#22C55E" />
      <rect x="44" y="96" width="6" height="26" fill="#92400E" />
      <rect x="38" y="42" width="4" height="80" fill="#fff" />
      {/* eye chart */}
      <rect x="128" y="34" width="46" height="72" rx="4" fill="#fff" stroke="#CBD5E1" strokeWidth="2" />
      {CHART.map(([t, s], i) => (
        <text key={t} x="151" y={52 + i * 15 - (4 - i)} textAnchor="middle" fontSize={s} fontWeight="900" fill="#0F172A" fontFamily={FONT} letterSpacing="1">{t}</text>
      ))}
      {/* the green cross */}
      <g transform="translate(222 60)">
        <circle r="18" fill="#fff" />
        <path d="M-4-11h8v7h7v8h-7v7h-8v-7h-7v-8h7z" fill="#10B981" />
      </g>
      {/* height chart */}
      <g>
        <rect x="258" y="44" width="16" height="120" rx="3" fill="#fff" stroke="#CBD5E1" strokeWidth="1.5" />
        {['#F472B6', '#FACC15', '#34D399', '#38BDF8', '#A78BFA'].map((c, i) => <rect key={c} x="258" y={44 + i * 24} width="16" height="24" fill={c} opacity="0.55" />)}
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M258 ${56 + i * 12}h${i % 2 ? 5 : 8}`} stroke="#334155" strokeWidth="1" />)}
      </g>
      {/* clock */}
      <circle cx="328" cy="58" r="16" fill="#fff" stroke="#10B981" strokeWidth="3.5" />
      <path d="M328 58V48M328 58l7 4" stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
      {/* the floor first: everything below stands on it (drawn after it, nothing sinks in) */}
      <Floor fill="#CBD5E1" />
      {Array.from({ length: 24 }, (_, i) => <rect key={i} x={BX + i * 40} y={i % 2 ? 262 : 282} width="20" height="20" fill="#fff" opacity="0.35" />)}
      {/* desk with a computer and a jar of lollipops (right, partly wide) */}
      <g>
        <rect x="318" y="182" width="170" height="10" rx="3" fill="#94A3B8" />
        <rect x="326" y="192" width="8" height="44" fill="#64748B" />
        <rect x="470" y="192" width="8" height="44" fill="#64748B" />
        <rect x="380" y="140" width="60" height="40" rx="4" fill="#334155" />
        <rect x="384" y="144" width="52" height="30" rx="2" fill="#38BDF8" opacity="0.7" />
        <path d="M388 166l8-8 6 5 10-10 14 13" stroke="#fff" strokeWidth="2" fill="none" opacity="0.8" />
        <rect x="404" y="180" width="12" height="4" fill="#334155" />
        <rect x="336" y="160" width="20" height="22" rx="5" fill="#fff" opacity="0.6" stroke="#CBD5E1" />
        {[['#F43F5E', 340, 158], ['#FACC15', 346, 154], ['#34D399', 352, 158]].map(([c, x, y]) => (
          <g key={c}><path d={`M${x} ${y}v14`} stroke="#fff" strokeWidth="1.5" /><circle cx={x} cy={y} r="4" fill={c} /></g>
        ))}
      </g>
      {/* sink (left, wide) */}
      <g>
        <rect x="-150" y="150" width="70" height="86" rx="6" fill="#E2E8F0" />
        <rect x="-156" y="144" width="82" height="10" rx="4" fill="#fff" />
        <path d="M-114 144v-16h10" stroke="#94A3B8" strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="-140" y="120" width="10" height="24" rx="3" fill="#F9A8D4" />
      </g>
      {/* a waiting chair by the wall, and Mum standing next to it (left) */}
      <g>
        <rect x="-62" y="208" width="10" height="34" rx="3" fill="#0D9488" />
        <rect x="-64" y="236" width="52" height="9" rx="4" fill="#14B8A6" />
        <rect x="-60" y="245" width="5" height="22" fill="#115E59" />
        <rect x="-22" y="245" width="5" height="22" fill="#115E59" />
        <g transform="translate(36 270) scale(.9)">
          <Mum talking={talks('mum')} cheer={acting && action === 'better'} reduced={reduced} />
        </g>
      </g>
      {/* the examination bed */}
      <g>
        <rect x="76" y="258" width="8" height="40" fill="#94A3B8" />
        <rect x="206" y="258" width="8" height="40" fill="#94A3B8" />
        <rect x="68" y="238" width="154" height="16" rx="8" fill="#5EEAD4" />
        <rect x="68" y="236" width="40" height="12" rx="6" fill="#fff" />
        <path d="M110 238h108" stroke="#fff" strokeWidth="2" opacity="0.5" />
      </g>
      {/* the doctor */}
      <Motion.g initial={false} animate={{ x: doctorX }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 14 }}>
        <g transform="translate(0 290) scale(1.18)">
          <Doctor talking={talks('doctor')} hold={tool} leftAngle={tool ? 72 : 0} wave={acting && (action === 'hellodoc' || action === 'byedoc')}
            cheer={acting && action === 'better'} reduced={reduced} />
        </g>
      </Motion.g>
    </g>
  )
}
