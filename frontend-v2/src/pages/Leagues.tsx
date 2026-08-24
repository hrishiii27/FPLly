import { useState } from 'react'
import { api } from '../lib/api'
import {
  EmptyState,
  Field,
  InlineError,
  PageHeader,
  Spinner,
  btnPrimary,
  inputClass,
  TableWrap,
  tdClass,
  thClass,
  rowClass,
} from '../components/ui/primitives'

export default function Leagues() {
  const [leagueId, setLeagueId] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async (e) => {
    e.preventDefault()
    if (!leagueId) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      setData(await api.league(leagueId))
    } catch (err: any) {
      setError(err.message || 'Failed to analyze league')
    }
    setLoading(false)
  }

  return (
    <div>
      <PageHeader kicker="Effective ownership" title="Mini-league">
        Top managers, template holdings, and low-owned rivals.
      </PageHeader>

      <form onSubmit={analyze} className="border border-border bg-card p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <Field id="league-id" label="Classic league ID">
          <input
            id="league-id"
            type="number"
            className={inputClass}
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="314"
          />
        </Field>
        <button type="submit" disabled={loading || !leagueId} className={btnPrimary}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>
      {error ? <InlineError message={error} /> : null}
      {loading ? <Spinner label="Fetching standings" /> : null}

      {data && (
        <div className="space-y-8">
          <h2 className="font-display text-3xl font-semibold">{data.name}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Rank', 'Manager', 'GW', 'Total', 'Chip'].map((h) => (
                      <th key={h} className={thClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.managers?.map((m) => (
                    <tr key={m.id} className={rowClass}>
                      <td className={`${tdClass} font-mono`}>#{m.rank}</td>
                      <td className={tdClass}>
                        <span className="font-semibold block">{m.team}</span>
                        <span className="text-xs text-muted-fg">{m.name}</span>
                      </td>
                      <td className={`${tdClass} font-mono`}>{m.gw_points}</td>
                      <td className={`${tdClass} font-mono`}>{m.points}</td>
                      <td className={`${tdClass} text-xs uppercase`}>{m.chip?.replace('_', ' ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>

            <div className="space-y-6">
              <section className="border border-border bg-card p-5">
                <h3 className="font-display text-xl font-semibold mb-4">Consensus (top 5)</h3>
                <ul className="space-y-3">
                  {data.template?.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="font-mono text-[10px] uppercase text-muted-fg">{p.team} · {p.pos}</p>
                      </div>
                      <p className="font-mono text-sm">
                        {p.ownership}% own · {(p.ownership + p.captaincy).toFixed(1)}% EO
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="border border-border bg-card p-5">
                <h3 className="font-display text-xl font-semibold mb-2">Rivals under 30%</h3>
                {data.differential_opportunities?.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {data.differential_opportunities.map((p) => (
                      <li key={p.id} className="border border-border px-3 py-2 text-xs">
                        {p.name} <span className="font-mono text-muted-fg">{p.ownership}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState>No low-ownership differentials detected.</EmptyState>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
