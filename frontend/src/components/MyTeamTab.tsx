import { useState, useRef } from 'react'

function Spinner() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin w-5 h-5 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

function StatBox({ label, value, highlight }: any) {
  return (
    <div className={`bg-surface-container-low border rounded-xl p-4 flex flex-col justify-center items-center shadow-sm
      ${highlight ? 'border-secondary' : 'border-surface-container-high'}`}>
      <div className={`font-headline text-2xl font-black ${highlight ? 'text-secondary' : 'text-on-surface'}`}>
        {value}
      </div>
      <div className="font-label text-xs uppercase tracking-widest text-outline mt-1">{label}</div>
    </div>
  )
}

export default function MyTeamTab() {
  const [imageUrl, setImageUrl] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)
  const [freeTransfers, setFreeTransfers] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">Transfer Planner</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Vision<br /><span className="text-primary italic">Analysis</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              Upload a screenshot of your current squad. Our vision model will interpret the layout and generate mathematically optimal transfer pathways.
            </p>
          </div>
        </div>
      </section>

      {!imageUrl ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center
            ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-surface-container-highest hover:border-outline bg-surface-container-lowest'
          }`}>
          <div className="h-20 w-20 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
          </div>
          <h3 className="font-headline text-2xl font-bold uppercase text-on-surface mb-2 tracking-tight">Drop your team screenshot here</h3>
          <p className="font-body text-outline mb-6">Supports PNG & JPG formats</p>
          <button className="bg-primary text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3 rounded-full hover:bg-primary/90 transition-colors">
            Select Screenshot
          </button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleFileSelect} className="hidden" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center">
            
            <div className="flex-shrink-0 w-64 rounded-xl overflow-hidden border border-surface-container-highest shadow-xl">
              <img src={imageUrl} alt="Team Screenshot" className="w-full h-auto" />
            </div>
            
            <div className="flex-1 flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-3">
                <label className="font-label text-xs uppercase tracking-widest text-outline">Available Free Transfers</label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setFreeTransfers(n)}
                      className={`w-12 h-12 rounded-lg font-headline text-xl font-bold transition-all
                        ${freeTransfers === n ? 'bg-primary text-on-primary shadow-lg' : 'bg-surface-container-high text-outline hover:text-on-surface hover:bg-surface-container-highest'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-surface-container-high">
                <button 
                  onClick={analyzeTeam} 
                  disabled={analyzing} 
                  className="flex-1 bg-primary text-on-primary font-label text-xs uppercase tracking-widest px-8 py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzing ? <Spinner /> : <><span className="material-symbols-outlined text-[18px]">manage_search</span> Analyze Vision Data</>}
                </button>
                <button 
                  onClick={resetUpload} 
                  className="bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest px-8 py-4 rounded-full hover:bg-surface-container-highest transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

          </div>

          {results && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Players Synthesized" value={`${results.matched_count}/${results.detected_count}`} />
                <StatBox label="Squad Valuation" value={`£${results.team_value}M`} />
                <StatBox label="Bank Balance" value={`£${results.bank}M`} highlight={results.bank > 0.5} />
                <StatBox label="Free Transfers" value={results.free_transfers} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hit Advice */}
                {results.hit_advice && (
                  <div className={`border rounded-xl p-8 relative overflow-hidden grain-overlay ${results.hit_advice.should_take_hit
                      ? 'bg-secondary/10 border-secondary'
                      : 'bg-primary/10 border-primary'
                    }`}>
                    <h3 className="font-headline text-2xl font-bold text-on-surface mb-2 uppercase tracking-tight relative z-10">
                      Transfer <span className="italic">Verdict</span>
                    </h3>
                    <div className="font-label text-[10px] uppercase tracking-widest text-outline mb-6 flex gap-3 relative z-10">
                       <span className="bg-surface-container-high px-2 py-1 rounded">{results.free_transfers} FT Available</span>
                       <span className="bg-surface-container-high px-2 py-1 rounded">£{results.bank}M ITB</span>
                    </div>
                    <p className="font-body text-on-surface opacity-90 leading-relaxed text-sm md:text-base relative z-10">
                      {results.hit_advice.explanation}
                    </p>
                    <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                      <span className="material-symbols-outlined text-9xl tracking-normal">{results.hit_advice.should_take_hit ? 'warning' : 'verified'}</span>
                    </div>
                  </div>
                )}

                {/* Best XI */}
                {results.best_xi && (
                  <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-container-high">
                      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface">Base XI Projection</h3>
                      <div className="flex gap-2 font-label text-[10px] uppercase tracking-widest">
                        <span className="bg-surface-container-high px-3 py-1.5 rounded text-outline">{results.best_xi.formation}</span>
                        <span className="bg-primary/20 text-primary px-3 py-1.5 rounded font-bold border border-primary/30">{results.best_xi.total_xpts} xPts</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {results.best_xi.players.map((p, i) => (
                        <div key={i} className={`p-3 rounded-lg border flex flex-col justify-between ${p.is_captain ? 'bg-secondary/10 border-secondary/50' :
                            p.is_vice ? 'bg-surface-container-low border-outline' :
                              'bg-surface-container-lowest border-surface-container-high'
                          }`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-label text-[9px] uppercase tracking-widest text-outline">{p.position}</span>
                            {(p.is_captain || p.is_vice) && (
                               <span className="font-headline font-black text-xs">{p.is_captain ? 'C' : 'V'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-headline font-bold text-sm text-on-surface truncate">{p.name.split(' ').pop()}</div>
                            <div className="flex justify-between items-end mt-2">
                               <div className="text-[10px] font-mono text-outline">£{p.price}</div>
                               <div className="text-xs font-bold font-mono text-primary">{p.xPts}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Transfer Suggestions */}
              {results.transfers && results.transfers.length > 0 && (
                <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-surface-container-high">
                    <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface">Suggested Pathways</h3>
                  </div>
                  <div className="divide-y divide-surface-container-high">
                    {results.transfers.map((t, i) => (
                      <div key={i} className={`p-6 flex flex-col md:flex-row items-center gap-6 ${t.is_free ? 'bg-surface-container-lowest' : 'bg-surface-container-lowest/50'}`}>
                        
                        <div className="flex-1 flex items-center justify-between w-full md:w-auto bg-surface-container-low p-4 rounded-xl border border-surface-container-highest relative">
                           {/* OUT */}
                           <div className="w-[40%] text-left">
                             <div className="font-label text-[10px] text-red-500 uppercase tracking-widest mb-1">Transfer Out</div>
                             <div className="font-headline font-bold text-on-surface">{t.out.name}</div>
                             <div className="font-mono text-[10px] text-outline mt-1">{t.out.team} • £{t.out.price}M</div>
                           </div>
                           
                           {/* ICON */}
                           <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-surface-container-lowest w-8 h-8 rounded-full border border-surface-container-high flex items-center justify-center text-outline z-10">
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                           </div>

                           {/* IN */}
                           <div className="w-[40%] text-right">
                             <div className="font-label text-[10px] text-emerald-500 uppercase tracking-widest mb-1">Transfer In</div>
                             <div className="font-headline font-bold text-on-surface">{t.in.name}</div>
                             <div className="font-mono text-[10px] text-outline mt-1">{t.in.team} • £{t.in.price}M</div>
                           </div>
                        </div>

                        {/* METRICS */}
                        <div className="flex gap-6 items-center flex-shrink-0">
                          <div className="text-center">
                             <div className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Net Flow</div>
                             <div className={`font-mono text-sm font-bold ${t.net_gain > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{t.net_gain > 0 ? '+' : ''}{t.net_gain} <span className="text-[10px] font-normal text-outline">xPts</span></div>
                          </div>
                          <div className="text-center">
                             <div className="font-label text-[9px] uppercase tracking-widest text-outline mb-1">Cost Var.</div>
                             <div className="font-mono text-sm text-outline">{t.price_change > 0 ? '+' : ''}{t.price_change}M</div>
                          </div>
                          <div className="flex flex-col gap-2 w-24">
                              {t.is_free ? (
                                <span className="inline-block px-2 py-1 text-center bg-surface-container-highest text-outline font-label text-[9px] uppercase tracking-widest rounded-sm">Free Tr</span>
                              ) : (
                                <span className="inline-block px-2 py-1 text-center bg-red-500/10 text-red-500 font-label text-[9px] uppercase tracking-widest rounded-sm">-4 Hit</span>
                              )}
                              {!t.price_feasible && (
                                <span className="inline-block px-2 py-1 text-center bg-amber-500/10 text-amber-500 font-label text-[9px] uppercase tracking-widest rounded-sm">No Funds</span>
                              )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chip Suggestions */}
              {results.chip_suggestions && results.chip_suggestions.length > 0 && (
                <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-6">
                  <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">Chip Stratagem</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.chip_suggestions.map((chip, i) => (
                      <div key={i} className="bg-surface-container-lowest rounded-lg p-5 border border-surface-container-high relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3 relative z-10">
                          <h4 className="font-headline font-bold uppercase text-secondary">{chip.chip}</h4>
                          <span className="font-mono text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Score: {chip.score}</span>
                        </div>
                        <p className="font-body text-sm text-on-surface opacity-80 mb-3 relative z-10">{chip.reason}</p>
                        <p className="font-label text-[10px] uppercase tracking-widest text-secondary relative z-10">{chip.for_your_team}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  )
}
