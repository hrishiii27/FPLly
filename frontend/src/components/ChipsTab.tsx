import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full my-8">
      <div className="animate-spin w-6 h-6 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function ChipsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChips() {
      try {
        const res = await fetch('/api/chips')
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch chips:', error)
      }
      setLoading(false)
    }
    fetchChips()
  }, [])

  const getChipIcon = (chip) => {
    const icons = {
      'wildcard': 'swap_vert',
      'bench_boost': 'equalizer',
      'triple_captain': 'stars',
      'free_hit': 'bolt'
    }
    return icons[chip] || 'target'
  }

  const getChipName = (chip) => {
    const names = {
      'wildcard': 'Wildcard',
      'bench_boost': 'Bench Boost',
      'triple_captain': 'Triple Captain',
      'free_hit': 'Free Hit'
    }
    return names[chip] || chip
  }

  const getVerdictStyle = (verdict) => {
    if (verdict?.includes('PLAY')) return 'bg-primary text-on-primary'
    if (verdict?.includes('CONSIDER')) return 'bg-secondary text-secondary-fixed'
    return 'bg-surface-container-highest text-outline'
  }

  const getGWTypeStyle = (type) => {
    if (type === 'DGW') return 'text-primary'
    if (type === 'MixedDGW') return 'text-secondary'
    if (type === 'BGW') return 'text-red-500'
    return 'text-outline'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
        <Spinner />
        <div className="text-center font-mono opacity-80">
          <p className="text-sm uppercase tracking-widest text-primary">Simulating Forward Fixture Matrix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Macro Strategy</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Chip <span className="text-primary italic">Deployment</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Algorithmic modeling of future gameweeks to pinpoint mathematically optimal windows for chip usage, factoring in blank and double gameweeks.
            </p>
          </div>
        </div>
      </section>

      {/* Recommendations Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data?.recommendations?.map((rec, i) => (
          <motion.div
            key={rec.chip}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-surface-container-lowest rounded-2xl p-8 border-2 shadow-sm transition-all relative overflow-hidden grain-overlay
              ${rec.is_ideal
                ? 'border-primary'
                : 'border-surface-container-highest'
            }`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center shadow-inner border border-surface-container-highest">
                  <span className={`material-symbols-outlined text-3xl tracking-normal ${rec.is_ideal ? 'text-primary' : 'text-outline'}`}>
                    {getChipIcon(rec.chip)}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-2xl uppercase text-on-surface">{getChipName(rec.chip)}</h3>
                  <span className="font-label text-xs uppercase tracking-widest text-outline">Optimum: GW{rec.recommended_gw}</span>
                </div>
              </div>

              {/* Score Ring */}
              <div className="relative w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center border border-surface-container-highest">
                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-surface-container-highest"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${rec.score}, 100`}
                    className={rec.score >= 70 ? 'text-primary' : rec.score >= 40 ? 'text-secondary' : 'text-outline'}
                  />
                </svg>
                <span className="font-headline font-bold text-lg text-on-surface relative z-10">
                  {rec.score}
                </span>
                <span className="absolute bottom-1 font-label text-[8px] uppercase tracking-widest text-outline opacity-50 z-10">Score</span>
              </div>
            </div>

            {/* Verdict Badge */}
            <div className={`inline-block px-4 py-1.5 rounded-full font-label text-xs uppercase tracking-[0.2em] mb-4 relative z-10 ${getVerdictStyle(rec.verdict)}`}>
              {rec.verdict}
            </div>

            {/* Reason */}
            <p className="font-body text-sm text-on-surface opacity-90 leading-relaxed mb-6 relative z-10">{rec.reason}</p>

            {/* Data Points */}
            {rec.data_points && rec.data_points.length > 0 && (
              <div className="space-y-2 relative z-10 border-t border-surface-container-high pt-6">
                <span className="font-label text-xs uppercase tracking-widest text-outline block mb-3">Model Analysis</span>
                {rec.data_points.map((dp, j) => (
                  <div key={j} className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">check_circle</span>
                    <span className="font-mono text-xs text-outline">{dp}</span>
                  </div>
                ))}
              </div>
            )}
            
            {rec.is_ideal && (
              <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[200px] tracking-normal">{getChipIcon(rec.chip)}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* GW Analysis Table */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-8 shadow-sm">
        <h3 className="font-headline text-2xl font-bold uppercase tracking-tight text-on-surface mb-8 flex items-end gap-3">
          Gameweek Outlook
          <span className="font-label text-xs uppercase tracking-widest text-outline mb-1">(Forward 10 GWs)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-surface-container-highest text-outline text-left">
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest">GW</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest">Type</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest text-center">Fixtures</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest text-center">FDR Avg</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest text-center">Bench Bost</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest text-center">Triple Cap</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest text-center">Free Hit</th>
                <th className="pb-4 font-label text-[10px] uppercase tracking-widest text-center">Wildcard</th>
              </tr>
            </thead>
            <tbody>
              {/* Show up to 10 Gameweeks instead of 6 */}
              {data?.gameweek_analysis && Object.entries(data.gameweek_analysis).slice(0, 10).map(([gw, a]: any) => (
                <tr key={gw} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                  <td className="py-4 font-headline font-bold text-on-surface text-base">GW{gw}</td>
                  <td className="py-4 font-bold text-xs">
                    <span className={getGWTypeStyle(a.type)}>
                      {a.type === 'normal' ? 'Standard' : a.type}
                    </span>
                  </td>
                  <td className="py-4 text-center text-outline">{a.total_fixtures}</td>
                  <td className="py-4 text-center">
                    <span className={`${a.avg_fdr <= 2.5 ? 'text-primary font-bold' : a.avg_fdr >= 3.5 ? 'text-red-500' : 'text-outline'}`}>
                      {a.avg_fdr}
                    </span>
                  </td>
                  <td className="py-4 text-center"><ScoreBadge score={a.chip_scores?.bench_boost} /></td>
                  <td className="py-4 text-center"><ScoreBadge score={a.chip_scores?.triple_captain} /></td>
                  <td className="py-4 text-center"><ScoreBadge score={a.chip_scores?.free_hit} /></td>
                  <td className="py-4 text-center"><ScoreBadge score={a.chip_scores?.wildcard} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-6 font-label text-[10px] uppercase tracking-widest text-outline border-t border-surface-container-high pt-6">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></span> Double GW</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_currentColor]"></span> Mixed DGW</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_currentColor]"></span> Blank GW</span>
          <span className="flex items-center gap-2 border-l border-surface-container-highest pl-6">
            Score: <span className="text-primary font-bold">70+ Ideal</span> | <span className="text-secondary font-bold">40-69 Viable</span> | <span className="text-outline">&lt;40 Suboptimal</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: any) {
  if (!score && score !== 0) return <span className="text-outline opacity-50">-</span>

  let txtColor = 'text-outline'
  if (score >= 70) txtColor = 'text-primary'
  else if (score >= 40) txtColor = 'text-secondary'

  return (
    <span className={`inline-block font-bold text-sm ${txtColor}`}>
      {score}
    </span>
  )
}
