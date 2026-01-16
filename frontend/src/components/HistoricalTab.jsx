import { useState, useEffect } from 'react'

function Spinner() {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function HistoricalTab() {
    const [overperformers, setOverperformers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchPlayer, setSearchPlayer] = useState('')
    const [playerStats, setPlayerStats] = useState(null)
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        fetchOverperformers()
    }, [])

    const fetchOverperformers = async () => {
        try {
            const res = await fetch('/api/overperformers')
            const data = await res.json()
            setOverperformers(data.top_overperformers || [])
        } catch (error) {
            console.error('Failed to fetch overperformers:', error)
        }
        setLoading(false)
    }

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
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">📚 Historical Data Analysis</h2>

            {/* Player Search */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🔍 Search Player History</h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={searchPlayer}
                        onChange={(e) => setSearchPlayer(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchPlayerHistory()}
                        placeholder="Enter player name (e.g., Salah, Haaland)"
                        className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        onClick={searchPlayerHistory}
                        disabled={searching}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                    >
                        {searching ? <><Spinner /> Searching...</> : 'Search'}
                    </button>
                </div>

                {/* Player Stats Results */}
                {playerStats && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox
                            label="Career Points"
                            value={playerStats.total_points}
                            description={`${playerStats.seasons_played} seasons`}
                        />
                        <StatBox
                            label="Goals (xG)"
                            value={`${playerStats.total_goals} (${playerStats.total_xg})`}
                            description={playerStats.interpretation.xg_description}
                            highlight={playerStats.xg_overperformance > 5}
                        />
                        <StatBox
                            label="xG Overperformance"
                            value={`${playerStats.xg_overperformance > 0 ? '+' : ''}${playerStats.xg_overperformance}`}
                            description={playerStats.xg_overperformance > 0 ? "Finishes above expectation" : "Finishes as expected"}
                            highlight={playerStats.xg_overperformance > 10}
                        />
                        <StatBox
                            label="Avg Pts/GW"
                            value={playerStats.avg_points_per_gw.toFixed(1)}
                            description={playerStats.interpretation.consistency_description}
                        />
                    </div>
                )}
            </div>

            {/* Top Overperformers */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">🎯 Top xG Overperformers</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Players who consistently score more goals than their xG suggests (5+ seasons of data)
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
                        <Spinner /> Loading historical data...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                                    <th className="pb-3 font-medium">Player</th>
                                    <th className="pb-3 font-medium">Goals</th>
                                    <th className="pb-3 font-medium">xG</th>
                                    <th className="pb-3 font-medium">Overperformance</th>
                                    <th className="pb-3 font-medium">% Above xG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overperformers.map((p, i) => {
                                    const overperf = p.xg_overperformance
                                    const pctAbove = p.total_xg > 0 ? ((p.total_goals - p.total_xg) / p.total_xg * 100) : 0
                                    return (
                                        <tr
                                            key={i}
                                            className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                            onClick={() => { setSearchPlayer(p.name); setPlayerStats(null); searchPlayerHistory() }}
                                        >
                                            <td className="py-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                                            <td className="py-3 text-slate-700 dark:text-slate-300">{p.total_goals}</td>
                                            <td className="py-3 text-slate-500 dark:text-slate-400">{p.total_xg.toFixed(1)}</td>
                                            <td className={`py-3 font-bold ${overperf > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {overperf > 0 ? '+' : ''}{overperf.toFixed(1)}
                                            </td>
                                            <td className={`py-3 ${pctAbove > 20 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {pctAbove > 0 ? '+' : ''}{pctAbove.toFixed(0)}%
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    💡 <strong>How this helps:</strong> Players who consistently overperform their xG are better finishers.
                    When two players have similar xG, prioritize the one with positive historical overperformance.
                    Data from 2019-2024 seasons via <a href="https://github.com/vaastav/Fantasy-Premier-League" className="underline">vaastav/Fantasy-Premier-League</a>.
                </p>
            </div>
        </div>
    )
}

function StatBox({ label, value, description, highlight }) {
    return (
        <div className={`bg-white dark:bg-slate-700/50 border rounded-lg p-4 
      ${highlight ? 'border-emerald-300 dark:border-emerald-500/50' : 'border-slate-200 dark:border-slate-600'}`}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
            <div className={`text-xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                {value}
            </div>
            {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</div>}
        </div>
    )
}
