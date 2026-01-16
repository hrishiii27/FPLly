import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Sun, Moon, Github, Camera } from 'lucide-react'

// Components
import Sidebar from './components/Sidebar' // New Sidebar
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
import LeagueTab from './components/LeagueTab' // New
import ScoutChat from './components/ScoutChat' // New

function App() {
  const [activeTab, setActiveTab] = useState('predictions') // Default tab
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [status, setStatus] = useState(null)
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
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Animation Variants for Page Transitions
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  }

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex transition-colors">

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Top Header */}
        <header className="h-16 flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 z-40 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent hidden md:block">
              {/* Dynamic Title based on Active Tab? Or just App Name */}
              GW{status?.next_gw || '...'} Setup
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {loading ? 'Connecting...' : status?.status === 'ready' ? 'System Online' : 'Connecting...'}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode='wait'>
                {theme === 'dark' ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <Sun size={20} />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Moon size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* GitHub Link (Optional) */}
            <a href="https://github.com/vaastav/Fantasy-Premier-League" target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <Github size={20} />
            </a>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Page Title & Breadcrumb (Optional) */}
            <div className="mb-2">
              <h1 className="text-3xl font-bold capitalize text-slate-900 dark:text-white">
                {activeTab.replace('-', ' ')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                AI-powered analysis for Gameweek {status?.next_gw}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="w-full"
              >
                {/* Dashboard / Home View logic can be added here if 'dashboard' tab exists */}
                {activeTab === 'dashboard' && (
                  <DashboardView status={status} setActiveTab={setActiveTab} />
                )}

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
            </AnimatePresence>
          </div>

          <Footer />
        </main>
      </div>

      <ScoutChat />
    </div>
  )
}

// Simple Dashboard Component for the "Home" tab
function DashboardView({ status, setActiveTab }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          icon="⚡"
          label="Next Deadline"
          value={`GW${status?.next_gw}`}
          sub="Sat 11:00 AM"
          color="blue"
        />
        <DashboardCard
          icon="🤖"
          label="AI Confidence"
          value="92.4%"
          sub="Based on 5 seasons"
          color="purple"
        />
        <DashboardCard
          icon="🔥"
          label="Player in Form"
          value="Palmer"
          sub="12.4 form rating"
          color="pink"
        />
        <DashboardCard
          icon="💎"
          label="Top Differential"
          value="Kudus"
          sub="3.2% ownership"
          color="emerald"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('myteam')}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Camera size={120} />
          </div>
          <h3 className="text-2xl font-bold mb-2">Analyze My Team 📸</h3>
          <p className="text-purple-100 mb-4 max-w-sm">Upload your squad screenshot for instant AI transfer recommendations and chip strategy.</p>
          <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-50 transition-colors">
            Upload & Analyze →
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => setActiveTab('predictions')}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">🔎 Scout Players</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Explore 600+ player predictions for GW{status?.next_gw} sorted by xPts.</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium">Haaland (8.4)</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium">Salah (7.9)</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium">Saka (6.2)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardCard({ icon, label, value, sub, color }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
    purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
    pink: "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/30",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  }
  return (
    <div className={`p-5 rounded-xl border ${colors[color]} transition-all hover:scale-[1.02] cursor-default`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <h4 className="text-2xl font-bold">{value}</h4>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-xs opacity-70">{sub}</p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-xs">
      <p>© 2026 FPLly AI. Unofficial FPL Companion.</p>
    </footer>
  )
}

export default App
