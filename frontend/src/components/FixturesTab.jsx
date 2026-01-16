import { useState, useEffect } from 'react'

function Spinner() {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function FixturesTab() {
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchFixtures()
    }, [])

    const fetchFixtures = async () => {
        try {
            const res = await fetch('/api/fixtures')
            const data = await res.json()
            setTeams(data.teams || [])
        } catch (error) {
            console.error('Failed to fetch fixtures:', error)
        }
        setLoading(false)
    }

    const getFdrColor = (fdr) => {
        if (fdr <= 2) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-400'
        if (fdr === 3) return 'bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300'
        if (fdr === 4) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/30 dark:text-amber-400'
        return 'bg-red-100 text-red-700 dark:bg-red-500/30 dark:text-red-400'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
                <Spinner /> Loading fixtures...
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">📅 Fixture Difficulty</h2>

            <div className="space-y-3">
                {teams.map((team) => (
                    <div
                        key={team.team_id}
                        className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="w-24 font-semibold text-slate-900 dark:text-white">{team.team}</div>
                        <div className="w-16 font-bold text-purple-600 dark:text-purple-400">{team.swing_score.toFixed(0)}</div>
                        <div className="flex gap-2 flex-wrap flex-1">
                            {team.fixture_run.slice(0, 5).map((f, i) => (
                                <span
                                    key={i}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${getFdrColor(f.fdr)}`}
                                >
                                    {f.opponent}({f.home ? 'H' : 'A'})
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
