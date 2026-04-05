import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LeagueTab() {
  const [leagueId, setLeagueId] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const analyzeLeague = async (e) => {
    e.preventDefault()
    if (!leagueId) return

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch('/api/league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leagueId })
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to analyze league')

      setData(result)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Mini-League Intel</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Rival <span className="text-primary italic">Analysis</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Deconstruct your mini-league. Analyze the top 10 managers, effective ownership, and pinpoint differentials to climb the ranks.
            </p>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <div className="bg-surface-container-lowest rounded-xl p-8 border border-surface-container-high shadow-sm">
        <form onSubmit={analyzeLeague} className="flex flex-col md:flex-row gap-4 max-w-2xl">
          <div className="flex-1 relative">
             <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">tag</span>
             <input
              type="number"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="Enter League ID (e.g., 314)"
              className="w-full bg-surface-container-low border border-surface-container-high rounded-full pl-12 pr-4 py-4 font-mono text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-surface-container-highest"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-on-primary px-8 py-4 rounded-full font-label text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
               <div className="animate-spin w-4 h-4 border-2 border-inherit border-t-transparent rounded-full"></div>
            ) : (
               <><span className="material-symbols-outlined text-[18px]">search</span> Analyze</>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm flex items-start gap-3 flex-row font-body">
            <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
            {error}
          </div>
        )}
      </div>

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* League Header Title */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-container-high">
            <h3 className="font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
              {data.name}
            </h3>
            <span className="font-label text-xs uppercase tracking-widest text-outline px-3 py-1 bg-surface-container-high rounded-full">
              Top 10 Metrics
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Standings Table */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-container-high flex flex-col">
              <div className="p-6 border-b border-surface-container-high bg-surface-container-low flex items-center justify-between">
                <h4 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">leaderboard</span> Standings
                </h4>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-container-low">
                    <tr>
                       <th className="px-6 py-4 font-label text-[10px] uppercase tracking-[0.2em] text-outline">Rank</th>
                       <th className="px-6 py-4 font-label text-[10px] uppercase tracking-[0.2em] text-outline">Manager</th>
                       <th className="px-6 py-4 font-label text-[10px] uppercase tracking-[0.2em] text-outline">GW</th>
                       <th className="px-6 py-4 font-label text-[10px] uppercase tracking-[0.2em] text-outline">Total</th>
                       <th className="px-6 py-4 font-label text-[10px] uppercase tracking-[0.2em] text-outline">Chip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {data.managers.map((m) => (
                      <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-4 font-mono text-outline font-bold">#{m.rank}</td>
                        <td className="px-6 py-4">
                          <div className="font-headline font-bold text-on-surface">{m.team}</div>
                          <div className="font-label text-[9px] uppercase tracking-widest text-outline">{m.name}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-primary">{m.gw_points}</td>
                        <td className="px-6 py-4 font-mono font-bold text-on-surface">{m.points}</td>
                        <td className="px-6 py-4 font-label text-[9px] uppercase tracking-widest text-outline">{m.chip?.replace('_', ' ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Template & Differentials */}
            <div className="space-y-8 flex flex-col">
              
              {/* Template Section */}
              <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-container-high">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-3">
                     <span className="material-symbols-outlined text-secondary">shield</span> Consensus Template
                   </h4>
                   <span className="font-label text-[9px] uppercase tracking-widest text-outline">Top 5 Holdings</span>
                </div>
                
                <div className="space-y-4">
                  {data.template.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-surface-container-highest">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-sm ${p.ownership >= 80 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-surface-container-highest text-outline'}`}>
                          {p.ownership}%
                        </div>
                        <div>
                          <div className="font-headline font-bold text-on-surface">{p.name}</div>
                          <div className="font-label text-[9px] uppercase tracking-widest text-outline">{p.team} • {p.pos}</div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Effective Own.</div>
                        <div className="font-mono bg-surface-container-highest px-3 py-1 rounded text-sm font-bold text-on-surface">
                          {(p.ownership + p.captaincy).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Differentials Section */}
              <div className="bg-secondary/10 rounded-xl p-6 border border-secondary border-dashed grain-overlay relative overflow-hidden flex-1">
                <h4 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-3 relative z-10 mb-4">
                  <span className="material-symbols-outlined text-secondary">trending_up</span> Alpha <span className="italic relative z-10">Differentials</span>
                </h4>
                <p className="font-body text-sm text-on-surface opacity-90 mb-6 relative z-10 leading-relaxed text-balance">
                  Players owned by rivals (&lt; 30%) representing high-leverage variance opportunities to climb ranks.
                </p>
                <div className="flex flex-wrap gap-3 relative z-10">
                  {data.differential_opportunities.length > 0 ? (
                    data.differential_opportunities.map(p => (
                      <div key={p.id} className="bg-surface-container-lowest px-4 py-2 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-sm border border-secondary/30 flex items-center gap-3 transition-transform hover:scale-105">
                        <span className="text-on-surface">{p.name}</span>
                        <span className="text-secondary bg-secondary/10 px-2 py-0.5 rounded">{p.ownership}%</span>
                      </div>
                    ))
                  ) : (
                    <div className="w-full p-4 border border-dashed border-outline/50 rounded-lg text-center">
                       <span className="font-label text-[10px] uppercase tracking-widest text-outline italic">No low-ownership differentials detected.</span>
                    </div>
                  )}
                </div>
                
                <span className="material-symbols-outlined absolute -bottom-10 -right-10 text-[180px] text-secondary opacity-[0.03] pointer-events-none">lightbulb</span>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
