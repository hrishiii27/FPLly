import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { EmptyState, FdrBadge, PageHeader, PosBadge, Spinner, Stat, TableWrap, tdClass, thClass, rowClass } from '../components/ui/primitives'

function parseFixture(fixStr) {
  if (!fixStr || fixStr === 'No fixture') return { opp: '—', loc: '—', fdr: 3 }
  const match = String(fixStr).match(/([A-Za-z]{2,4})\(([HA])\).*FDR:?\s*(\d)/)
  if (match) return { opp: match[1], loc: match[2], fdr: parseInt(match[3], 10) }
  return { opp: String(fixStr).slice(0, 8), loc: '', fdr: 3 }
}

function PitchPlayer({ player, compact }: { player: any; compact?: boolean }) {
  const { opp, loc, fdr } = parseFixture(player.fixture)
  return (
    <div className={`border border-border bg-background text-center p-2 ${compact ? 'w-[4.5rem]' : 'w-24'}`}>
      <p className="font-mono text-[10px] uppercase text-muted-fg">
        {player.captain ? 'C · ' : player.vice_captain ? 'VC · ' : ''}
        {player.position}
      </p>
      <p className="font-display font-semibold truncate leading-tight">{player.name?.split(' ').pop()}</p>
      <p className="font-mono text-[10px] mt-1">
        {opp} {loc} <FdrBadge fdr={fdr} compact />
      </p>
      <p className="font-mono text-[10px] text-muted-fg">£{player.price} · {player.xPts}</p>
    </div>
  )
}

export default function OptimalXi() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'pitch'>('table')

  useEffect(() => {
    api.optimalTeam().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Building a legal XI" />
  if (!data?.starting_xi?.length) return <EmptyState>Couldn’t build an XI. Restart the API and try again.</EmptyState>

  const byPos = (pos) => data.starting_xi.filter((p) => p.position === pos)
  const all = [...(data.starting_xi || []), ...(data.bench || [])]

  return (
    <div>
      <PageHeader kicker={`GW${data.gw ?? ''}`} title="Optimal XI">
        Full 15 with a £100m budget reservation so premiums are not dropped for cheap defenders.
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Squad cost" value={`£${data.total_price}`} />
        <Stat label="Projected XI" value={data.expected_points} highlight />
        <Stat label="Formation" value={data.formation} />
      </div>

      <div className="flex gap-2 mb-4" role="tablist" aria-label="XI view">
        {(['table', 'pitch'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-11 px-4 font-display text-lg cursor-pointer border ${view === v ? 'bg-primary text-on-primary border-primary' : 'border-border hover:bg-muted'}`}
          >
            {v === 'table' ? 'Table' : 'Pitch'}
          </button>
        ))}
      </div>

      {view === 'table' ? (
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thClass}>Role</th>
                <th className={thClass}>Player</th>
                <th className={thClass}>Pos</th>
                <th className={thClass}>Team</th>
                <th className={thClass}>Price</th>
                <th className={thClass}>xPts</th>
                <th className={thClass}>Fixture</th>
                <th className={thClass}>FDR</th>
              </tr>
            </thead>
            <tbody>
              {all.map((p) => {
                const fx = parseFixture(p.fixture)
                const onBench = data.bench?.some((b) => b.id === p.id)
                return (
                  <tr key={p.id} className={rowClass}>
                    <td className={`${tdClass} font-mono text-[10px] uppercase text-muted-fg`}>
                      {p.captain ? 'Captain' : p.vice_captain ? 'Vice' : onBench ? 'Bench' : 'XI'}
                    </td>
                    <td className={`${tdClass} font-semibold`}>{p.name}</td>
                    <td className={tdClass}><PosBadge pos={p.position} /></td>
                    <td className={`${tdClass} uppercase text-muted-fg`}>{p.team}</td>
                    <td className={`${tdClass} font-mono`}>£{p.price}</td>
                    <td className={`${tdClass} font-mono`}>{p.xPts}</td>
                    <td className={`${tdClass} text-muted-fg`}>{fx.opp} ({fx.loc})</td>
                    <td className={tdClass}><FdrBadge fdr={fx.fdr} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <div className="border border-border bg-[#0e1c14] p-6 overflow-x-auto">
          <div className="min-w-[640px] space-y-6">
            <div className="flex justify-center gap-3">{byPos('GKP').map((p) => <PitchPlayer key={p.id} player={p} />)}</div>
            <div className="flex justify-center gap-3">{byPos('DEF').map((p) => <PitchPlayer key={p.id} player={p} />)}</div>
            <div className="flex justify-center gap-3">{byPos('MID').map((p) => <PitchPlayer key={p.id} player={p} />)}</div>
            <div className="flex justify-center gap-3">{byPos('FWD').map((p) => <PitchPlayer key={p.id} player={p} />)}</div>
            <div className="border-t border-white/20 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/60 mb-3">Bench</p>
              <div className="flex gap-3">{data.bench?.map((p) => <PitchPlayer key={p.id} player={p} compact />)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
