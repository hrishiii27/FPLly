import { useState, useEffect } from 'react'

function Spinner() {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function CaptainTab() {
    const [captains, setCaptains] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCaptains()
    }, [])

    const fetchCaptains = async () => {
        try {
            const res = await fetch('/api/captain')
            const data = await res.json()
            setCaptains(data.recommendations || [])
        } catch (error) {
            console.error('Failed to fetch captains:', error)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
                <Spinner /> Loading captain picks...
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">👑 Captain Recommendations</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {captains.slice(0, 6).map((pick, i) => (
                    <div
                        key={pick.id}
                        className={`relative bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border transition-all hover:scale-[1.02] cursor-pointer
              ${i === 0 ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-gradient-to-br dark:from-amber-500/10 dark:to-transparent' : 'border-slate-200 dark:border-slate-700 hover:border-purple-500/50'}`}
                    >
                        {/* Rank Badge */}
                        <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-sm text-white">
                            {pick.rank}
                        </div>

                        {/* Player Info */}
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{pick.name}</h3>
                        <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                            <span>{pick.team}</span>
                            <span>•</span>
                            <span>{pick.position}</span>
                            <span>•</span>
                            <span>£{pick.price.toFixed(1)}m</span>
                        </div>

                        {/* xPts */}
                        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                            {pick.xPts.toFixed(2)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Ceiling: {pick.xPts_high.toFixed(1)} pts
                        </div>

                        {/* Fixture */}
                        <div className="text-sm text-slate-500 mb-4">{pick.fixture}</div>

                        {/* Factors */}
                        <ul className="space-y-1">
                            {pick.explanation?.factors?.slice(0, 3).map((factor, j) => (
                                <li key={j} className="text-sm text-slate-600 dark:text-slate-400">{factor}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    )
}
