import { ArrowBigUp, ArrowLeft, ArrowRight, ArrowUp, Baby, ChevronsDown, ChevronsUp, Fuel, Hand, Lightbulb, Megaphone, Play, UserRound, Zap } from 'lucide-react'

const ICONS = {
  left: ArrowLeft,
  right: ArrowRight,
  straight: ArrowUp,
  stop: Hand,
  go: Play,
  jump: ArrowBigUp,
  slow: ChevronsDown,
  fast: ChevronsUp,
  honk: Megaphone,
  lights: Lightbulb,
  fuel: Fuel,
  pickup: UserRound,
  turbo: Zap,
  school: Baby,
}

/* The arrow / hand / horn … that stands for a driving command. */
export default function ActionIcon({ action, size = 18, className = '', strokeWidth }) {
  const Icon = ICONS[action] || ArrowUp
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
