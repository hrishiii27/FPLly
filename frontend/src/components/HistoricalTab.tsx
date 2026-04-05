import { useState, useEffect } from 'react'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full my-4">
      <div className="animate-spin w-5 h-5 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function HistoricalTab() {
  const [overperformers, setOverperformers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlayer, setSearchPlayer] = useState('')
  const [playerStats, setPlayerStats] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    async function fetchOverperformers() {
      try {
        const res = await fetch('/api/overperformers')
        const data = await res.json()
        setOverperformers(data.top_overperformers || [])
      } catch (error) {
        console.error('Failed to fetch overperformers:', error)
      }
      setLoading(false)
    }
    fetchOverperformers()
  }, [])

  const searchPlayerHistory = async () => {
    if (!searchPlayer.trim()) return

    setSearching(true)
    setPlayerStats(null)
    try {
      const res = await fetch(`/api/historical/${encodeURIComponent(searchPlayer)}`)
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setPlayerStats(data)
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
    setSearching(false)
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-3xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Pedigree & Variance</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Historical <span className="text-primary italic">Context</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Data from the 2019-2024 seasons. Identify elite finishers by analyzing long-term xG overperformance and career momentum.
            </p>
          </div>
        </div>
      </section>

      {/* Player Search */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Left: Search Form */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div>
              <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_search</span> Player Lookup
              </h3>
              <p className="font-body text-sm text-outline">Search via Vaastav dataset identifiers.</p>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                type="text"
                value={searchPlayer}
                onChange={(e) => setSearchPlayer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPlayerHistory()}
                placeholder="e.g. Salah, Haaland"
                className="w-full bg-surface-container-low border border-surface-container-high rounded-full pl-12 pr-4 py-3 font-mono text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-surface-container-highest"
              />
            </div>
            <button
              onClick={searchPlayerHistory}
              disabled={searching}
              className="bg-primary hover:bg-primary/90 text-on-primary w-full py-3 rounded-full font-label text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2"
            >
              {searching ? (
                <div className="animate-spin w-4 h-4 border-2 border-inherit border-t-transparent rounded-full"></div>
              ) : 'Retrieve Records'}
            </button>
          </div>

          {/* Right: Player Stats Results */}
          <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-surface-container-high pt-6 md:pt-0 md:pl-8 min-h-[160px] flex items-center">
            {playerStats ? (
              <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-right-4 duration-300">
                <StatBox
                  label="Career Points"
                  value={playerStats.total_points}
                  description={`${playerStats.seasons_played} seasons recorded`}
                />
                <StatBox
                  label="Goals (xG)"
                  value={`${playerStats.total_goals} (${playerStats.total_xg})`}
                  description={playerStats.interpretation.xg_description}
                  highlight={playerStats.xg_overperformance > 5}
                />
                <StatBox
                  label="xG Overperf."
                  value={`${playerStats.xg_overperformance > 0 ? '+' : ''}${playerStats.xg_overperformance}`}
                  description={playerStats.xg_overperformance > 0 ? "Positive Variance" : "Baseline Finisher"}
                  highlight={playerStats.xg_overperformance > 10}
                />
                <StatBox
                  label="Avg Pts/GW"
                  value={playerStats.avg_points_per_gw.toFixed(1)}
                  description={playerStats.interpretation.consistency_description}
                />
              </div>
            ) : (
              <div className="w-full text-center py-8">
                <span className="material-symbols-outlined text-4xl text-surface-container-highest mb-2">query_stats</span>
                <p className="font-label text-xs uppercase tracking-widest text-outline">Awaiting Query</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Overperformers */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-container-high bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">verified</span> Elite Finishers
            </h3>
            <p className="font-body text-xs text-outline">
              Players exhibiting sustained xG overperformance over a minimum 5-season threshold.
            </p>
          </div>
          <span className="font-label text-[9px] uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1.5 rounded-full whitespace-nowrap border border-secondary/20">
            Alpha Generation
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-on-surface bg-surface-container-lowest">
            <Spinner />
            <span className="font-mono text-xs text-primary uppercase tracking-widest">Aggregating History...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono whitespace-nowrap">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-surface-container-high text-outline text-left">
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Player</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Total Goals</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Cumulative xG</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Absolute Overperf.</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">% Above Baseline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {overperformers.map((p, i) => {
                  const overperf = p.xg_overperformance
                  const pctAbove = p.total_xg > 0 ? ((p.total_goals - p.total_xg) / p.total_xg * 100) : 0
                  return (
                    <tr
                      key={i}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                      onClick={() => { setSearchPlayer(p.name); setPlayerStats(null); searchPlayerHistory() }}
                    >
                      <td className="px-6 py-4 font-headline font-bold text-on-surface group-hover:text-primary transition-colors text-base">{p.name}</td>
                      <td className="px-6 py-4 text-outline font-bold">{p.total_goals}</td>
                      <td className="px-6 py-4 text-outline">{p.total_xg.toFixed(1)}</td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${overperf > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                           {overperf > 0 ? '+' : ''}{overperf.toFixed(1)}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`font-bold ${pctAbove > 20 ? 'text-secondary' : 'text-outline'}`}>
                           {pctAbove > 0 ? '+' : ''}{pctAbove.toFixed(0)}%
                         </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

function StatBox({ label, value, description, highlight }: any) {
  return (
    <div className={`bg-surface-container-low border rounded-xl p-4 flex flex-col relative overflow-hidden group
      ${highlight ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.1)]' : 'border-surface-container-highest'}`}>
      <div className="font-label text-[9px] uppercase tracking-widest text-outline mb-2 relative z-10">{label}</div>
      <div className={`font-mono text-2xl font-bold relative z-10 mb-2 ${highlight ? 'text-primary' : 'text-on-surface'}`}>
        {value}
      </div>
      {description && <div className="font-body text-[10px] leading-snug text-outline relative z-10 mt-auto pt-2 border-t border-surface-container-highest">{description}</div>}
      
      {highlight && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent opacity-50 pointer-events-none"></div>
      )}
    </div>
  )
}
