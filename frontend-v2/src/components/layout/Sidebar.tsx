import { NAV_GROUPS, SIDEBAR_GROUPS, type TabId } from '../../lib/nav'

type Props = {
  activeTab: TabId
  setActiveTab: (id: TabId) => void
  open: boolean
  onClose: () => void
}

function NavGroup({
  group,
  activeTab,
  setActiveTab,
  onClose,
}: {
  group: (typeof NAV_GROUPS)[number]
  activeTab: TabId
  setActiveTab: (id: TabId) => void
  onClose: () => void
}) {
  return (
    <div className="mb-5">
      <p className="px-3 mb-1 font-label text-[10px] font-medium text-muted-fg">{group.label}</p>
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab(item.id)
                  onClose()
                }}
                className={`w-full flex items-center gap-2 min-h-11 px-3 rounded-lg text-left cursor-pointer transition-colors duration-200 ${
                  active ? 'bg-primary text-on-primary' : 'text-foreground hover:bg-muted/70'
                }`}
              >
                <Icon size={18} aria-hidden="true" strokeWidth={1.75} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Sidebar({ activeTab, setActiveTab, open, onClose }: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 bg-background/70 z-40 cursor-pointer"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-60 overflow-y-auto border-r border-border/60 glass-aside transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <nav className="py-4 px-3 hidden md:block" aria-label="More sections">
          {SIDEBAR_GROUPS.map((group) => (
            <NavGroup key={group.label} group={group} activeTab={activeTab} setActiveTab={setActiveTab} onClose={onClose} />
          ))}
        </nav>
        <nav className="py-4 px-3 md:hidden" aria-label="Primary">
          {NAV_GROUPS.map((group) => (
            <NavGroup key={group.label} group={group} activeTab={activeTab} setActiveTab={setActiveTab} onClose={onClose} />
          ))}
        </nav>
      </aside>
    </>
  )
}
