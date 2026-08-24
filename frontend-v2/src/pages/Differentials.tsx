import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { api } from '../lib/api'
import { EmptyState, PageHeader, PosBadge, Spinner } from '../components/ui/primitives'

export default function Differentials() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.differentials().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Finding low-owned options" />
  if (!data) return <EmptyState>Could not load differentials.</EmptyState>

  return (
    <div>
      <PageHeader kicker="Low ownership" title="Differentials">
        Injured and minutes-managed players are filtered. Score blends xPts with scarcity.
      </PageHeader>

      <h2 className="font-display text-2xl font-semibold mb-3">Elite picks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {data.top_differentials?.slice(0, 6).map((d, i) => (
          <article key={i} className="border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-display text-xl font-semibold">{d.name}</h3>
                <p className="font-mono text-[11px] text-muted-fg">{d.team} · £{d.price?.toFixed(1)}m</p>
              </div>
              <PosBadge pos={d.position} />
            </div>
            <div className="flex gap-6 my-3 border-y border-border py-3 font-mono text-sm">
              <span>xPts {d.xpts?.toFixed(1)}</span>
              <span>Score {d.differential_score?.toFixed(0)}</span>
            </div>
            <p className="text-sm text-muted-fg italic mb-3">{d.reason}</p>
            <p className="font-mono text-[11px] text-muted-fg">Next: {d.fixture} · {d.ownership?.toFixed(1)}% TSB</p>
            {d.is_rising && (
              <p className="mt-2 inline-flex items-center gap-1 text-secondary text-xs">
                <ArrowUpRight size={14} aria-hidden /> Price rising
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold mb-3">By position</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['GKP', 'DEF', 'MID', 'FWD'].map((pos) => (
              <div key={pos} className="border border-border bg-card p-4">
                <h3 className="font-display text-lg mb-2">{pos}</h3>
                <ul className="space-y-2">
                  {data.by_position?.[pos]?.map((p, i) => (
                    <li key={i} className="flex justify-between text-xs">
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="font-mono">{p.xpts?.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold mb-3">Under £6.5m</h2>
          <ul className="border border-border bg-card divide-y divide-border">
            {data.budget_gems?.slice(0, 10).map((g, i) => (
              <li key={i} className="flex justify-between p-3 text-sm">
                <span>
                  {g.name}
                  <span className="block font-mono text-[10px] text-muted-fg">£{g.price?.toFixed(1)}m</span>
                </span>
                <span className="font-mono">{g.xpts?.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
