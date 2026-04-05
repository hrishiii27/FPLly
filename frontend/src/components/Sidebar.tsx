import { motion, AnimatePresence } from 'framer-motion'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'myteam', label: 'Squad Hub', icon: 'groups' },
  { id: 'predictions', label: 'Expert Intel', icon: 'psychology' },
  { id: 'optimal', label: 'Optimal XI', icon: 'stars' },
  { id: 'captain', label: 'Captaincy', icon: 'military_tech' },
  { id: 'differentials', label: 'Differentials', icon: 'radar' },
  { id: 'ownership', label: 'Ownership', icon: 'pie_chart' },
  { id: 'chips', label: 'Chip Strategy', icon: 'auto_fix' },
  { id: 'fixtures', label: 'Fixture Ticker', icon: 'calendar_month' },
  { id: 'ml', label: 'ML Insights', icon: 'device_thermostat' },
  { id: 'historical', label: 'History', icon: 'history' },
  { id: 'leagues', label: 'Community', icon: 'forum' }
]

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: any) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low flex flex-col border-r border-surface-container-high shadow-[20px_0_40px_rgba(56,56,51,0.03)] z-30 pt-20 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="px-6 py-6 border-b border-surface-container-high mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-on-primary p-2 rounded-lg">
              <span className="material-symbols-outlined tracking-normal">stars</span>
            </div>
            <div>
              <h3 className="font-headline text-on-surface font-bold leading-tight">FPLly</h3>
              <p className="font-label text-xs uppercase tracking-widest text-outline">Rank: Live</p>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 mx-2 rounded-lg group transition-all duration-200 ${isActive
                    ? 'text-primary font-bold bg-background translate-x-1'
                    : 'text-on-background hover:bg-surface-container-high'
                  }`}
              >
                <span className={`material-symbols-outlined tracking-normal transition-colors ${isActive ? 'text-primary' : 'group-hover:text-primary'
                  }`}>
                  {item.icon}
                </span>
                <span className="font-label text-xs uppercase tracking-widest">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto p-4 space-y-4">
          <button 
            onClick={() => { setActiveTab('optimal'); setIsOpen(false); }}
            className="w-full bg-primary text-on-primary font-headline py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 cursor-pointer">
            <span className="material-symbols-outlined tracking-normal">auto_fix</span>
            Optimize Team
          </button>
          
          <div className="space-y-1 border-t border-surface-container-high pt-4">
            <button className="w-full flex items-center gap-3 text-on-background p-3 mx-2 font-label text-xs uppercase tracking-widest hover:text-primary transition-colors">
              <span className="material-symbols-outlined tracking-normal">help</span> Support
            </button>
            <button className="w-full flex items-center gap-3 text-on-background p-3 mx-2 font-label text-xs uppercase tracking-widest hover:text-primary transition-colors">
              <span className="material-symbols-outlined tracking-normal">logout</span> Logout
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
