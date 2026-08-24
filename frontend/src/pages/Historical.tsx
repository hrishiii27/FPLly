import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import {
  EmptyState,
  Field,
  InlineError,
  PageHeader,
  Spinner,
  Stat,
  TableWrap,
  btnPrimary,
  inputClass,
  tdClass,
  thClass,
  rowClass,
} from '../components/ui/primitives'

export default function Historical() {
  const [overperformers, setOverperformers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlayer, setSearchPlayer] = useState('')
  const [playerStats, setPlayerStats] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .overperformers()
      .then((d) => setOverperformers(d.top_overperformers || []))
      .catch(() => setOverperformers([]))
      .finally(() => setLoading(false))
  }, [])

  const lookup = async (name?: string) => {
    const q = (name ?? searchPlayer).trim()
    if (!q) return
    setSearching(true)
    setError('')
    setPlayerStats(null)
    setSearchPlayer(q)
    try {
      const data = await api.historical(q)
      if (data.error) setError(data.error)
      else setPlayerStats(data)
    } catch (e: any) {
      setError(e.message || 'Search failed')
    }
    setSearching(false)
  }

  return (
    <div>
      <PageHeader kicker="2021–22 to 2025–26" title="Historical context">
        Finishers who beat xG over multiple seasons, plus a per-player lookup.
      </PageHeader>

      <div className="border border-border bg-card p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            lookup()
          }}
        >
          <Field id="hist-search" label="Player lookup">
            <input
              id="hist-search"
              className={inputClass}
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              placeholder="e.g. Salah"
            />
          </Field>
          <button type="submit" disabled={searching || !searchPlayer.trim()} className={btnPrimary}>
            {searching ? 'Looking up…' : 'Retrieve records'}
          </button>
          {error ? <InlineError message={error} /> : null}
        </form>
        <div className="md:col-span-2">
          {playerStats ? (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Career points" value={playerStats.total_points} hint={`${playerStats.seasons_played} seasons`} />
              <Stat
                label="Goals (xG)"
                value={`${playerStats.total_goals} (${playerStats.total_xg})`}
                hint={playerStats.interpretation?.xg_description}
                highlight={playerStats.xg_overperformance > 5}
              />
              <Stat
                label="xG overperf."
                value={`${playerStats.xg_overperformance > 0 ? '+' : ''}${playerStats.xg_overperformance}`}
                highlight={playerStats.xg_overperformance > 10}
              />
              <Stat label="Avg pts/GW" value={playerStats.avg_points_per_gw?.toFixed(1)} hint={playerStats.interpretation?.consistency_description} />
            </div>
          ) : (
            <p className="text-sm text-muted-fg h-full flex items-center">Search a web name to load career totals.</p>
          )}
        </div>
      </div>

      <h2 className="font-display text-2xl font-semibold mb-3">Elite finishers</h2>
      {loading ? (
        <Spinner label="Aggregating history" />
      ) : !overperformers.length ? (
        <EmptyState>No overperformer table yet.</EmptyState>
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Player', 'Goals', 'xG', 'Overperf.', '% above'].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overperformers.map((p, i) => {
                const pctAbove = p.total_xg > 0 ? ((p.total_goals - p.total_xg) / p.total_xg) * 100 : 0
                return (
                  <tr key={i} className={`${rowClass} cursor-pointer`} onClick={() => lookup(p.name)}>
                    <td className={`${tdClass} font-semibold`}>{p.name}</td>
                    <td className={`${tdClass} font-mono`}>{p.total_goals}</td>
                    <td className={`${tdClass} font-mono`}>{p.total_xg?.toFixed(1)}</td>
                    <td className={`${tdClass} font-mono ${p.xg_overperformance > 0 ? 'text-secondary' : 'text-error'}`}>
                      {p.xg_overperformance > 0 ? '+' : ''}
                      {p.xg_overperformance?.toFixed(1)}
                    </td>
                    <td className={`${tdClass} font-mono`}>{pctAbove > 0 ? '+' : ''}{pctAbove.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  )
}
