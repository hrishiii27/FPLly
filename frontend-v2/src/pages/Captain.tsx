import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { EmptyState, PageHeader, Spinner, Stat } from '../components/ui/primitives'

export default function Captain() {
  const [captains, setCaptains] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .captain()
      .then((d) => setCaptains(d.recommendations || []))
      .catch(() => setCaptains([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Ranking captains" />
  if (!captains.length) return <EmptyState>No captain data yet — restart the API after the latest prediction fixes.</EmptyState>

  const primary = captains[0]
  const secondary = captains[1] || captains[0]
  const differential = captains.find((c) => (c.ownership || 100) < 15 && c.id !== primary.id) || captains[2] || secondary
  const conf = (c) => Math.round(c?.confidence || 0)

  return (
    <div>
      <PageHeader kicker="Armband" title="Captain shortlist">
        Ranked by next-GW xPts and ceiling. Ownership is official FPL selected-by.
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <article className="lg:col-span-2 border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Primary · #{primary.rank}</p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">{primary.name}</h2>
          <p className="text-sm text-muted-fg mt-1">{primary.team} · {primary.fixture}</p>
          <div className="mt-6 flex flex-wrap gap-6">
            <Stat label="xPts" value={primary.xPts?.toFixed(1)} />
            <Stat label="Ceiling" value={primary.xPts_high?.toFixed(1) ?? '—'} />
            <Stat label="Owned" value={`${primary.ownership?.toFixed(1) || '—'}%`} />
            <Stat label="Confidence" value={`${conf(primary)}%`} />
          </div>
          <blockquote className="mt-6 border-l-2 border-primary pl-4 text-sm italic text-muted-fg">
            {primary.explanation?.factors?.[0] || 'Highest projected return this week.'}
          </blockquote>
        </article>
        <div className="flex flex-col gap-4">
          <article className="border border-border bg-card p-5 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-fg">Safer pick · #{secondary.rank}</p>
            <h3 className="font-display text-2xl font-semibold mt-1">{secondary.name}</h3>
            <p className="font-mono mt-2">{secondary.xPts?.toFixed(1)} xPts · {conf(secondary)}% conf · {secondary.ownership?.toFixed(1) || '—'}% TSB</p>
            <p className="text-xs text-muted-fg mt-3">{secondary.explanation?.factors?.[0] || ''}</p>
          </article>
          <article className="border border-primary bg-card p-5 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Differential</p>
            <h3 className="font-display text-2xl font-semibold mt-1">{differential.name}</h3>
            <p className="font-mono mt-2">{differential.xPts?.toFixed(1)} xPts · {differential.ownership?.toFixed(1) || '—'}% TSB</p>
            <p className="text-xs text-muted-fg mt-3">{differential.explanation?.factors?.[0] || ''}</p>
          </article>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border bg-card p-5">
          <h3 className="font-display text-xl font-semibold mb-4">Also in the mix</h3>
          <ul className="space-y-3">
            {captains.slice(3, 6).map((c) => (
              <li key={c.id || c.rank} className="flex justify-between text-sm">
                <span>#{c.rank} {c.name}</span>
                <span className="font-mono">{c.xPts?.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border bg-card p-5">
          <h3 className="font-display text-xl font-semibold mb-4">Selected-by</h3>
          {[primary, secondary, differential].map((c) => (
            <div key={c.id || c.name} className="mb-3">
              <div className="flex justify-between font-mono text-[11px] uppercase mb-1">
                <span>{c.name}</span>
                <span>{c.ownership > 0 ? `${c.ownership.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="h-1.5 bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.min(c.ownership || 0, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="border border-border bg-card p-5">
          <h3 className="font-display text-xl font-semibold mb-4">Model odds</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>{primary.team} CS</span><span className="font-mono">{primary.xCS?.toFixed(0) || '—'}%</span></li>
            <li className="flex justify-between"><span>{primary.name} goal</span><span className="font-mono">{primary.xG?.toFixed(0) || '—'}%</span></li>
            <li className="flex justify-between"><span>{differential.name} goal</span><span className="font-mono">{differential.xG?.toFixed(0) || '—'}%</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
