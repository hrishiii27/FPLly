import { useState, useEffect } from 'react'

function Spinner() {
  return (
    <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
  )
}

export default function PredictionsTab() {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState('')
  const [maxPrice, setMaxPrice] = useState('20')

  useEffect(() => {
    fetchPredictions()
  }, [position, maxPrice])

  const fetchPredictions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 50, max_price: maxPrice })
      if (position) params.append('position', position)
      
      const res = await fetch(`/api/predictions?${params}`)
      const data = await res.json()
      setPredictions(data.predictions || [])
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    }
    setLoading(false)
  }

  const getPositionColor = (pos) => {
    const colors = {
      'GKP': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      'DEF': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      'MID': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      'FWD': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    }
    return colors[pos] || 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
  }

  const getFormIcon = (form) => {
    if (form === 'rising') return '📈'
    if (form === 'falling') return '📉'
    return '➡️'
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Player Predictions</h2>
        <div className="flex gap-3">
          <select 
            value={position} 
            onChange={(e) => setPosition(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Positions</option>
            <option value="GKP">Goalkeepers</option>
            <option value="DEF">Defenders</option>
            <option value="MID">Midfielders</option>
            <option value="FWD">Forwards</option>
          </select>
          <select 
            value={maxPrice} 
            onChange={(e) => setMaxPrice(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="20">All Prices</option>
            <option value="6">Under £6m</option>
            <option value="8">Under £8m</option>
            <option value="10">Under £10m</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
          <Spinner /> Loading predictions...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                <th className="pb-3 font-medium">Player</th>
                <th className="pb-3 font-medium">Team</th>
                <th className="pb-3 font-medium">Pos</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">xPts</th>
                <th className="pb-3 font-medium">Range</th>
                <th className="pb-3 font-medium">Value</th>
                <th className="pb-3 font-medium">Form</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr 
                  key={p.id} 
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                >
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{p.team}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getPositionColor(p.position)}`}>
                      {p.position}
                    </span>
                  </td>
                  <td className="py-3 text-slate-700 dark:text-slate-300">£{p.price.toFixed(1)}m</td>
                  <td className="py-3 font-bold text-purple-600 dark:text-purple-400">{p.xPts.toFixed(2)}</td>
                  <td className="py-3 text-slate-400 dark:text-slate-500 text-xs">[{p.xPts_low.toFixed(1)}-{p.xPts_high.toFixed(1)}]</td>
                  <td className="py-3 text-emerald-600 dark:text-emerald-400 font-medium">{p.value.toFixed(3)}</td>
                  <td className="py-3">
                    <span className={`${p.form === 'rising' ? 'text-emerald-600 dark:text-emerald-400' : p.form === 'falling' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {getFormIcon(p.form)} {p.form}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
