import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { TabId } from '../lib/nav'
import { PageHeader, Spinner, Stat, btnPrimary } from '../components/ui/primitives'

export default function Dashboard({ status, setActiveTab }: { status: any; setActiveTab: (id: TabId) => void }) {
  const [dash, setDash] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.dashboard().then(setDash).catch(() => setErr('Could not load dashboard stats.'))
  }, [])

  if (!dash && !err) return <Spinner label="Loading matchweek snapshot" />

  return (
    <div>
      <PageHeader kicker={`Gameweek ${status?.next_gw ?? '—'}`} title="Matchweek desk">
        Rules engine blended with a lagged ensemble. Blank GWs stay at 0; doubles scale on the ML side.
      </PageHeader>
      {err ? <p className="text-error text-sm mb-6">{err}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Hot form" value={dash?.top_form?.name || '—'} hint={dash?.top_form ? `${dash.top_form.team} · form ${dash.top_form.form}` : '—'} />
        <Stat
          label="Next-GW MAE"
          value={dash?.mae ?? status?.ml_mae ?? '—'}
          hint={dash?.forecast_skill != null ? `${dash.forecast_skill}% better than guessing the mean` : 'Open ML holdout once to train'}
        />
        <Stat
          label="Top xPts"
          value={dash?.top_predictions?.[0]?.name || '—'}
          hint={dash?.top_predictions?.[0]?.xpts != null ? `${dash.top_predictions[0].xpts} xPts` : '—'}
        />
      </div>
      <button type="button" className={btnPrimary} onClick={() => setActiveTab('predictions')}>
        Open predictions
      </button>
    </div>
  )
}
