import { useState, useEffect } from 'react'

function Spinner() {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function OwnershipTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOwnership()
    }, [])

    const fetchOwnership = async () => {
        try {
            const res = await fetch('/api/ownership')
            const result = await res.json()
            setData(result)
        } catch (error) {
            console.error('Failed to fetch ownership:', error)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
                <Spinner /> Analyzing ownership...
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">👥 Ownership Analysis</h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatBox label="Players Analyzed" value={data?.summary?.total_analyzed || 0} />
                <StatBox label="Template (>25%)" value={data?.summary?.template_count || 0} />
                <StatBox label="Essentials" value={data?.summary?.essential_count || 0} highlight />
                <StatBox label="Differentials" value={data?.summary?.differential_count || 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Essential Players */}
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-6">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                        ⭐ Essential Players
                        <span className="text-xs text-emerald-600 dark:text-emerald-500">Must have</span>
                    </h3>
                    <div className="space-y-3">
                        {data?.essential_players?.slice(0, 8).map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-3">
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-slate-500">{p.ownership?.toFixed(1)}%</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                                        {p.xpts?.toFixed(1)} xPts
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Avoid List */}
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6">
                    <h3 className="font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        ⚠️ Avoid List
                        <span className="text-xs text-red-600 dark:text-red-500">High owned, low xPts</span>
                    </h3>
                    <div className="space-y-3">
                        {data?.avoid_list?.slice(0, 8).map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-3">
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-slate-500">{p.ownership?.toFixed(1)}%</span>
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                        {p.xpts?.toFixed(1)} xPts
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!data?.avoid_list || data.avoid_list.length === 0) && (
                            <p className="text-slate-500 text-sm">No players to avoid this week!</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Template Players */}
            <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">📊 Template Players (&gt;25% owned)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-left">
                                <th className="pb-3 font-medium">Player</th>
                                <th className="pb-3 font-medium">Team</th>
                                <th className="pb-3 font-medium">Pos</th>
                                <th className="pb-3 font-medium">Ownership</th>
                                <th className="pb-3 font-medium">xPts</th>
                                <th className="pb-3 font-medium">EO Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.template_players?.map((p, i) => (
                                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                                        {p.is_essential && '⭐ '}{p.name}
                                    </td>
                                    <td className="py-3 text-slate-600 dark:text-slate-400">{p.team}</td>
                                    <td className="py-3 text-slate-600 dark:text-slate-400">{p.position}</td>
                                    <td className="py-3 font-semibold text-purple-600 dark:text-purple-400">{p.ownership?.toFixed(1)}%</td>
                                    <td className="py-3 text-slate-700 dark:text-slate-300">{p.xpts?.toFixed(1)}</td>
                                    <td className="py-3 text-xs text-slate-500">{p.risk}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function StatBox({ label, value, highlight }) {
    return (
        <div className={`bg-white dark:bg-slate-700/50 border rounded-lg p-4 text-center
      ${highlight ? 'border-emerald-300 dark:border-emerald-500/50' : 'border-slate-200 dark:border-slate-600'}`}>
            <div className={`text-2xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                {value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        </div>
    )
}
