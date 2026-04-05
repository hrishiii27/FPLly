import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Components
import Sidebar from './components/Sidebar'
import PredictionsTab from './components/PredictionsTab'
import CaptainTab from './components/CaptainTab'
import OptimalTeamTab from './components/OptimalTeamTab'
import FixturesTab from './components/FixturesTab'
import MyTeamTab from './components/MyTeamTab'
import HistoricalTab from './components/HistoricalTab'
import ChipsTab from './components/ChipsTab'
import OwnershipTab from './components/OwnershipTab'
import DifferentialsTab from './components/DifferentialsTab'
import MLTab from './components/MLTab'
import LeagueTab from './components/LeagueTab'
import ScoutChat from './components/ScoutChat'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [activeTab, setActiveTab] = useState('predictions')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark'
    }
    return 'dark'
  })

  // Theme Effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // Status Fetch
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setStatus(data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch status:', error)
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      
      {/* TopNavBar */}
      <header className="docked full-width top-0 sticky z-40 bg-surface">
        <div className="flex justify-between items-center px-4 md:px-8 py-4 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden font-label p-2 border border-surface-container-high rounded bg-surface">
              <span className="material-symbols-outlined text-on-surface tracking-normal">menu</span>
            </button>
            <div className="text-2xl font-black tracking-tighter text-on-surface font-headline cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              FPLly Analysis
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => setActiveTab('predictions')} className={`font-body font-medium transition-colors ${activeTab === 'predictions' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface hover:text-primary'}`}>Predictions</button>
            <button onClick={() => setActiveTab('optimal')} className={`font-body font-medium transition-colors ${activeTab === 'optimal' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface hover:text-primary'}`}>Transfers</button>
            <button onClick={() => setActiveTab('captain')} className={`font-body font-medium transition-colors ${activeTab === 'captain' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface hover:text-primary'}`}>Strategy</button>
            <button onClick={() => setActiveTab('ml')} className={`font-body font-medium transition-colors ${activeTab === 'ml' ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface hover:text-primary'}`}>Analytics</button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary text-xs font-semibold uppercase tracking-widest font-label">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              {loading ? 'Connecting' : status?.status === 'ready' ? `GW${status?.next_gw} Ready` : 'Offline'}
            </div>

            <button onClick={toggleTheme} className="p-2 hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface tracking-normal">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors hidden sm:flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface tracking-normal">settings</span>
            </button>
          </div>
        </div>
        <div className="bg-surface-container-high h-[1px] w-full"></div>
      </header>

      <div className="flex min-h-screen">
        {/* SideNavBar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        {/* Main Content */}
        <main className="md:ml-64 w-full p-4 md:p-8 max-w-screen-2xl mb-20 md:mb-0">
          <AnimatePresence mode="wait">
            <ErrorBoundary key={activeTab}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {activeTab === 'dashboard' && <SimpleDashboard status={status} setActiveTab={setActiveTab} />}
                {activeTab === 'myteam' && <MyTeamTab />}
                {activeTab === 'predictions' && <PredictionsTab />}
                {activeTab === 'captain' && <CaptainTab />}
                {activeTab === 'optimal' && <OptimalTeamTab />}
                {activeTab === 'fixtures' && <FixturesTab />}
                {activeTab === 'chips' && <ChipsTab />}
                {activeTab === 'ownership' && <OwnershipTab />}
                {activeTab === 'differentials' && <DifferentialsTab />}
                {activeTab === 'ml' && <MLTab />}
                {activeTab === 'leagues' && <LeagueTab />}
                {activeTab === 'historical' && <HistoricalTab />}
              </motion.div>
            </ErrorBoundary>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Nav Shell - Persistent for smaller screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-container-high z-50 flex justify-around py-4 pb-safe">
        <button onClick={() => setActiveTab('predictions')} className={`flex flex-col items-center gap-1 ${activeTab==='predictions' ? 'text-primary' : 'text-outline hover:text-on-surface'}`}>
          <span className="material-symbols-outlined tracking-normal">analytics</span>
          <span className="text-[10px] font-label uppercase">Stats</span>
        </button>
        <button onClick={() => setActiveTab('myteam')} className={`flex flex-col items-center gap-1 ${activeTab==='myteam' ? 'text-primary' : 'text-outline hover:text-on-surface'}`}>
          <span className="material-symbols-outlined tracking-normal">groups</span>
          <span className="text-[10px] font-label uppercase">Team</span>
        </button>
        <button onClick={() => setActiveTab('optimal')} className={`flex flex-col items-center gap-1 ${activeTab==='optimal' ? 'text-primary' : 'text-outline hover:text-on-surface'}`}>
          <span className="material-symbols-outlined tracking-normal">auto_fix</span>
          <span className="text-[10px] font-label uppercase">Picks</span>
        </button>
        <button onClick={() => setSidebarOpen(true)} className={`flex flex-col items-center gap-1 text-outline hover:text-on-surface`}>
          <span className="material-symbols-outlined tracking-normal">menu</span>
          <span className="text-[10px] font-label uppercase">More</span>
        </button>
      </div>

      {/* Persistent global components */}
      <ScoutChat />
    </div>
  )
}

function SimpleDashboard({ status, setActiveTab }: any) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center">
      <h1 className="font-headline text-5xl md:text-7xl font-black text-on-surface leading-[0.9] tracking-tighter mb-6">
        FPLly <span className="text-primary italic">DASHBOARD</span>
      </h1>
      <p className="mt-2 text-lg text-outline font-body leading-relaxed max-w-xl mx-auto mb-8">
        Welcome to your new Kinetic Editorial command center. AI models are online for GW{status?.next_gw}.
      </p>
      <button 
        onClick={() => setActiveTab('predictions')}
        className="bg-primary text-on-primary font-headline py-4 px-8 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all text-lg cursor-pointer"
      >
        Explore Intel <span className="material-symbols-outlined tracking-normal">arrow_forward</span>
      </button>
    </div>
  )
}

export default App
