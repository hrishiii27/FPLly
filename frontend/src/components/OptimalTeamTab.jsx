import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, TrendingUp, DollarSign, Activity, AlertCircle } from 'lucide-react'

function Spinner() {
    return (
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

// Helper to parse fixture string "MUN(A) FDR:3"
const parseFixture = (fixStr) => {
    if (!fixStr || fixStr === 'No fixture') return { opp: '-', loc: '-', fdr: 3 }
    const match = fixStr.match(/([A-Z]+)\(([HA])\) FDR:(\d)/)
    if (match) {
        return { opp: match[1], loc: match[2], fdr: parseInt(match[3]) }
    }
    return { opp: fixStr, loc: '', fdr: 3 }
}

const FDRColor = ({ fdr }) => {
    const colors = {
        1: 'bg-emerald-500', 2: 'bg-emerald-400', 3: 'bg-slate-400', 4: 'bg-amber-500', 5: 'bg-red-600'
    }
    return <div className={`w-3 h-3 rounded-full ${colors[fdr] || 'bg-slate-400'}`} title={`FDR: ${fdr}`}></div>
}

const PlayerCard = ({ player, isBench = false }) => {
    const { id, name, team, position, price, xPts, fixture, captain, vice_captain, analysis } = player
    const { opp, loc, fdr } = parseFixture(fixture)

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative flex flex-col items-center group cursor-pointer ${isBench ? 'w-24' : 'w-28'}`}
        >
            {/* C/VC Badge */}
            {captain && <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-white z-20">C</div>}
            {vice_captain && <div className="absolute -top-2 -right-2 bg-slate-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-white z-20">V</div>}

            {/* Kit / Jersey Placeholder */}
            <div className={`
        relative mb-1 transition-transform group-hover:-translate-y-1
        ${position === 'GKP' ? 'text-yellow-500' : 'text-purple-600'}
      `}>
                <svg viewBox="0 0 24 24" fill="currentColor" className={`w-12 h-12 drop-shadow-md`}>
                    <path d="M12 2L4 5v11l8 6 8-6V5l-8-3z" /> {/* Simple Shield Shirt */}
                </svg>
                {/* Team initials overlaid */}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white pt-1">
                    {team}
                </div>
            </div>

            {/* Name Box */}
            <div className="bg-slate-900/90 text-white text-xs px-2 py-0.5 rounded-sm font-semibold truncate w-full text-center shadow-sm">
                {name}
            </div>

            {/* Info Box */}
            <div className="flex flex-col w-full bg-white/90 dark:bg-slate-800/90 text-[10px] rounded-b-sm border-t-0 p-1 shadow-sm items-center gap-0.5 backdrop-blur-sm">
                <div className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                    <span>{opp}</span>
                    <span className={loc === 'H' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>({loc})</span>
                    <FDRColor fdr={fdr} />
                </div>
                <div className="flex justify-between w-full px-1 border-t border-slate-200 dark:border-slate-700 pt-0.5 mt-0.5">
                    <span className="text-slate-500">£{price}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{xPts} xP</span>
                </div>
            </div>

            {/* Hover Popup Detail */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-3 text-left text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-slate-100 dark:border-slate-700 pointer-events-none">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 pb-1 border-b border-slate-100 dark:border-slate-700">{name} ({team})</h4>
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Exp. Points</span>
                        <span className="font-bold text-emerald-500">{xPts}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Exp. Goals</span>
                        <span>{analysis?.xG}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Exp. Assists</span>
                        <span>{analysis?.xA}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Exp. Clean Sheet</span>
                        <span>{analysis?.xCS}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Form Trend</span>
                        <span className={`capitalize ${analysis?.form === 'rising' ? 'text-emerald-500' : 'text-slate-500'}`}>{analysis?.form || '-'}</span>
                    </div>
                </div>
            </div>

        </motion.div>
    )
}

export default function OptimalTeamTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOptimal()
    }, [])

    const fetchOptimal = async () => {
        try {
            const res = await fetch('/api/optimal-team')
            const result = await res.json()
            setData(result)
        } catch (error) {
            console.error('Failed to fetch optimal team:', error)
        }
        setLoading(false)
    }

    // Group players by position for the pitch
    const getPlayersByPos = (players, pos) => {
        return players?.filter(p => p.position === pos) || []
    }

    if (loading) return <div className="flex flex-col items-center justify-center h-64"><Spinner /><p className="mt-4 text-slate-500">AI is optimizing squad...</p></div>

    const gkp = getPlayersByPos(data?.starting_xi, 'GKP')
    const def = getPlayersByPos(data?.starting_xi, 'DEF')
    const mid = getPlayersByPos(data?.starting_xi, 'MID')
    const fwd = getPlayersByPos(data?.starting_xi, 'FWD')

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap gap-6 justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="text-purple-500" />
                        Optimal XI <span className="text-slate-400 text-sm font-normal">(Free Hit)</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">AI-Recommended Selection for GW{data?.gw}</p>
                </div>

                <div className="flex gap-6 text-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-slate-500 flex items-center gap-1"><DollarSign size={14} /> Cost</span>
                        <span className="font-bold text-slate-900 dark:text-white">£{data?.total_price}m</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-500 flex items-center gap-1"><Activity size={14} /> Exp. Points</span>
                        <span className="font-bold text-emerald-500 text-lg">{data?.expected_points}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-500">Formation</span>
                        <span className="font-bold text-slate-900 dark:text-white">{data?.formation}</span>
                    </div>
                </div>
            </div>

            {/* Pitch View */}
            <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[600px] bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-xl border-4 border-emerald-900/40 p-6 relative shadow-inner">
                    {/* Center Circle & Lines for aesthetics */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>

                    <div className="flex flex-col items-center justify-between gap-8 py-4 relative z-10">
                        {/* GKP */}
                        <div className="flex justify-center w-full">
                            {gkp.map(p => <PlayerCard key={p.id} player={p} />)}
                        </div>

                        {/* DEF */}
                        <div className="flex justify-center w-full gap-4 md:gap-12">
                            {def.map(p => <PlayerCard key={p.id} player={p} />)}
                        </div>

                        {/* MID */}
                        <div className="flex justify-center w-full gap-4 md:gap-12">
                            {mid.map(p => <PlayerCard key={p.id} player={p} />)}
                        </div>

                        {/* FWD */}
                        <div className="flex justify-center w-full gap-4 md:gap-12">
                            {fwd.map(p => <PlayerCard key={p.id} player={p} />)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bench */}
            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Bench
                </h3>
                <div className="flex justify-start gap-4 overflow-x-auto pb-2">
                    {data?.bench?.map(p => (
                        <PlayerCard key={p.id} player={p} isBench={true} />
                    ))}
                </div>
            </div>

            {/* Warning/Notes */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertCircle size={20} className="shrink-0" />
                <p>
                    This team assumes a "Free Hit" scenario (unlimited budget up to £100m, no transfer costs).
                    For transfer advice based on your current team, use the <strong>Transfer Planning</strong> tool.
                </p>
            </div>

        </div>
    )
}
