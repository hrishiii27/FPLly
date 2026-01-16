import { useState, useRef } from 'react'

function Spinner() {
    return (
        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function MyTeamTab() {
    const [imageUrl, setImageUrl] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [results, setResults] = useState(null)
    const [dragOver, setDragOver] = useState(false)
    const [freeTransfers, setFreeTransfers] = useState(1)
    const fileInputRef = useRef()

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const handleFile = (file) => {
        if (!file.type.match('image.*')) {
            alert('Please upload an image file (PNG or JPG)')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            setImageUrl(e.target.result)
            setResults(null)
        }
        reader.readAsDataURL(file)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    const analyzeTeam = async () => {
        if (!imageUrl) return

        setAnalyzing(true)
        try {
            const blob = await fetch(imageUrl).then(r => r.blob())
            const formData = new FormData()
            formData.append('image', blob, 'team.png')
            formData.append('free_transfers', freeTransfers.toString())

            const res = await fetch('/api/upload-team', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (data.error) {
                alert('Error: ' + data.error)
            } else {
                setResults(data)
            }
        } catch (error) {
            console.error('Analysis failed:', error)
            alert('Failed to analyze team')
        }
        setAnalyzing(false)
    }

    const resetUpload = () => {
        setImageUrl(null)
        setResults(null)
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">📸 Upload Your Team</h2>

            {!imageUrl ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
            ${dragOver
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                            : 'border-slate-300 dark:border-slate-600 hover:border-purple-400'}`}
                >
                    <div className="text-6xl mb-4">📤</div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Drop your team screenshot here</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">or click to select (PNG, JPG)</p>
                    <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg font-semibold">
                        Select Image
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleFileSelect} className="hidden" />
                </div>
            ) : (
                <div>
                    <div className="text-center mb-6">
                        <img src={imageUrl} alt="Team" className="max-w-full max-h-48 mx-auto rounded-xl shadow-lg mb-4 border border-slate-200 dark:border-slate-700" />

                        {/* Free Transfers Selector */}
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <label className="text-slate-700 dark:text-slate-300 font-medium">Free Transfers:</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setFreeTransfers(n)}
                                        className={`w-10 h-10 rounded-lg font-bold transition-all
                      ${freeTransfers === n ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button onClick={analyzeTeam} disabled={analyzing} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
                                {analyzing ? <><Spinner /> Analyzing...</> : '🔍 Analyze Team'}
                            </button>
                            <button onClick={resetUpload} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-6 py-3 rounded-lg font-semibold">
                                ↩️ Reset
                            </button>
                        </div>
                    </div>

                    {results && (
                        <div className="mt-8 space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatBox label="Players Detected" value={`${results.matched_count}/${results.detected_count}`} />
                                <StatBox label="Team Value" value={`£${results.team_value}m`} />
                                <StatBox label="Bank" value={`£${results.bank}m`} highlight={results.bank > 1} />
                                <StatBox label="Free Transfers" value={results.free_transfers} />
                            </div>

                            {/* Best XI */}
                            {results.best_xi && (
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">⭐ Best XI for GW{results.gw}</h3>
                                        <div className="flex gap-3">
                                            <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg font-bold">
                                                {results.best_xi.formation}
                                            </span>
                                            <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-lg font-bold">
                                                {results.best_xi.total_xpts} xPts
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                        {results.best_xi.players.map((p, i) => (
                                            <div key={i} className={`p-2 rounded-lg text-center border ${p.is_captain ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-400' :
                                                    p.is_vice ? 'bg-slate-100 dark:bg-slate-700 border-slate-400' :
                                                        'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                <div className="text-xs text-slate-500">{p.position}</div>
                                                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                                    {p.is_captain && '👑 '}{p.is_vice && '🥈 '}{p.name}
                                                </div>
                                                <div className="text-xs text-purple-600 dark:text-purple-400">{p.xPts} xPts</div>
                                                <div className="text-xs text-slate-400">£{p.price}m</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hit Advice */}
                            {results.hit_advice && (
                                <div className={`border rounded-xl p-5 ${results.hit_advice.should_take_hit
                                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/50'
                                        : 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/50'
                                    }`}>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                        💡 Transfer Advice ({results.free_transfers} FT, £{results.bank}m ITB)
                                    </h3>
                                    <p className="text-slate-700 dark:text-slate-300 text-lg">{results.hit_advice.explanation}</p>
                                </div>
                            )}

                            {/* Chip Suggestions */}
                            {results.chip_suggestions && results.chip_suggestions.length > 0 && (
                                <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/50 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">🃏 Chip Suggestions</h3>
                                    <div className="space-y-3">
                                        {results.chip_suggestions.map((chip, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-purple-200 dark:border-purple-500/30">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-purple-700 dark:text-purple-400">{chip.chip}</span>
                                                    <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-sm">
                                                        Score: {chip.score}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{chip.reason}</p>
                                                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1 font-medium">{chip.for_your_team}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Transfer Suggestions */}
                            {results.transfers && results.transfers.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">🔄 Transfer Options</h3>
                                    <div className="space-y-3">
                                        {results.transfers.map((t, i) => (
                                            <div key={i} className={`flex flex-wrap items-center gap-3 bg-white dark:bg-slate-700/50 border rounded-lg p-4
                        ${t.is_free
                                                    ? 'border-emerald-300 dark:border-emerald-500/50'
                                                    : t.recommended
                                                        ? 'border-amber-300 dark:border-amber-500/50'
                                                        : 'border-slate-200 dark:border-slate-600 opacity-60'}`}>

                                                {/* Transfer Type Badge */}
                                                <div className="flex-shrink-0">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold
                            ${t.is_free
                                                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                        {t.is_free ? 'FREE' : '-4 HIT'}
                                                    </span>
                                                </div>

                                                {/* Out Player */}
                                                <div className="flex-1 min-w-[120px]">
                                                    <div className="text-red-600 dark:text-red-400 font-medium">{t.out.name}</div>
                                                    <div className="text-xs text-slate-500">{t.out.team} • £{t.out.price}m • {t.out.xPts} xPts</div>
                                                </div>

                                                <div className="text-xl text-slate-400">→</div>

                                                {/* In Player */}
                                                <div className="flex-1 min-w-[120px]">
                                                    <div className="text-emerald-600 dark:text-emerald-400 font-medium">{t.in.name}</div>
                                                    <div className="text-xs text-slate-500">{t.in.team} • £{t.in.price}m • {t.in.xPts} xPts</div>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex gap-3 items-center">
                                                    <div className="text-center">
                                                        <div className="text-xs text-slate-400">Gain</div>
                                                        <div className="font-bold text-emerald-600 dark:text-emerald-400">+{t.points_gain}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs text-slate-400">Net</div>
                                                        <div className={`font-bold ${t.net_gain > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {t.net_gain > 0 ? '+' : ''}{t.net_gain}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs text-slate-400">Cost</div>
                                                        <div className={`font-bold ${t.price_change > 0 ? 'text-red-500' : t.price_change < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                            {t.price_change > 0 ? '+' : ''}{t.price_change}m
                                                        </div>
                                                    </div>
                                                    {!t.price_feasible && (
                                                        <span className="text-xs text-red-500 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded">💰 Need funds</span>
                                                    )}
                                                    {t.recommended && t.price_feasible && (
                                                        <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded">✅ Recommended</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detected Players */}
                            <details className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <summary className="p-4 cursor-pointer font-semibold text-slate-900 dark:text-white">
                                    🎯 All Detected Players ({results.matched_count}/{results.detected_count})
                                </summary>
                                <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {results.detected_players?.map((p, i) => (
                                        <div key={i} className={`p-2 rounded-lg text-center border text-sm
                      ${p.matched ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300'}`}>
                                            <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                                            {p.matched && <div className="text-xs text-slate-500">£{p.price}m • {p.xPts?.toFixed(1)} xPts</div>}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function StatBox({ label, value, highlight }) {
    return (
        <div className={`bg-white dark:bg-slate-700/50 border rounded-lg p-3 text-center
      ${highlight ? 'border-emerald-300 dark:border-emerald-500/50' : 'border-slate-200 dark:border-slate-600'}`}>
            <div className={`text-xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                {value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        </div>
    )
}
