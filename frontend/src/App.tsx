import { useEffect, useState } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import ScoutPanel from './components/layout/ScoutPanel'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Predictions from './pages/Predictions'
import Captain from './pages/Captain'
import OptimalXi from './pages/OptimalXi'
import Fixtures from './pages/Fixtures'
import Squad from './pages/Squad'
import Historical from './pages/Historical'
import Chips from './pages/Chips'
import Ownership from './pages/Ownership'
import Differentials from './pages/Differentials'
import MlHoldout from './pages/MlHoldout'
import Leagues from './pages/Leagues'
import { api } from './lib/api'
import { NAV_BAR, tabFromHash, setTabHash, type TabId } from './lib/nav'

export default function App() {
  const [activeTab, setActiveTabState] = useState<TabId>(() => (typeof window !== 'undefined' ? tabFromHash() : 'predictions'))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('fplly-theme') || localStorage.getItem('fplly-v2-theme') || 'light'
  })

  const setActiveTab = (id: TabId) => {
    setActiveTabState(id)
    setTabHash(id)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('fplly-theme', theme)
  }, [theme])

  useEffect(() => {
    api.status().then(setStatus).catch(() => setStatus({ status: 'offline' }))
  }, [])

  useEffect(() => {
    const onHash = () => setActiveTabState(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="min-h-screen text-foreground font-body">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] bg-primary text-on-primary px-3 py-2 rounded-lg">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 min-h-16 glass-nav">
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[minmax(7rem,1fr)_auto_minmax(7rem,1fr)] items-center gap-3 px-4 md:px-6 py-1.5 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-border/60 cursor-pointer"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <button type="button" onClick={() => setActiveTab('dashboard')} className="font-headline text-xl font-extrabold tracking-tight cursor-pointer">
              FPLly
            </button>
          </div>
          <nav className="hidden md:flex items-center justify-center gap-0.5 flex-wrap" aria-label="Primary">
            {NAV_BAR.map((item) => {
              const current = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={current ? 'page' : undefined}
                  className={`min-h-11 px-2.5 rounded-lg text-sm font-headline font-bold cursor-pointer whitespace-nowrap transition-colors duration-200 ${
                    current ? 'bg-primary text-on-primary' : 'text-foreground hover:bg-muted/70'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="flex items-center justify-end gap-3">
            <p className="hidden sm:flex items-center gap-2 font-label text-[11px] font-medium text-muted-fg">
              <span className={`h-1.5 w-1.5 rounded-full ${status?.status === 'ready' ? 'bg-secondary' : 'bg-muted-fg'}`} aria-hidden />
              {status?.status === 'ready'
                ? `GW${status?.next_gw} live${status?.ml_ready ? ' · ML' : ''}`
                : status
                  ? 'API offline'
                  : 'Connecting'}
            </p>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg cursor-pointer hover:bg-muted/70"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main id="main" className="w-full p-4 md:p-8 max-w-[1400px] mx-auto mb-24 md:mb-0 min-w-0">
          <ErrorBoundary key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard status={status} setActiveTab={setActiveTab} />}
            {activeTab === 'myteam' && <Squad />}
            {activeTab === 'predictions' && <Predictions />}
            {activeTab === 'captain' && <Captain />}
            {activeTab === 'optimal' && <OptimalXi />}
            {activeTab === 'fixtures' && <Fixtures />}
            {activeTab === 'chips' && <Chips />}
            {activeTab === 'ownership' && <Ownership />}
            {activeTab === 'differentials' && <Differentials />}
            {activeTab === 'ml' && <MlHoldout />}
            {activeTab === 'leagues' && <Leagues />}
            {activeTab === 'historical' && <Historical />}
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} onMore={() => setSidebarOpen(true)} />
      <ScoutPanel />
    </div>
  )
}
