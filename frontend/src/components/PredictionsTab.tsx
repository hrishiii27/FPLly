import { useState, useEffect } from 'react'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full my-4">
      <div className="animate-spin w-5 h-5 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

export default function PredictionsTab() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState('')
  const [maxPrice, setMaxPrice] = useState('20')

  useEffect(() => {
    async function fetchPredictions() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '50', max_price: maxPrice })
        if (position) params.append('position', position)
        
        const res = await fetch(`/api/predictions?${params}`)
        const data = await res.json()
        setPredictions(data.predictions || [])
      } catch (error) {
        console.error('Failed to fetch predictions:', error)
      }
      setLoading(false)
    }
    fetchPredictions()
  }, [position, maxPrice])

  const getPositionColor = (pos) => {
    const colors = {
      'GKP': 'bg-surface-container-high text-outline',
      'DEF': 'bg-primary/20 text-primary border border-primary/30',
      'MID': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'FWD': 'bg-secondary/20 text-secondary border border-secondary/30'
    }
    return colors[pos] || 'bg-surface-container-highest text-outline'
  }

  const getFormIcon = (form) => {
    if (form === 'rising') return 'trending_up'
    if (form === 'falling') return 'trending_down'
    return 'arrow_right_alt'
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Algorithm Engine</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Player <span className="text-primary italic">Projections</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Filter through the machine learning model's expected points (xPts) to find the best value assets for the upcoming gameweek.
            </p>
          </div>
        </div>
      </section>

      {/* Controls */}
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <h3 className="font-headline font-bold uppercase tracking-tight text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">filter_alt</span> Parameters
        </h3>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none relative min-w-[160px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">sports_soccer</span>
            <select 
              value={position} 
              onChange={(e) => setPosition(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-lg pl-10 pr-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">All Positions</option>
              <option value="GKP">Goalkeepers</option>
              <option value="DEF">Defenders</option>
              <option value="MID">Midfielders</option>
              <option value="FWD">Forwards</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
          </div>

          <div className="flex-1 md:flex-none relative min-w-[160px]">
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">payments</span>
            <select 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-lg pl-10 pr-4 py-3 font-label text-xs uppercase tracking-widest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="20">No Limit</option>
              <option value="6">Under £6.0m</option>
              <option value="8">Under £8.0m</option>
              <option value="10">Under £10.0m</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
          <Spinner />
          <span className="font-mono text-xs text-primary uppercase tracking-widest">Generating Projections...</span>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono whitespace-nowrap">
              <thead className="bg-surface-container-low sticky top-0 z-10">
                <tr className="border-b border-surface-container-high text-outline text-left shadow-sm">
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Player</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Team</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Postn</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Price</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Proj xPts</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">95% CI Range</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Value (xPts/£)</th>
                  <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest">Momentum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high relative z-0">
                {predictions.map((p) => (
                  <tr 
                    key={p.id} 
                    className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-headline font-bold text-base text-on-surface group-hover:text-primary transition-colors">{p.name}</td>
                    <td className="px-6 py-4 font-bold text-outline uppercase">{p.team}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold ${getPositionColor(p.position)}`}>
                        {p.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-outline">£{p.price.toFixed(1)}m</td>
                    <td className="px-6 py-4 font-bold text-primary group-hover:scale-110 origin-left transition-transform inline-block">
                        {p.xPts.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-[10px] text-outline opacity-80">
                            [{p.xPts_low.toFixed(1)} - {p.xPts_high.toFixed(1)}]
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className="font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">
                            {p.value.toFixed(3)}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-widest ${
                          p.form === 'rising' ? 'text-primary' : 
                          p.form === 'falling' ? 'text-red-500' : 
                          'text-outline'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                            {getFormIcon(p.form)}
                        </span>
                        {p.form}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
