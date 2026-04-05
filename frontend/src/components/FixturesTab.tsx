import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full my-8">
      <div className="animate-spin w-6 h-6 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function FixturesTab() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFixtures() {
      try {
        const res = await fetch('/api/fixtures')
        const data = await res.json()
        setTeams(data.teams || [])
      } catch (error) {
        console.error('Failed to fetch fixtures:', error)
      }
      setLoading(false)
    }
    fetchFixtures()
  }, [])

  const getFdrColor = (fdr) => {
    if (fdr <= 2) return 'bg-primary text-on-primary'
    if (fdr === 3) return 'bg-surface-container-high text-outline'
    if (fdr === 4) return 'bg-secondary text-secondary-fixed'
    return 'bg-red-500/20 text-red-500 border border-red-500/30'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
        <Spinner />
        <div className="text-center font-mono opacity-80">
          <p className="text-sm uppercase tracking-widest text-primary">Fetching Schedule Matrix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Difficulty Matrix</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Fixture <span className="text-primary italic">Horizon</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Visualizing the upcoming run of matches. Teams are sorted by their composite swing score, highlighting the most favorable runs.
            </p>
          </div>
        </div>
      </section>

      {/* Main List */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm overflow-hidden">
        
        {/* Table Header Equivalent */}
        <div className="hidden md:flex items-center px-6 py-4 border-b border-surface-container-high bg-surface-container-low">
          <div className="w-32 font-label text-[10px] uppercase tracking-widest text-outline">Club</div>
          <div className="w-24 font-label text-[10px] uppercase tracking-widest text-outline text-center relative pr-4 group cursor-help">
            Swing
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-surface-container-highest text-on-surface p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-xs normal-case tracking-normal text-left">
              Aggregate difficulty swing over the next 5 games. Lower is better.
            </div>
          </div>
          <div className="flex-1 flex gap-2">
             {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="flex-1 text-center font-label text-[10px] uppercase tracking-widest text-outline">GW +{n}</div>
             ))}
          </div>
        </div>

        <div className="divide-y divide-surface-container-highest">
          {teams.map((team, index) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={team.team_id}
              className="flex flex-col md:flex-row md:items-center p-4 md:px-6 hover:bg-surface-container-low transition-colors group relative overflow-hidden"
            >
              <div className="flex items-center justify-between md:justify-start mb-4 md:mb-0 w-full md:w-auto">
                <div className="w-32 font-headline font-bold text-lg text-on-surface uppercase tracking-tight">{team.team}</div>
                <div className="md:w-24 flex md:justify-center pr-0 md:pr-4">
                  <div className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${team.swing_score < 15 ? 'bg-primary/20 text-primary border border-primary/30' : team.swing_score > 20 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-surface-container-highest text-outline'}`}>
                    {team.swing_score.toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-5 gap-2">
                {team.fixture_run.slice(0, 5).map((f, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center p-2 rounded-md transition-transform group-hover:scale-[1.02] border border-transparent ${getFdrColor(f.fdr)}`}
                    title={`FDR: ${f.fdr}`}
                  >
                    <span className="font-headline font-bold text-sm md:text-base leading-none mb-1">
                      {f.opponent}
                    </span>
                    <span className="font-label text-[9px] uppercase tracking-widest leading-none opacity-80">
                      {f.home ? 'H' : 'A'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 font-label text-[10px] uppercase tracking-widest text-outline pt-4">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-primary"></span> FDR 1-2 (Easy)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-surface-container-high border border-outline"></span> FDR 3 (Neutral)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-secondary"></span> FDR 4 (Hard)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-red-500/30 bg-red-500/20 text-red-500"></span> FDR 5 (Severe)</div>
      </div>

    </div>
  )
}
