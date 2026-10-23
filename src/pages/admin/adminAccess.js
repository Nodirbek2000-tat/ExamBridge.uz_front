/**
 * Admin panel tiers — the UI half of the rules.
 *
 * The server is what actually enforces this (sat/accounts/admin_access.py);
 * this table decides what the admin SEES. Sections a tier may not use are
 * removed from the menu entirely — there is no "you don't have permission"
 * screen, the item simply isn't there.
 *
 * Tiers:
 *   'super' — the owner. Everything, including the Django admin link.
 *   1       — everything in this panel, no Django admin.
 *   2       — view only; no AI Structures, no imports, no add/delete.
 *   3       — view only; Users / Learning Centers / Reports.
 *
 * Keep AREA names in step with accounts/admin_access.py.
 */

export const AREA = {
  USERS: 'users',
  LEADERBOARD: 'leaderboard',
  TESTMAKON: 'testmakon',
  SAT: 'sat',
  IELTS: 'ielts',
  CEFR: 'cefr',
  STUDY: 'study',
  GAMES: 'games',
  CENTERS: 'centers',
  REPORTS: 'reports',
  SYSTEM: 'system',
  AI: 'ai',
}

const LEVEL_2_AREAS = [
  AREA.USERS, AREA.LEADERBOARD, AREA.TESTMAKON, AREA.SAT, AREA.IELTS,
  AREA.CEFR, AREA.STUDY, AREA.GAMES, AREA.CENTERS, AREA.REPORTS, AREA.SYSTEM,
]

const LEVEL_3_AREAS = [AREA.USERS, AREA.CENTERS, AREA.REPORTS]

/** Normalises whatever /auth/me/ returned into 'super' | 1 | 2 | 3 | null. */
export function tierOf(user) {
  if (!user) return null
  if (user.is_superuser) return 'super'
  if (!user.is_staff) return null
  const t = user.admin_tier
  if (t === 'super') return 'super'
  const n = Number(t)
  return n === 1 || n === 2 || n === 3 ? n : 1   // older admins default to full
}

export function canSee(tier, area) {
  if (tier === 'super' || tier === 1) return true
  if (tier === 2) return LEVEL_2_AREAS.includes(area)
  if (tier === 3) return LEVEL_3_AREAS.includes(area)
  return false
}

/** May this tier create / edit / delete anything? Levels 2 and 3 never can. */
export function canWrite(tier) {
  return tier === 'super' || tier === 1
}

/** Only the owner sees the Django admin link. */
export function canSeeDjangoAdmin(tier) {
  return tier === 'super'
}

/**
 * Which area an /admin-panel/... route belongs to, so typing a URL by hand
 * can't reach a section the tier may not see. Longest prefixes first.
 */
const ROUTE_AREAS = [
  ['/admin-panel/users', AREA.USERS],
  ['/admin-panel/leaderboard', AREA.LEADERBOARD],
  ['/admin-panel/testmakon-users', AREA.TESTMAKON],
  ['/admin-panel/sat', AREA.SAT],
  ['/admin-panel/ielts', AREA.IELTS],
  ['/admin-panel/cefr', AREA.CEFR],
  ['/admin-panel/study', AREA.STUDY],
  ['/admin-panel/games', AREA.GAMES],
  ['/admin-panel/centers', AREA.CENTERS],
  ['/admin-panel/ai-structures', AREA.AI],
  ['/admin-panel/reports', AREA.REPORTS],
  ['/admin-panel/system', AREA.SYSTEM],
]

export function areaForAdminPath(pathname) {
  const hit = ROUTE_AREAS.find(([prefix]) => pathname.startsWith(prefix))
  return hit ? hit[1] : null      // null = the dashboard, open to every tier
}

export const TIER_LABELS = {
  super: 'Super Admin',
  1: '1 — Full access',
  2: '2 — View only',
  3: '3 — Limited',
}
