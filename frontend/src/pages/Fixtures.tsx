import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { EmptyState, FdrBadge, PageHeader, Spinner } from '../components/ui/primitives'

function fdrTone(fdr: number) {
  if (fdr <= 2) return 'bg-turf text-on-turf'
  if (fdr === 3) return 'bg-muted text-foreground'
  if (fdr === 4) return 'bg-primary text-on-primary'
  return 'bg-danger text-on-danger'
}

export default function Fixtures() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fixtures().then((d) => setTeams(d.teams || [])).catch(() => setTeams([])).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading fixture ticker" />
  if (!teams.length) return <EmptyState>No fixture data.</EmptyState>

  return (
    <div>
      <PageHeader kicker="Next five" title="Fixture ticker">
        Clubs sorted by composite swing. Average FDR is the mean of the next five; lower is easier.
      </PageHeader>

      <div className="border border-border bg-card">
        <div className="hidden md:flex items-center px-4 py-3 border-b border-border bg-surface">
          <div className="w-28 font-mono text-[10px] uppercase tracking-widest text-muted-fg">Club</div>
          <div className="w-20 font-mono text-[10px] uppercase tracking-widest text-muted-fg">Avg FDR</div>
          <div className="flex-1 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-fg">GW +{n}</div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {teams.map((team) => (
            <div key={team.team_id} className="flex flex-col md:flex-row md:items-center p-4 gap-3">
              <div className="w-28 font-display text-xl font-semibold uppercase tracking-tight">{team.team}</div>
              <div className="w-20">
                <span className="font-mono text-sm">{team.avg_fdr?.toFixed(1)}</span>
              </div>
              <div className="flex-1 grid grid-cols-5 gap-2">
                {team.fixture_run?.slice(0, 5).map((f, i) => (
                  <div key={i} className={`flex flex-col items-center justify-center p-2 min-h-11 ${fdrTone(f.fdr)}`}>
                    <span className="font-display font-semibold leading-none">{f.opponent}</span>
                    <span className="font-mono text-[10px] mt-1">
                      {f.home ? 'H' : 'A'} · FDR {f.fdr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest text-muted-fg">
        <li className="flex items-center gap-2"><FdrBadge fdr={2} compact /> Easy (1–2)</li>
        <li className="flex items-center gap-2"><FdrBadge fdr={3} compact /> Neutral</li>
        <li className="flex items-center gap-2"><FdrBadge fdr={4} compact /> Hard</li>
        <li className="flex items-center gap-2"><FdrBadge fdr={5} compact /> Severe</li>
      </ul>
    </div>
  )
}
