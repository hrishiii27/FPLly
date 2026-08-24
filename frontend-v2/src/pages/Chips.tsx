import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { EmptyState, PageHeader, Spinner, TableWrap, tdClass, thClass, rowClass } from '../components/ui/primitives'

const NAMES = { wildcard: 'Wildcard', bench_boost: 'Bench Boost', triple_captain: 'Triple Captain', free_hit: 'Free Hit' }

export default function Chips() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.chips().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Scoring chip windows" />
  if (!data?.recommendations) return <EmptyState>No chip advice yet.</EmptyState>

  const typeLabel = (t) => (t === 'normal' ? 'Standard' : t)

  return (
    <div>
      <PageHeader kicker="Timing" title="Chip advisor">
        Windows scored against upcoming fixtures, including blanks and doubles.
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {data.recommendations.map((rec) => (
          <article key={rec.chip} className={`border bg-card p-6 ${rec.is_ideal ? 'border-primary' : 'border-border'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="font-display text-2xl font-semibold">{NAMES[rec.chip] || rec.chip}</h2>
                <p className="font-mono text-[11px] uppercase text-muted-fg">Suggested GW{rec.recommended_gw}</p>
              </div>
              <p className="font-mono text-2xl">{rec.score}</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-3">{rec.verdict}</p>
            <p className="text-sm mb-4">{rec.reason}</p>
            {rec.data_points?.length > 0 && (
              <ul className="space-y-1 font-mono text-xs text-muted-fg list-disc ml-4">
                {rec.data_points.map((dp, j) => (
                  <li key={j}>{dp}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      <h2 className="font-display text-2xl font-semibold mb-3">Next 10 gameweeks</h2>
      <TableWrap>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['GW', 'Type', 'Fixtures', 'FDR avg', 'BB', 'TC', 'FH', 'WC'].map((h) => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.gameweek_analysis &&
              Object.entries(data.gameweek_analysis)
                .slice(0, 10)
                .map(([gw, a]: any) => (
                  <tr key={gw} className={rowClass}>
                    <td className={`${tdClass} font-semibold`}>GW{gw}</td>
                    <td className={tdClass}>
                      <span className={a.type === 'BGW' ? 'text-error' : a.type === 'DGW' ? 'text-secondary' : 'text-muted-fg'}>
                        {typeLabel(a.type)}
                      </span>
                    </td>
                    <td className={`${tdClass} font-mono`}>{a.total_fixtures}</td>
                    <td className={`${tdClass} font-mono`}>{a.avg_fdr}</td>
                    <td className={`${tdClass} font-mono`}>{a.chip_scores?.bench_boost ?? '—'}</td>
                    <td className={`${tdClass} font-mono`}>{a.chip_scores?.triple_captain ?? '—'}</td>
                    <td className={`${tdClass} font-mono`}>{a.chip_scores?.free_hit ?? '—'}</td>
                    <td className={`${tdClass} font-mono`}>{a.chip_scores?.wildcard ?? '—'}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-fg">
        Score: 70+ ideal · 40–69 viable · under 40 weak
      </p>
    </div>
  )
}
