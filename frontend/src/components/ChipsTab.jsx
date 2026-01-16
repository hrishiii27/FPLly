import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Spinner() {
  return (
    <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
  )
}

export default function ChipsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChips()
  }, [])

  const fetchChips = async () => {
    try {
      const res = await fetch('/api/chips')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch chips:', error)
    }
    setLoading(false)
  }

  const getChipIcon = (chip) => {
    const icons = {
      'wildcard': '🃏',
      'bench_boost': '📈',
      'triple_captain': '👑',
      'free_hit': '⚡'
    }
    return icons[chip] || '🎯'
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
    if (verdict?.includes('PLAY')) return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    if (verdict?.includes('CONSIDER')) return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
  }

  const getGWTypeStyle = (type) => {
    if (type === 'DGW') return 'bg-emerald-500 text-white'
    if (type === 'MixedDGW') return 'bg-blue-500 text-white'
    if (type === 'BGW') return 'bg-red-500 text-white'
    return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
        <Spinner /> Analyzing chip opportunities...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Recommendations Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data?.recommendations?.map((rec, i) => (
          <motion.div
            key={rec.chip}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white dark:bg-slate-800/50 rounded-2xl p-6 border-2 shadow-sm hover:shadow-md transition-all
              ${rec.is_ideal
                ? 'border-emerald-400 dark:border-emerald-500/50'
                : 'border-slate-100 dark:border-slate-700/50'}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center text-2xl">
                  {getChipIcon(rec.chip)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{getChipName(rec.chip)}</h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Best: GW{rec.recommended_gw}</span>
                </div>
              </div>

              {/* Score Ring */}
              <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${rec.score}, 100`}
                    className={rec.score >= 70 ? 'text-emerald-500' : rec.score >= 40 ? 'text-amber-500' : 'text-slate-400'}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300">
                  {rec.score}
                </span>
              </div>
            </div>

            {/* Verdict Badge */}
            <div className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold mb-3 border ${getVerdictStyle(rec.verdict)}`}>
              {rec.verdict}
            </div>

            {/* Reason */}
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-3">{rec.reason}</p>

            {/* Data Points */}
            {rec.data_points && rec.data_points.length > 0 && (
              <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                {rec.data_points.map((dp, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{dp}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </div>

      {/* GW Analysis Table */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          📅 Gameweek Breakdown
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(next 6 GWs)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                <th className="pb-3 font-semibold">GW</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold text-center">Fixtures</th>
                <th className="pb-3 font-semibold text-center">FDR</th>
                <th className="pb-3 font-semibold text-center">BB</th>
                <th className="pb-3 font-semibold text-center">TC</th>
                <th className="pb-3 font-semibold text-center">FH</th>
                <th className="pb-3 font-semibold text-center">WC</th>
              </tr>
            </thead>
            <tbody>
              {data?.gameweek_analysis && Object.entries(data.gameweek_analysis).slice(0, 6).map(([gw, a]) => (
                <tr key={gw} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 font-bold text-slate-900 dark:text-white">GW{gw}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getGWTypeStyle(a.type)}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="py-3 text-center text-slate-600 dark:text-slate-400">{a.total_fixtures}</td>
                  <td className="py-3 text-center">
                    <span className={`font-medium ${a.avg_fdr <= 2.5 ? 'text-emerald-600' : a.avg_fdr >= 3.5 ? 'text-red-500' : 'text-slate-500'}`}>
                      {a.avg_fdr}
                    </span>
                  </td>
                  <td className="py-3 text-center"><ScoreBadge score={a.chip_scores?.bench_boost} /></td>
                  <td className="py-3 text-center"><ScoreBadge score={a.chip_scores?.triple_captain} /></td>
                  <td className="py-3 text-center"><ScoreBadge score={a.chip_scores?.free_hit} /></td>
                  <td className="py-3 text-center"><ScoreBadge score={a.chip_scores?.wildcard} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> DGW</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Mixed DGW</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> BGW</span>
          <span className="flex items-center gap-1">Score: <span className="text-emerald-500 font-medium">70+</span> ideal, <span className="text-amber-500 font-medium">40-69</span> possible, <span className="text-slate-400 font-medium">&lt;40</span> avoid</span>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score }) {
  if (!score && score !== 0) return <span className="text-slate-300">-</span>

  let bgColor = 'bg-slate-100 dark:bg-slate-700 text-slate-500'
  if (score >= 70) bgColor = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  else if (score >= 40) bgColor = 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'

  return (
    <span className={`inline-block min-w-[32px] px-2 py-0.5 rounded font-semibold text-xs ${bgColor}`}>
      {score}
    </span>
  )
}
