import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full my-4">
      <div className="animate-spin w-5 h-5 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function DifferentialsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDifferentials() {
      try {
        const res = await fetch('/api/differentials')
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch differentials:', error)
      }
      setLoading(false)
    }
    fetchDifferentials()
  }, [])

  const getPositionColor = (pos) => {
    const colors = {
      'GKP': 'bg-surface-container-high text-outline',
      'DEF': 'bg-primary/20 text-primary border border-primary/30',
      'MID': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'FWD': 'bg-secondary/20 text-secondary border border-secondary/30'
    }
    return colors[pos] || 'bg-surface-container-highest text-outline'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
        <Spinner />
        <span className="font-mono text-xs text-primary uppercase tracking-widest">Identifying Market Inefficiencies...</span>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Alpha Generation</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Differential <span className="text-primary italic">Finder</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Pinpoint low-owned players exhibiting elite underlying metrics. These are high-leverage assets capable of driving massive rank gains.
            </p>
          </div>
        </div>
      </section>

      {/* Top Differentials */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-surface-container-high pb-2">
           <span className="material-symbols-outlined text-secondary">diamond</span>
           <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface text-2xl">Elite Picks</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.top_differentials?.slice(0, 6).map((d, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={i}
              className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 group hover:border-secondary/50 transition-colors relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-colors pointer-events-none"></div>

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                  <h3 className="font-headline font-bold text-on-surface text-xl uppercase tracking-tight leading-none mb-1">{d.name}</h3>
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline">{d.team} • £{d.price?.toFixed(1)}m</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold ${getPositionColor(d.position)}`}>
                    {d.position}
                  </span>
                  <span className="font-mono text-[10px] text-outline font-bold">{d.ownership?.toFixed(1)}% TSB</span>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-4 relative z-10 border-y border-surface-container-high py-3">
                <div className="flex flex-col">
                  <span className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Proj xPts</span>
                  <div className="text-2xl font-mono border-l-2 border-primary pl-2 text-on-surface">{d.xpts?.toFixed(1)}</div>
                </div>
                <div className="flex flex-col border-l border-surface-container-highest pl-6">
                  <span className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Diff Score</span>
                  <div className="text-2xl font-mono border-l-2 border-secondary pl-2 text-secondary">{d.differential_score?.toFixed(0)}</div>
                </div>
              </div>

              <div className="relative z-10 flex-1 flex flex-col justify-end">
                <p className="font-body text-[11px] leading-relaxed text-outline mb-3 italic">"{d.reason}"</p>
                
                <div className="flex items-center justify-between mt-auto">
                    <p className="font-label text-[9px] uppercase tracking-widest text-on-surface bg-surface-container-highest px-2 py-1 rounded inline-block truncate max-w-[180px]">
                      Nxt: {d.fixture}
                    </p>
                    
                    {d.is_rising && (
                      <div className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse">
                        <span className="material-symbols-outlined text-[14px]">trending_up</span> Price Rising
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        
        {/* By Position */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 border-b border-surface-container-high pb-2">
            <span className="material-symbols-outlined text-primary">category</span>
            <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface text-xl">Positional Matrix</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['GKP', 'DEF', 'MID', 'FWD'].map(pos => (
              <div key={pos} className="bg-surface-container-low border border-surface-container-high rounded-xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-surface-container-highest relative z-10">
                   <h4 className="font-headline font-bold uppercase tracking-tight text-on-surface text-lg">{pos}</h4>
                   <span className={`w-2 h-2 rounded-full ${pos === 'DEF' ? 'bg-primary' : pos === 'MID' ? 'bg-blue-400' : pos === 'FWD' ? 'bg-secondary' : 'bg-outline'}`}></span>
                </div>
                <div className="space-y-3 relative z-10">
                  {data?.by_position?.[pos]?.map((p, i) => (
                    <div key={i} className="flex justify-between items-center group/item">
                      <span className="font-label text-[10px] uppercase tracking-widest text-outline group-hover/item:text-on-surface transition-colors truncate pr-2">{p.name}</span>
                      <span className="font-mono text-xs font-bold text-on-surface">{p.xpts?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                 <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[80px] text-surface-container-highest opacity-20 pointer-events-none">
                     {pos === 'GKP' ? 'front_hand' : pos === 'DEF' ? 'shield' : pos === 'MID' ? 'directions_run' : 'sports_soccer'}
                 </span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Gems */}
        <div className="col-span-1 space-y-6 flex flex-col">
          <div className="flex items-center gap-3 border-b border-surface-container-high pb-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface text-xl">Value Enablers</h3>
          </div>
          
          <div className="bg-primary/5 border-l-2 border-primary rounded-r-xl p-5 flex-1 relative overflow-hidden grain-overlay">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="font-label text-[9px] uppercase tracking-widest text-primary font-bold">Under £6.5m</span>
            </div>
            
            <div className="space-y-3 relative z-10 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
              {data?.budget_gems?.slice(0, 10).map((g, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-container-lowest border border-primary/10 rounded-lg p-3 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-headline font-bold text-on-surface leading-none mb-1 text-sm">{g.name}</span>
                    <span className="font-label text-[9px] uppercase tracking-widest text-outline">£{g.price?.toFixed(1)}m</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                    {g.xpts?.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
            <span className="material-symbols-outlined absolute bottom-0 right-0 text-[120px] text-primary opacity-[0.03] pointer-events-none translate-x-1/4 translate-y-1/4">diamond</span>
          </div>
        </div>
      </div>
    </div>
  )
}
