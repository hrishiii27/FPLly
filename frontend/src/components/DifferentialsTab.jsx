import { useState, useEffect } from 'react'

function Spinner() {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function DifferentialsTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDifferentials()
    }, [])

    const fetchDifferentials = async () => {
        try {
            const res = await fetch('/api/differentials')
            const result = await res.json()
            setData(result)
        } catch (error) {
            console.error('Failed to fetch differentials:', error)
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
        return colors[pos] || 'bg-slate-100 text-slate-700'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
                <Spinner /> Finding differentials...
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">💎 Differential Finder</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Low-owned players with high predicted points</p>

            {/* Top Differentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {data?.top_differentials?.slice(0, 6).map((d, i) => (
                    <div
                        key={i}
                        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-purple-500/50 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getPositionColor(d.position)}`}>
                                {d.position}
                            </span>
                            <span className="text-slate-500 text-sm">{d.ownership?.toFixed(1)}% owned</span>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{d.name}</h3>
                        <p className="text-sm text-slate-500 mb-3">{d.team} • £{d.price?.toFixed(1)}m</p>

                        <div className="flex items-center gap-4 mb-3">
                            <div>
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{d.xpts?.toFixed(1)}</div>
                                <div className="text-xs text-slate-500">xPts</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{d.differential_score?.toFixed(0)}</div>
                                <div className="text-xs text-slate-500">Diff Score</div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 mb-2">{d.fixture}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{d.reason}</p>

                        {d.is_rising && (
                            <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                📈 Price rising!
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* By Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {['GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                    <div key={pos} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPositionColor(pos)}`}>{pos}</span>
                            Picks
                        </h4>
                        <div className="space-y-2">
                            {data?.by_position?.[pos]?.map((p, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                                    <span className="text-purple-600 dark:text-purple-400">{p.xpts?.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Budget Gems */}
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-6">
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-4">💰 Budget Gems (Under £6.5m)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {data?.budget_gems?.slice(0, 10).map((g, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">{g.name}</div>
                            <div className="text-xs text-slate-500">£{g.price?.toFixed(1)}m</div>
                            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">{g.xpts?.toFixed(1)} xPts</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
