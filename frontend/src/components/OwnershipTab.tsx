import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full my-4">
      <div className="animate-spin w-5 h-5 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function OwnershipTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOwnership() {
      try {
        const res = await fetch('/api/ownership')
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch ownership:', error)
      }
      setLoading(false)
    }
    fetchOwnership()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
        <Spinner />
        <span className="font-mono text-xs text-primary uppercase tracking-widest">Compiling Ownership Data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Market Consensus</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Ownership <span className="text-primary italic">Trends</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Track what the masses are doing. Identify essential template players to own, and spot high-risk traps to drop.
            </p>
          </div>
        </div>
      </section>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Players Analyzed" value={data?.summary?.total_analyzed || 0} icon="group" />
        <StatBox label="Template (>25%)" value={data?.summary?.template_count || 0} icon="pie_chart" />
        <StatBox label="Essentials" value={data?.summary?.essential_count || 0} icon="star" highlight />
        <StatBox label="Differentials" value={data?.summary?.differential_count || 0} icon="trending_up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Essential Players */}
        <div className="bg-surface-container-lowest border border-primary/30 rounded-xl p-6 relative overflow-hidden flex flex-col group transition-colors hover:border-primary/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors pointer-events-none"></div>
          
          <div className="flex items-end justify-between mb-6 relative z-10 border-b border-surface-container-high pb-4">
            <div>
              <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-2 text-xl">
                <span className="material-symbols-outlined text-primary">verified</span> Essentials
              </h3>
              <span className="font-label text-[10px] uppercase tracking-widest text-primary mt-1 block">Must-Own Core</span>
            </div>
            <span className="material-symbols-outlined text-4xl text-primary/20 pointer-events-none">star</span>
          </div>

          <div className="space-y-3 relative z-10 flex-1">
            {data?.essential_players?.slice(0, 8).map((p, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i} 
                className="flex items-center justify-between bg-surface-container-low border border-surface-container-highest rounded-lg p-4 group/item hover:border-primary/30 transition-colors"
              >
                <div className="font-headline font-bold text-on-surface text-lg leading-none">{p.name}</div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Own.</span>
                    <span className="font-mono font-bold text-on-surface">{p.ownership?.toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col items-end pl-4 border-l border-surface-container-high">
                    <span className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">xPts</span>
                    <span className="font-mono font-bold text-primary">{p.xpts?.toFixed(1)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Avoid List */}
        <div className="bg-surface-container-lowest border border-red-500/30 rounded-xl p-6 relative overflow-hidden flex flex-col group transition-colors hover:border-red-500/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-colors pointer-events-none"></div>
          
          <div className="flex items-end justify-between mb-6 relative z-10 border-b border-surface-container-high pb-4">
            <div>
              <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-2 text-xl">
                <span className="material-symbols-outlined text-red-500">warning</span> Avoid List
              </h3>
              <span className="font-label text-[10px] uppercase tracking-widest text-red-500 mt-1 block">High Ownership, Low Impact</span>
            </div>
            <span className="material-symbols-outlined text-4xl text-red-500/20 pointer-events-none">block</span>
          </div>

          <div className="space-y-3 relative z-10 flex-1">
            {data?.avoid_list?.slice(0, 8).map((p, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i} 
                className="flex items-center justify-between bg-surface-container-low border border-surface-container-highest rounded-lg p-4 group/item hover:border-red-500/30 transition-colors"
              >
                <div className="font-headline font-bold text-on-surface text-lg leading-none">{p.name}</div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Own.</span>
                    <span className="font-mono font-bold text-on-surface">{p.ownership?.toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col items-end pl-4 border-l border-surface-container-high">
                    <span className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">xPts</span>
                    <span className="font-mono font-bold text-red-500">{p.xpts?.toFixed(1)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {(!data?.avoid_list || data.avoid_list.length === 0) && (
              <div className="h-full flex items-center justify-center border border-dashed border-surface-container-high rounded-lg p-6">
                <span className="font-label text-[10px] uppercase tracking-widest text-outline italic">No traps identified this week.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Players */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-container-high bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-3">
            <span className="material-symbols-outlined text-outline">group_add</span> The Template
          </h3>
          <span className="font-label text-[9px] uppercase tracking-widest text-outline bg-surface-container-highest px-3 py-1.5 rounded-full border border-outline/20">
            &gt;25% Ownership Rank
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono whitespace-nowrap">
            <thead className="bg-surface-container-low">
              <tr className="border-b border-surface-container-high text-outline text-left">
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Player</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Team</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Position</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Ownership</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Proj xPts</th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">EO Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {data?.template_players?.map((p, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4 font-headline font-bold text-on-surface text-base flex items-center gap-2">
                    {p.is_essential && <span className="material-symbols-outlined text-primary text-[16px]">star</span>}
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-outline font-bold">{p.team}</td>
                  <td className="px-6 py-4 text-outline">{p.position}</td>
                  <td className="px-6 py-4 font-bold text-secondary">{p.ownership?.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-on-surface font-bold">{p.xpts?.toFixed(1)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                      p.risk === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      p.risk === 'Extreme' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                      'bg-surface-container-highest text-outline border border-outline/20'
                    }`}>
                      {p.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, icon, highlight }: any) {
  return (
    <div className={`bg-surface-container-low border rounded-xl p-5 flex flex-col relative overflow-hidden group
      ${highlight ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.1)]' : 'border-surface-container-highest'}`}>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="font-label text-[10px] uppercase tracking-widest text-outline">{label}</div>
        {icon && <span className={`material-symbols-outlined ${highlight ? 'text-primary' : 'text-outline'}`}>{icon}</span>}
      </div>
      
      <div className={`font-mono text-4xl font-black relative z-10 ${highlight ? 'text-primary' : 'text-on-surface'}`}>
        {value}
      </div>
      
      {highlight && (
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-tl from-primary/10 to-transparent rounded-full opacity-50 pointer-events-none"></div>
      )}
    </div>
  )
}
