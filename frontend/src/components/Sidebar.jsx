import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Camera,
  Trophy,
  TrendingUp,
  Users,
  Target,
  Zap,
  Calendar,
  Brain,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  Award // For Leagues
} from 'lucide-react'

// Menu Structure
const menuItems = [
  {
    category: "Main",
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'myteam', label: 'My Team', icon: Camera },
    ]
  },
  {
    category: "Scout",
    items: [
      { id: 'predictions', label: 'Predictions', icon: TrendingUp },
      { id: 'optimal', label: 'Optimal XI', icon: Trophy },
      { id: 'differentials', label: 'Differentials', icon: Target },
      { id: 'ownership', label: 'Ownership', icon: Users },
    ]
  },
  {
    category: "Strategy",
    items: [
      { id: 'chips', label: 'Chip Strategy', icon: Zap },
      { id: 'captain', label: 'Captaincy', icon: Trophy }, // Reused Trophy for now, maybe find better
      { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    ]
  },
  {
    category: "Analysis",
    items: [
      { id: 'leagues', label: 'Leagues', icon: Award }, // New Item
      { id: 'ml', label: 'ML Insights', icon: Brain },
      { id: 'historical', label: 'History', icon: BookOpen },
    ]
  }
]

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  // Animation variants
  const sidebarVariants = {
    open: { x: 0, width: "16rem", transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", width: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    collapsed: { x: 0, width: "5rem", transition: { type: "spring", stiffness: 300, damping: 30 } } // Future desktop collapse
  }

  // Mobile check implies we use overlay mode usually, but for this "responsive" desktop design:
  // We'll stick to a simple distinct sidebar for Desktop and Drawer for mobile in App.jsx usually.
  // This component will just render the list.

  return (
    <>
      {/* Mobile Overlay */}
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

      {/* Sidebar Container */}
      <motion.aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col md:translate-x-0 ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:w-64'
          }`}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            {/* <span>⚽</span> */}
            FPLly
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {menuItems.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.category}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        setIsOpen(false) // Close on mobile selection
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group overflow-hidden
                        ${isActive
                          ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-500'} />
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute right-2"
                        >
                          <ChevronRight size={14} />
                        </motion.div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / User Profile placeholder */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">GW22 Ready</p>
              <p className="text-xs text-emerald-500">System Online</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
