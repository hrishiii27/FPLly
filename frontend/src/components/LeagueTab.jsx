import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users, Search, AlertCircle, TrendingUp, Shield } from 'lucide-react'

export default function LeagueTab() {
    const [leagueId, setLeagueId] = useState('')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

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
        <div className="space-y-6">
            {/* Search Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    Mini-League Analyzer
                </h2>
                <p className="text-slate-500 text-sm mb-6">Enter your League ID to analyze the top 10 managers, effective ownership, and find differentials to climb the ranks.</p>

                <form onSubmit={analyzeLeague} className="flex gap-4 max-w-md">
                    <input
                        type="number"
                        value={leagueId}
                        onChange={(e) => setLeagueId(e.target.value)}
                        placeholder="League ID (e.g., 314)"
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Analyzing...' : <><Search size={18} /> Analyze</>}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>

            {data && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* League Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                            {data.name}
                        </h3>
                        <span className="text-slate-500 text-sm">Top 10 Analysis</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Standings Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                <h4 className="font-bold flex items-center gap-2">
                                    <Users size={18} className="text-blue-500" /> Standings
                                </h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Rank</th>
                                            <th className="px-4 py-3">Manager</th>
                                            <th className="px-4 py-3">GW</th>
                                            <th className="px-4 py-3">Total</th>
                                            <th className="px-4 py-3">Chip</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {data.managers.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-slate-400">#{m.rank}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900 dark:text-white">{m.team}</div>
                                                    <div className="text-xs text-slate-500">{m.name}</div>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-emerald-500">{m.gw_points}</td>
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{m.points}</td>
                                                <td className="px-4 py-3 text-xs capitalize text-slate-500">{m.chip?.replace('_', ' ') || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Template / EO */}
                        <div className="space-y-6">
                            {/* Template Section */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Shield size={18} className="text-purple-500" /> League Template
                                    <span className="text-xs font-normal text-slate-500 ml-auto">Most owned players</span>
                                </h4>
                                <div className="space-y-3">
                                    {data.template.slice(0, 5).map(p => (
                                        <div key={p.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.ownership >= 80 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {p.ownership}%
                                                </span>
                                                <div>
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-xs text-slate-500">{p.team} - {p.pos}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-xs text-slate-400">EO</div>
                                                <div className="font-bold text-slate-700 dark:text-slate-300">
                                                    {(p.ownership + p.captaincy).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Differentials Section */}
                            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20">
                                <h4 className="font-bold mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                    <TrendingUp size={18} /> Opportunity Breakdown
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                    Players owned by rivals (&lt; 30%) who could be huge differentials:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {data.differential_opportunities.length > 0 ? (
                                        data.differential_opportunities.map(p => (
                                            <div key={p.id} className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                                                <span>{p.name}</span>
                                                <span className="text-emerald-600">{p.ownership}%</span>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-500 italic">No clear differentials found in top 10.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
