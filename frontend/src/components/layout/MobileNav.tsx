import { Table2, Users, LayoutGrid, Menu } from 'lucide-react'
import type { TabId } from '../../lib/nav'

type Props = {
  activeTab: TabId
  setActiveTab: (id: TabId) => void
  onMore: () => void
}

const items: { id: TabId | 'more'; label: string; icon: typeof Table2 }[] = [
  { id: 'predictions', label: 'Stats', icon: Table2 },
  { id: 'myteam', label: 'Squad', icon: Users },
  { id: 'optimal', label: 'XI', icon: LayoutGrid },
  { id: 'more', label: 'More', icon: Menu },
]

export default function MobileNav({ activeTab, setActiveTab, onMore }: Props) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-nav pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile"
    >
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id !== 'more' && activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.id === 'more' ? onMore() : setActiveTab(item.id))}
              className={`flex flex-col items-center justify-center min-h-14 min-w-14 gap-0.5 cursor-pointer ${
                active ? 'text-primary' : 'text-muted-fg'
              }`}
            >
              <Icon size={20} aria-hidden="true" strokeWidth={1.75} />
              <span className="font-label text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
