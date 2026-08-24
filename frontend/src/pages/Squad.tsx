import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import {
  EmptyState,
  Field,
  InlineError,
  PageHeader,
  PosBadge,
  Spinner,
  Stat,
  btnGhost,
  btnPrimary,
  inputClass,
} from '../components/ui/primitives'

function PlayerSearch({ onPick, placeholder }: { onPick: (p: any) => void; placeholder: string }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<any[]>([])
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const data = await api.players(q.trim())
        setHits(Array.isArray(data) ? data : [])
      } catch {
        setHits([])
      }
    }, 220)
    return () => clearTimeout(t)
  }, [q])
  return (
    <div className="relative mt-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        aria-label={placeholder}
      />
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto bg-card border border-border">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(h)
                  setQ('')
                  setHits([])
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex justify-between gap-2 cursor-pointer min-h-11"
              >
                <span className="font-semibold truncate">{h.name}</span>
                <span className="font-mono shrink-0 text-muted-fg">
                  {h.position} {h.team} £{h.price}m {h.minutes_tag || ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Squad() {
  const [imageUrl, setImageUrl] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)
  const [freeTransfers, setFreeTransfers] = useState(1)
  const [bank, setBank] = useState('')
  const [names, setNames] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file) => {
    if (!file.type.match('image.*')) {
      setError('Please upload a PNG or JPG.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageUrl(e.target.result)
      setResults(null)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const analyzeTeam = async () => {
    if (!imageUrl && !names.trim()) {
      setError('Upload a screenshot or paste at least 11 player names.')
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('free_transfers', freeTransfers.toString())
      if (bank !== '') formData.append('bank', bank)
      if (names.trim()) formData.append('names', names.trim())
      if (imageUrl) {
        const blob = await fetch(imageUrl).then((r) => r.blob())
        formData.append('image', blob, 'team.png')
      }
      const data = await api.uploadTeam(formData)
      if (data.error && !data.detected_players) {
        setError(data.error)
        setResults(null)
      } else {
        if (data.error) setError(data.error)
        setResults(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze team. Restart Flask if EasyOCR is downloading models.')
    }
    setAnalyzing(false)
  }

  const reanalyzeFromIds = async (ids: number[]) => {
    if (ids.length < 1) return
    setAnalyzing(true)
    setError('')
    try {
      const data = await api.uploadTeamIds({
        player_ids: ids,
        free_transfers: freeTransfers,
        bank: bank === '' ? undefined : Number(bank),
      })
      if (data.error && !data.detected_players) setError(data.error)
      else {
        if (data.error) setError(data.error)
        setResults(data)
      }
    } catch {
      setError('Could not refresh analysis after the edit.')
    }
    setAnalyzing(false)
  }

  const replaceSlot = (index: number, player: any) => {
    const slots = results?.detected_players || []
    const current = slots[index]
    let ids = slots.filter((p) => p.matched && p.id).map((p) => p.id)
    if (current?.matched && current.id) ids = ids.filter((id) => id !== current.id)
    if (!ids.includes(player.id)) ids.push(player.id)
    reanalyzeFromIds(ids)
  }

  const removeSlot = (id: number) => {
    const ids = (results?.detected_players || []).filter((p) => p.matched && p.id && p.id !== id).map((p) => p.id)
    reanalyzeFromIds(ids)
  }

  const addPlayer = (player: any) => {
    const ids = (results?.detected_players || []).filter((p) => p.matched && p.id).map((p) => p.id)
    if (!ids.includes(player.id)) ids.push(player.id)
    reanalyzeFromIds(ids)
  }

  const resetUpload = () => {
    setImageUrl(null)
    setResults(null)
    setError('')
    setNames('')
  }

  const FtPicker = () => (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-fg mb-2" id="ft-label">
        Free transfers
      </p>
      <div className="flex gap-2" role="group" aria-labelledby="ft-label">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setFreeTransfers(n)}
            className={`min-h-11 min-w-11 font-mono cursor-pointer border ${freeTransfers === n ? 'bg-primary text-on-primary border-primary' : 'border-border hover:bg-muted'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader kicker="Your 15" title="Squad analysis">
        Upload a pitch screenshot or paste web names. We match live data, then transfers, Best XI, and chips.
      </PageHeader>

      {!imageUrl && !results ? (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
            className={`border border-dashed p-10 text-center ${dragOver ? 'border-primary bg-muted' : 'border-border'}`}
          >
            <p className="font-display text-2xl font-semibold mb-2">Drop a screenshot</p>
            <p className="text-sm text-muted-fg mb-4">PNG or JPG of the official FPL pitch view</p>
            <button type="button" className={btnPrimary} onClick={() => fileInputRef.current?.click()}>
              Select screenshot
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
          </div>

          <div className="border border-border bg-card p-6 space-y-4">
            <Field id="squad-names" label="Or paste 15 squad names">
              <textarea
                id="squad-names"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder="Salah, Haaland, Palmer…"
                className={`${inputClass} min-h-[120px]`}
              />
            </Field>
            <div className="flex flex-wrap gap-4 items-end">
              <FtPicker />
              <Field id="bank" label="Bank (£m, optional)">
                <input id="bank" type="number" step="0.1" min="0" value={bank} onChange={(e) => setBank(e.target.value)} className={`${inputClass} w-28`} />
              </Field>
              <button type="button" onClick={analyzeTeam} disabled={analyzing || !names.trim()} className={btnPrimary}>
                {analyzing ? 'Analyzing…' : 'Analyze names'}
              </button>
            </div>
            {error ? <InlineError message={error} /> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="border border-border bg-card p-6 flex flex-col md:flex-row gap-6">
            {imageUrl && <img src={imageUrl} alt="Uploaded FPL squad screenshot" className="w-64 border border-border" />}
            <div className="flex-1 space-y-4">
              <FtPicker />
              <Field id="bank2" label="Bank (£m)">
                <input id="bank2" type="number" step="0.1" min="0" value={bank} onChange={(e) => setBank(e.target.value)} className={`${inputClass} w-40`} />
              </Field>
              <Field id="names2" label="Names override (optional)">
                <textarea id="names2" value={names} onChange={(e) => setNames(e.target.value)} className={`${inputClass} min-h-[80px]`} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={analyzeTeam} disabled={analyzing} className={btnPrimary}>
                  {analyzing ? 'Analyzing…' : 'Analyze squad'}
                </button>
                <button type="button" onClick={resetUpload} className={btnGhost}>
                  Reset
                </button>
              </div>
              {analyzing ? <p className="text-sm text-muted-fg">First EasyOCR run can take a minute while models download.</p> : null}
              {error ? <InlineError message={error} /> : null}
            </div>
          </div>

          {results && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Matched" value={`${results.matched_count}/${results.detected_count}`} />
                <Stat label="Squad value" value={`£${results.team_value}M`} />
                <Stat label="Bank" value={`£${results.bank}M`} highlight={results.bank > 0.5} />
                <Stat label="Free transfers" value={results.free_transfers} />
              </div>
              {results.note && <p className="text-sm border border-primary/40 bg-muted p-3">{results.note}</p>}

              {results.detected_players?.length > 0 && (
                <section className="border border-border bg-card p-6">
                  <h2 className="font-display text-2xl font-semibold mb-1">Detected squad</h2>
                  <p className="text-sm text-muted-fg mb-4">Wrong OCR match? Search and replace that slot.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {results.detected_players.map((p, i) => (
                      <div key={`${p.id}-${i}`} className={`p-3 border ${p.matched ? 'border-border' : 'border-danger'}`}>
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="font-mono text-[10px] uppercase text-muted-fg">
                              {p.matched ? `${p.position} · ${p.minutes_tag || ''}` : 'unmatched'}
                            </p>
                            <p className="font-semibold">{p.name}</p>
                            {p.matched ? (
                              <p className="font-mono text-[10px] text-muted-fg">
                                {p.team} · £{p.price}m · {p.xPts} xPts
                              </p>
                            ) : (
                              <p className="text-[10px] text-error">OCR: {p.raw_text}</p>
                            )}
                          </div>
                          {p.matched && (
                            <button type="button" onClick={() => removeSlot(p.id)} className="text-[11px] text-muted-fg hover:text-error cursor-pointer min-h-11">
                              Remove
                            </button>
                          )}
                        </div>
                        <PlayerSearch onPick={(hit) => replaceSlot(i, hit)} placeholder={p.matched ? 'Replace…' : 'Match this name…'} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-fg mb-1">Add a missing player</p>
                    <PlayerSearch onPick={addPlayer} placeholder="Type a web name" />
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.hit_advice && (
                  <section className="border border-border bg-card p-6">
                    <h2 className="font-display text-2xl font-semibold mb-2">Transfer verdict</h2>
                    <p className="font-mono text-[10px] uppercase text-muted-fg mb-3">
                      {results.free_transfers} FT · £{results.bank}M ITB
                    </p>
                    <p className="text-sm">{results.hit_advice.explanation}</p>
                  </section>
                )}
                {results.best_xi && (
                  <section className="border border-border bg-card p-6">
                    <div className="flex justify-between mb-4">
                      <h2 className="font-display text-2xl font-semibold">Best XI</h2>
                      <p className="font-mono text-sm">
                        {results.best_xi.formation} · {results.best_xi.total_xpts} xPts
                      </p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {results.best_xi.players.map((p, i) => (
                        <div key={i} className="border border-border p-2">
                          <p className="font-mono text-[10px] uppercase text-muted-fg">
                            {p.position}
                            {p.is_captain ? ' · C' : p.is_vice ? ' · V' : ''}
                          </p>
                          <p className="font-semibold text-sm truncate">{p.name.split(' ').pop()}</p>
                          <p className="font-mono text-[10px]">£{p.price} · {p.xPts}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {results.transfers?.length > 0 && (
                <section className="border border-border bg-card">
                  <h2 className="font-display text-2xl font-semibold p-6 border-b border-border">Suggested transfers</h2>
                  <ul className="divide-y divide-border">
                    {results.transfers.map((t, i) => (
                      <li key={i} className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div>
                            <p className="font-mono text-[10px] uppercase text-error">Out</p>
                            <p className="font-semibold">{t.out.name}</p>
                            <p className="font-mono text-[10px] text-muted-fg">{t.out.team} · £{t.out.price}M</p>
                          </div>
                          <ArrowRight size={16} className="text-muted-fg" aria-hidden />
                          <div className="text-right">
                            <p className="font-mono text-[10px] uppercase text-secondary">In</p>
                            <p className="font-semibold">{t.in.name}</p>
                            <p className="font-mono text-[10px] text-muted-fg">{t.in.team} · £{t.in.price}M</p>
                          </div>
                        </div>
                        <div className="flex gap-6 font-mono text-sm">
                          <span className={t.net_gain > 0 ? 'text-secondary' : 'text-error'}>
                            {t.net_gain > 0 ? '+' : ''}{t.net_gain} xPts
                          </span>
                          <span className="text-muted-fg">{t.price_change > 0 ? '+' : ''}{t.price_change}M</span>
                          <span>{t.is_free ? 'Free' : '−4 hit'}</span>
                          {!t.price_feasible && <span className="text-primary">No funds</span>}
                        </div>
                        {t.reason && <p className="text-xs text-muted-fg md:w-full">{t.reason}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {results.transfers && results.transfers.length === 0 && results.best_xi && (
                <EmptyState>No transfer suggestions for this squad.</EmptyState>
              )}

              {results.chip_suggestions?.length > 0 && (
                <section className="border border-border bg-card p-6">
                  <h2 className="font-display text-2xl font-semibold mb-4">Chip suggestions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.chip_suggestions.map((chip, i) => (
                      <div key={i} className="border border-border p-4">
                        <div className="flex justify-between">
                          <h3 className="font-display text-xl">{chip.chip}</h3>
                          <span className="font-mono text-sm">Score {chip.score}</span>
                        </div>
                        <p className="text-sm mt-2">{chip.reason}</p>
                        <p className="text-xs text-muted-fg mt-2">{chip.for_your_team}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
