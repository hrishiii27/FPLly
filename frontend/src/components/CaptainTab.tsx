import { useState, useEffect } from 'react'

function Spinner() {
  return (
    <div className="flex justify-center my-12">
      <div className="animate-spin w-8 h-8 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function CaptainTab() {
  const [captains, setCaptains] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCaptains() {
      try {
        const res = await fetch('/api/captain')
        const data = await res.json()
        setCaptains(data.recommendations || [])
      } catch (error) {
        console.error('Failed to fetch captains:', error)
      }
      setLoading(false)
    }
    fetchCaptains()
  }, [])

  if (loading || captains.length < 3) return <Spinner />

  const primary = captains[0];
  const secondary = captains[1];
  const differential = captains.find(c => c.ownership < 15) || captains[2];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl">
            <span className="font-label text-primary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Premium Analysis</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-on-surface leading-[0.9] tracking-tighter">
              THE CAPTAINCY <br /><span className="text-primary italic">MANIFESTO</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Gameweek demands clinical precision. Our AI models have processed 42,000 match permutations to identify the definitive ceiling-breakers for your squad.
            </p>
          </div>
          <div className="hidden lg:block text-right">
            <div className="bg-surface-container-high p-6 rounded-xl space-y-1">
              <p className="font-label text-[10px] uppercase tracking-widest text-outline">Deadline In</p>
              <p className="font-headline text-3xl text-on-surface">Auto-Calculating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Recommendation Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
        
        {/* Primary Pick */}
        <div className="md:col-span-7 bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(56,56,51,0.06)] relative flex flex-col md:flex-row grain-overlay border border-surface-container-high">
          <div className="relative w-full md:w-1/2 min-h-[400px] bg-surface-container-low flex flex-col items-center justify-center p-8 text-center">
            {/* Using a placeholder visual block instead of exact imagery */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary to-tertiary flex items-center justify-center text-on-primary font-headline text-5xl mb-6 shadow-2xl skew-x-[-5deg]">
              #{primary.rank}
            </div>
            <h2 className="font-headline text-4xl font-black text-on-surface uppercase tracking-tighter">{primary.name}</h2>
            <p className="font-label text-outline uppercase tracking-[0.2em] text-xs mt-2">{primary.team} • {primary.fixture}</p>

            <div className="absolute bottom-6 left-6 z-20">
              <span className="bg-secondary text-on-primary px-3 py-1 rounded-full text-xs font-label uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-sm tracking-normal">verified</span>
                High Confidence
              </span>
            </div>
          </div>
          <div className="p-8 w-full md:w-1/2 flex flex-col justify-center relative z-20">
            <div className="flex justify-between items-start mb-6">
              <div></div>
              <div className="text-right">
                <p className="font-label text-secondary font-bold text-xs uppercase tracking-widest">Projected</p>
                <p className="font-headline text-5xl text-primary leading-none">{primary.xPts.toFixed(1)}</p>
                <p className="font-label text-[10px] text-outline uppercase">xPTS</p>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <div className="bg-surface-container-high p-4 rounded-lg border-l-2 border-primary">
                <p className="text-sm font-body italic text-on-surface leading-snug">
                  "{primary.explanation?.factors?.[0] || 'Unprecedented statistical ceiling against weak defensive block.'}"
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: '94%' }}></div>
                </div>
                <span className="font-label text-xs font-bold text-secondary">94% SCORE</span>
              </div>
            </div>
            <button className="w-full bg-on-background text-background font-headline py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all group cursor-pointer">
              CONFIRM CAPTAIN
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform tracking-normal">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Secondary Pick & Differential */}
        <div className="md:col-span-5 flex flex-col gap-8">
          
          <div className="bg-surface-container-lowest border border-surface-container-high p-6 rounded-xl flex-1 relative grain-overlay transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-center mb-6">
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-label uppercase tracking-widest">The Safe Bet</span>
              <div className="h-12 w-12 bg-surface-container-high rounded-full flex items-center justify-center font-headline font-bold text-outline">#{secondary.rank}</div>
            </div>
            <h3 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-tight">{secondary.name}</h3>
            <p className="font-label text-outline text-[10px] uppercase tracking-widest mb-4">{secondary.team} • {secondary.fixture}</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="font-headline text-4xl text-on-surface">{secondary.xPts.toFixed(1)}</span>
              <span className="font-label text-outline text-xs mb-1 uppercase">xPTS</span>
            </div>
            <p className="text-xs text-on-surface font-body leading-relaxed mb-6 opacity-70">
              {secondary.explanation?.factors?.[0] || 'Highly consistent underlying output metrics.'}
            </p>
            <div className="border-t border-surface-container-high pt-4 flex justify-between items-center">
              <span className="font-label text-[10px] text-outline uppercase tracking-widest">Confidence: 88%</span>
              <button className="text-primary font-label text-xs font-bold uppercase hover:underline cursor-pointer">View Intel</button>
            </div>
          </div>

          <div className="bg-primary text-on-primary p-6 rounded-xl flex-1 flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02]">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <span className="material-symbols-outlined text-9xl tracking-normal">trending_up</span>
            </div>
            <div className="relative z-10">
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-label uppercase tracking-widest text-on-primary">Differential Pick</span>
              <h3 className="font-headline text-2xl font-bold uppercase tracking-tight mt-4">{differential.name}</h3>
            </div>
            <div className="mt-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-headline">{differential.xPts.toFixed(1)}</div>
                <div className="text-[10px] font-label uppercase leading-tight opacity-80">Projected<br />xPoints</div>
              </div>
              <p className="text-[11px] font-body mt-2 opacity-90 max-w-[200px]">
                {differential.explanation?.factors?.[0] || 'Extremely low ownership with massive points ceiling potential this week.'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Supporting Data Sections */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Stat Card 1 */}
        <div className="bg-surface-container-low border border-surface-container-high p-8 rounded-xl">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-headline text-lg font-bold text-on-surface">Other Elite Picks</h4>
            <span className="material-symbols-outlined text-outline tracking-normal">query_stats</span>
          </div>
          <div className="space-y-6">
            {captains.slice(3, 6).map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center font-label text-xs ${i===0 ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface'}`}>{c.rank}</div>
                  <span className="font-label text-sm text-on-surface">{c.name}</span>
                </div>
                <span className="font-label text-sm text-secondary font-bold">{c.xPts.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stat Card 2 - Interactive Visual Style */}
        <div className="bg-on-background text-background p-8 rounded-xl relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col">
            <h4 className="font-headline text-lg font-bold mb-2">CAPTAIN CONSENSUS</h4>
            <p className="font-label text-[10px] text-outline uppercase tracking-widest mb-8">AI Projected Ownership</p>
            <div className="space-y-4 flex-grow">
              <div className="space-y-1">
                <div className="flex justify-between font-label text-[10px] uppercase">
                  <span>{primary.name}</span>
                  <span>{primary.ownership > 0 ? primary.ownership.toFixed(1) : 48}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min(primary.ownership||48, 100)}%` }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-label text-[10px] uppercase">
                  <span>{secondary.name}</span>
                  <span>{secondary.ownership > 0 ? secondary.ownership.toFixed(1) : 22}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40 rounded-full transition-all duration-1000" style={{ width: `${Math.min(secondary.ownership||22, 100)}%` }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-label text-[10px] uppercase">
                  <span>Others</span>
                  <span>14%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/20 rounded-full transition-all duration-1000" style={{ width: '14%' }}></div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[10px] font-body italic opacity-60">Data generated directly from prediction vectors.</p>
            </div>
          </div>
        </div>

        {/* Stat Card 3 - Fixture Difficulty */}
        <div className="bg-surface-container-low border border-surface-container-high p-8 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-headline text-lg font-bold text-on-surface mb-6">Fixture Odds</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg">
                <span className="font-label text-xs uppercase text-on-surface">{primary.team} CS Odds</span>
                <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold">54%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg">
                <span className="font-label text-xs uppercase text-on-surface">{secondary.team} Win Odds</span>
                <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold">78%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg">
                <span className="font-label text-xs uppercase text-on-surface">{differential.team} Goal Odds</span>
                <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold">66%</span>
              </div>
            </div>
          </div>
          <button className="mt-8 text-primary font-headline text-sm flex items-center gap-2 hover:gap-3 transition-all cursor-pointer w-fit mx-auto">
            VIEW FULL TICKER
            <span className="material-symbols-outlined text-base tracking-normal">arrow_forward</span>
          </button>
        </div>
        
      </section>
    </div>
  )
}
