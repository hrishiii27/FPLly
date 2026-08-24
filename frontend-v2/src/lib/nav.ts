import {
  LayoutDashboard,
  Table2,
  Crown,
  CalendarDays,
  Users,
  LayoutGrid,
  Sparkles,
  Radar,
  PieChart,
  Cpu,
  History,
  Trophy,
} from 'lucide-react'

export type TabId =
  | 'dashboard'
  | 'predictions'
  | 'captain'
  | 'fixtures'
  | 'myteam'
  | 'optimal'
  | 'chips'
  | 'differentials'
  | 'ownership'
  | 'ml'
  | 'historical'
  | 'leagues'

export const NAV_PRIMARY: { id: TabId; label: string }[] = [
  { id: 'predictions', label: 'Predictions' },
  { id: 'myteam', label: 'Squad' },
  { id: 'optimal', label: 'Optimal XI' },
  { id: 'captain', label: 'Captain' },
  { id: 'ml', label: 'ML' },
]

const PRIMARY_IDS = new Set(NAV_PRIMARY.map((i) => i.id))

export const NAV_GROUPS: { label: string; items: { id: TabId; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: 'Matchweek',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'predictions', label: 'Predictions', icon: Table2 },
      { id: 'captain', label: 'Captain', icon: Crown },
      { id: 'fixtures', label: 'Fixtures', icon: CalendarDays },
    ],
  },
  {
    label: 'Squad',
    items: [
      { id: 'myteam', label: 'Squad', icon: Users },
      { id: 'optimal', label: 'Optimal XI', icon: LayoutGrid },
      { id: 'chips', label: 'Chips', icon: Sparkles },
    ],
  },
  {
    label: 'Market',
    items: [
      { id: 'differentials', label: 'Differentials', icon: Radar },
      { id: 'ownership', label: 'Ownership', icon: PieChart },
    ],
  },
  {
    label: 'Models',
    items: [
      { id: 'ml', label: 'ML holdout', icon: Cpu },
      { id: 'historical', label: 'History', icon: History },
    ],
  },
  {
    label: 'Leagues',
    items: [{ id: 'leagues', label: 'Mini-league', icon: Trophy }],
  },
]

export const SIDEBAR_GROUPS = NAV_GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) => !PRIMARY_IDS.has(item.id)),
})).filter((group) => group.items.length > 0)

const TAB_SET = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)))

export function tabFromHash(): TabId {
  const id = window.location.hash.replace(/^#/, '') as TabId
  return TAB_SET.has(id) ? id : 'predictions'
}

export function setTabHash(id: TabId) {
  if (window.location.hash.replace(/^#/, '') !== id) {
    history.replaceState(null, '', `#${id}`)
  }
}
