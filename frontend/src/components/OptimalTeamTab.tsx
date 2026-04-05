import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Spinner() {
  return (
    <div className="flex justify-center my-12">
      <div className="animate-spin w-8 h-8 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

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
    1: 'bg-secondary', 2: 'bg-[#a292ff]', 3: 'bg-outline', 4: 'bg-amber-400', 5: 'bg-red-500'
  }
  return <div className={`w-2 h-2 rounded-full ${colors[fdr] || 'bg-outline'} shadow-[0_0_8px_currentColor]`} title={`FDR: ${fdr}`}></div>
}

const PlayerCard = ({ player, isBench = false }) => {
  const { name, team, position, price, xPts, fixture, captain, vice_captain, analysis } = player
  const { opp, loc, fdr } = parseFixture(fixture)

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`relative flex flex-col items-center group cursor-pointer transition-transform hover:-translate-y-2 ${isBench ? 'w-20' : 'w-24 md:w-28'}`}
    >
      {/* Badges */}
      {captain && <div className="absolute -top-2 -right-2 bg-primary text-on-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20 shadow-[0_4px_12px_rgba(98,54,255,0.4)]">C</div>}
      {vice_captain && <div className="absolute -top-2 -right-2 bg-surface text-on-surface w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-surface-container-highest z-20 shadow-lg">V</div>}

      {/* Futuristic Kit Box */}
      <div className={`
        relative w-full h-12 flex flex-col items-center justify-center mb-1 rounded-t-lg border-b-2
        ${position === 'GKP' ? 'bg-secondary/10 border-secondary' : 'bg-surface-container-high border-primary'}
      `}>
         <div className="font-headline font-black text-on-surface opacity-80 text-xl tracking-tighter uppercase">
             {team.substring(0,3)}
         </div>
      </div>

      {/* Name Box */}
      <div className="bg-on-surface text-surface text-[10px] md:text-xs px-2 py-1 font-label uppercase tracking-widest truncate w-full text-center outline outline-1 outline-surface-container-highest">
        {name.split(' ').pop()}
      </div>

      {/* Info Box */}
      <div className="flex flex-col w-full bg-surface-container-lowest border-x border-b border-surface-container-highest text-[10px] rounded-b-lg p-1.5 items-center gap-1">
        <div className="flex items-center gap-1 font-mono text-outline uppercase">
          <span>{opp}</span>
          <span className={loc === 'H' ? 'text-primary' : ''}>({loc})</span>
          <FDRColor fdr={fdr} />
        </div>
        <div className="flex justify-between w-full px-1 border-t border-surface-container-high pt-1 mt-0.5">
          <span className="text-outline font-mono">£{price}</span>
          <span className="font-bold text-primary font-mono">{xPts}</span>
        </div>
      </div>

      {/* Hover Popup Detail */}
      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-surface rounded-xl shadow-2xl p-4 text-left text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-surface-container-high pointer-events-none fade-in slide-in-from-bottom-2">
        <h4 className="font-headline font-bold text-on-surface uppercase tracking-tight mb-3 pb-2 border-b border-surface-container-highest flex justify-between">
          <span>{name}</span>
          <span className="text-primary">{position}</span>
        </h4>
        <div className="space-y-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-outline">xPTS</span>
            <span className="font-bold text-primary text-sm">{xPts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-outline">xG</span>
            <span>{analysis?.xG || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-outline">xA</span>
            <span>{analysis?.xA || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-outline">Form</span>
            <span className={`capitalize ${analysis?.form === 'rising' ? 'text-primary' : 'text-outline'}`}>{analysis?.form || '-'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function OptimalTeamTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOptimal() {
      try {
        const res = await fetch('/api/optimal-team')
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch optimal team:', error)
      }
      setLoading(false)
    }
    fetchOptimal()
  }, [])

  const getPlayersByPos = (players, pos) => {
    return players?.filter(p => p.position === pos) || []
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
        <Spinner />
        <div className="text-center font-mono opacity-80">
          <p className="text-sm uppercase tracking-widest text-primary">Simulating 42,000 Permutations...</p>
        </div>
      </div>
    )
  }

  const gkp = getPlayersByPos(data?.starting_xi, 'GKP')
  const def = getPlayersByPos(data?.starting_xi, 'DEF')
  const mid = getPlayersByPos(data?.starting_xi, 'MID')
  const fwd = getPlayersByPos(data?.starting_xi, 'FWD')

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-primary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Optimal Selection</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              The Perfect <span className="text-primary italic">Structure</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              An unconstrained AI optimization resolving the ultimate Free Hit squad for GW{data?.gw}. Based entirely on statistical ceilings and floor modeling.
            </p>
          </div>
        </div>
      </section>

      {/* Header Stats */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-8 flex flex-col md:flex-row gap-8 justify-between items-center grain-overlay">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_10px_30px_rgba(98,54,255,0.3)]">
            <span className="material-symbols-outlined text-3xl tracking-normal">stars</span>
          </div>
          <div>
            <h2 className="font-headline text-2xl font-bold uppercase">Squad Valuation</h2>
            <p className="font-label text-outline text-xs tracking-widest uppercase">Budget Capped at £100M</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full md:w-auto">
          <div className="flex flex-col">
            <span className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Squad Cost</span>
            <span className="font-headline text-3xl font-black">£{data?.total_price}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Projected Return</span>
            <span className="font-headline text-3xl font-black text-primary">{data?.expected_points}</span>
          </div>
          <div className="flex flex-col col-span-2 md:col-span-1">
            <span className="font-label text-[10px] uppercase tracking-widest text-outline mb-1">Tactical Setup</span>
            <span className="font-headline text-3xl font-black">{data?.formation}</span>
          </div>
        </div>
      </div>

      {/* Pitch View */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-[700px] h-[700px] bg-[#1a1c19] rounded-2xl p-6 relative shadow-2xl border border-[#2a2d29] overflow-hidden flex flex-col justify-around">
          {/* Pitch Vector Markings */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
             {/* Center circle */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white rounded-full"></div>
             {/* Halfway line */}
             <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
             {/* Penalty Areas */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 border border-white border-t-0"></div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-32 border border-white border-b-0"></div>
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-12 border border-white border-t-0"></div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-12 border border-white border-b-0"></div>
          </div>

          <div className="flex justify-center w-full relative z-10">
            {gkp.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>
          <div className="flex justify-center w-full gap-4 md:gap-12 relative z-10 hidden={def.length === 0}">
            {def.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>
          <div className="flex justify-center w-full gap-4 md:gap-12 relative z-10 hidden={mid.length === 0}">
            {mid.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>
          <div className="flex justify-center w-full gap-4 md:gap-12 relative z-10 hidden={fwd.length === 0}">
            {fwd.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>
        </div>
      </div>

      {/* Bench */}
      <div className="bg-surface-container-low rounded-xl p-8 border border-surface-container-high">
        <h3 className="font-label text-xs font-bold text-outline uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined tracking-normal text-sm">chair</span> The Bench
        </h3>
        <div className="flex justify-start gap-6 overflow-x-auto pb-4">
          {data?.bench?.map(p => (
            <PlayerCard key={p.id} player={p} isBench={true} />
          ))}
        </div>
      </div>

    </div>
  )
}
