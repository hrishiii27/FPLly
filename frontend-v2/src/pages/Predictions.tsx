import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { api } from '../lib/api'
import { EmptyState, Field, PageHeader, PosBadge, Spinner, TableWrap, inputClass, tdClass, thClass, rowClass } from '../components/ui/primitives'

function FormMark({ form }: { form: string }) {
  if (form === 'rising') return <span className="inline-flex items-center gap-1 text-secondary text-xs"><ArrowUpRight size={14} aria-hidden /> rising</span>
  if (form === 'falling') return <span className="inline-flex items-center gap-1 text-error text-xs"><ArrowDownRight size={14} aria-hidden /> falling</span>
  return <span className="inline-flex items-center gap-1 text-muted-fg text-xs"><ArrowRight size={14} aria-hidden /> {form || 'flat'}</span>
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [maxPrice, setMaxPrice] = useState('20')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ limit: '100', max_price: maxPrice })
        if (position) params.append('position', position)
        const data = await api.predictions(params)
        setPredictions(data.predictions || [])
      } catch {
        setError('Failed to load predictions.')
        setPredictions([])
      }
      setLoading(false)
    }
    load()
  }, [position, maxPrice])

  const rows = predictions.filter(
    (p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.team?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <PageHeader kicker="Expected points" title="Player projections">
        Filter next-GW xPts. Search is local; position and price hit the API.
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Field id="pred-search" label="Search">
          <input id="pred-search" className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or club" />
        </Field>
        <Field id="pred-pos" label="Position">
          <select id="pred-pos" className={`${inputClass} cursor-pointer`} value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">All</option>
            <option value="GKP">Goalkeepers</option>
            <option value="DEF">Defenders</option>
            <option value="MID">Midfielders</option>
            <option value="FWD">Forwards</option>
          </select>
        </Field>
        <Field id="pred-price" label="Max price">
          <select id="pred-price" className={`${inputClass} cursor-pointer`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="20">No limit</option>
            <option value="6">Under £6.0m</option>
            <option value="8">Under £8.0m</option>
            <option value="10">Under £10.0m</option>
          </select>
        </Field>
      </div>

      {loading ? (
        <Spinner label="Loading projections" />
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : !rows.length ? (
        <EmptyState>No players match these filters.</EmptyState>
      ) : (
        <TableWrap>
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className={thClass}>Player</th>
                <th className={thClass}>Team</th>
                <th className={thClass}>Pos</th>
                <th className={thClass}>Price</th>
                <th className={thClass}>Own %</th>
                <th className={thClass}>Minutes</th>
                <th className={thClass}>xPts</th>
                <th className={thClass}>Fixture</th>
                <th className={thClass}>Range</th>
                <th className={thClass}>xPts/£</th>
                <th className={thClass}>Momentum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={rowClass}>
                  <td className={`${tdClass} font-semibold`}>{p.name}</td>
                  <td className={`${tdClass} uppercase text-muted-fg`}>{p.team}</td>
                  <td className={tdClass}><PosBadge pos={p.position} /></td>
                  <td className={`${tdClass} font-mono`}>£{p.price?.toFixed?.(1) ?? p.price}m</td>
                  <td className={`${tdClass} font-mono`}>{p.ownership != null ? `${p.ownership.toFixed(1)}%` : '—'}</td>
                  <td className={`${tdClass} text-muted-fg`}>{p.minutes || '—'}</td>
                  <td className={`${tdClass} font-mono font-semibold`}>{p.xPts?.toFixed?.(2)}</td>
                  <td className={`${tdClass} text-muted-fg max-w-[140px] truncate`} title={p.fixture}>{p.fixture || '—'}</td>
                  <td className={`${tdClass} font-mono text-muted-fg`}>
                    {p.xPts_low != null ? `${p.xPts_low.toFixed(1)}–${p.xPts_high.toFixed(1)}` : '—'}
                  </td>
                  <td className={`${tdClass} font-mono`}>{p.value?.toFixed?.(3)}</td>
                  <td className={tdClass}><FormMark form={p.form} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  )
}
