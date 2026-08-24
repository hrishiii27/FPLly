import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { EmptyState, PageHeader, PosBadge, Spinner, Stat, TableWrap, tdClass, thClass, rowClass } from '../components/ui/primitives'

export default function Ownership() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.ownership().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading ownership" />
  if (!data) return <EmptyState>Could not load ownership.</EmptyState>

  return (
    <div>
      <PageHeader kicker="Template vs traps" title="Ownership">
        Official selected-by. Essentials, avoid list, and the &gt;25% template.
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Analyzed" value={data.summary?.total_analyzed || 0} />
        <Stat label="Template (&gt;25%)" value={data.summary?.template_count || 0} />
        <Stat label="Essentials" value={data.summary?.essential_count || 0} highlight />
        <Stat label="Differentials" value={data.summary?.differential_count || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-2xl font-semibold mb-4">Essentials</h2>
          <ul className="space-y-3">
            {data.essential_players?.slice(0, 8).map((p, i) => (
              <li key={i} className="flex justify-between items-center border-b border-border pb-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="font-mono text-[10px] uppercase text-muted-fg">{p.team} {p.position ? `· ${p.position}` : ''}</p>
                </div>
                <p className="font-mono text-sm">{p.ownership?.toFixed(1)}% · {p.xpts?.toFixed(1)} xPts</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-2xl font-semibold mb-4">Avoid list</h2>
          {data.avoid_list?.length ? (
            <ul className="space-y-3">
              {data.avoid_list.slice(0, 8).map((p, i) => (
                <li key={i} className="flex justify-between items-center border-b border-border pb-2">
                  <p className="font-semibold">{p.name}</p>
                  <p className="font-mono text-sm">{p.ownership?.toFixed(1)}% · {p.xpts?.toFixed(1)} xPts</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-fg">No traps identified this week.</p>
          )}
        </section>
      </div>

      <h2 className="font-display text-2xl font-semibold mb-3">The template</h2>
      <TableWrap>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Player', 'Team', 'Pos', 'Own %', 'xPts', 'EO risk'].map((h) => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.template_players?.map((p, i) => (
              <tr key={i} className={rowClass}>
                <td className={`${tdClass} font-semibold`}>
                  {p.is_essential ? <span className="text-primary mr-1" title="Essential">*</span> : null}
                  {p.name}
                </td>
                <td className={`${tdClass} uppercase text-muted-fg`}>{p.team}</td>
                <td className={tdClass}><PosBadge pos={p.position} /></td>
                <td className={`${tdClass} font-mono`}>{p.ownership?.toFixed(1)}%</td>
                <td className={`${tdClass} font-mono`}>{p.xpts?.toFixed(1)}</td>
                <td className={tdClass}>{p.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
