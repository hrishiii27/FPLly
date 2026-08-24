import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { EmptyState, PageHeader, Spinner, Stat, TableWrap, tdClass, thClass, rowClass } from '../components/ui/primitives'

function formatFeatureName(name) {
  const mapping = {
    minutes: 'Minutes Played',
    bps: 'Bonus Points System',
    bonus: 'Bonus Points',
    goals_scored: 'Goals Scored',
    assists: 'Assists',
    ict_index: 'ICT Index',
    threat: 'Threat',
    creativity: 'Creativity',
    influence: 'Influence',
    expected_goals: 'xG',
    expected_assists: 'xA',
    expected_goal_involvements: 'xGI',
    clean_sheets: 'Clean Sheets',
    value: 'Price',
    form_score: 'Form Score',
    minutes_ratio: 'Minutes %',
    goal_involvement_rate: 'Goal Inv. Rate',
    xg_overperformance: 'xG Overperf.',
    consistency_score: 'Consistency',
    minutes_roll5: 'Minutes (last 5)',
    points_roll5: 'Points (last 5)',
    points_lag1: 'Last GW Points',
    xg_roll5: 'xG (last 5)',
    xa_roll5: 'xA (last 5)',
    xgi_roll5: 'xGI (last 5)',
    ict_roll5: 'ICT (last 5)',
    bonus_roll5: 'Bonus (last 5)',
    cs_roll5: 'CS (last 5)',
    minutes_ratio_roll5: 'Minutes %',
    gi_rate_roll5: 'Goal Inv. Rate',
    xg_overperf_roll5: 'xG Overperf.',
    was_home: 'Home Fixture',
    pos_code: 'Position',
    fdr: 'Fixture Difficulty',
  }
  return mapping[name] || String(name).replace(/_/g, ' ')
}

export default function MlHoldout() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.mlPredictions().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Spinner label="Training next-GW ensemble… first run downloads season CSVs" />
    )
  }
  if (!data?.model_info) {
    return <EmptyState>Couldn’t load the ensemble. Check the API, then refresh this tab.</EmptyState>
  }

  const stats = data.model_info.training_stats || {}
  const modelScores = stats.model_scores || {}
  const featureImportance = stats.feature_importance || {}
  const topFeatures = Object.entries(featureImportance)
    .map(([name, value]) => [name, Number(value)] as const)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxImportance = Math.max(...topFeatures.map(([, value]) => value), Number.EPSILON)

  return (
    <div>
      <PageHeader kicker="Lagged ensemble" title="ML holdout">
        Next-GW forecasts from lagged form and FDR. Metrics are a held-out season — not the same match the model already saw.
        {stats.seasons ? (
          <span className="block mt-2 font-mono text-xs">
            Trained on {Array.isArray(stats.seasons) ? stats.seasons.join(' · ') : 'recent seasons'}
          </span>
        ) : null}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Ensemble MAE"
          value={stats.mae ?? '—'}
          hint={stats.skill_vs_mean != null ? `${(stats.skill_vs_mean * 100).toFixed(0)}% vs mean baseline` : 'pts'}
          highlight
        />
        <Stat label="Holdout R²" value={stats.r2_score ?? '—'} hint={`vs mean MAE ${stats.baseline_mae ?? '—'}`} />
        <Stat label="Random Forest MAE" value={modelScores.random_forest?.mae ?? '—'} hint={`R² ${modelScores.random_forest?.r2 ?? '—'}`} />
        <Stat label="XGBoost MAE" value={modelScores.xgboost?.mae ?? '—'} hint={`GB ${modelScores.gradient_boosting?.mae ?? '—'}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {topFeatures.length > 0 && (
          <section className="glass-panel rounded-xl p-6 min-w-0 overflow-hidden">
            <h2 className="font-display text-2xl font-semibold mb-4">Feature importance</h2>
            <ul className="space-y-3 min-w-0">
              {topFeatures.map(([feature, importance]) => {
                const widthPct = Math.min(100, Math.max(0, (importance / maxImportance) * 100))
                return (
                  <li key={feature} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2.75rem] items-center gap-3 text-xs min-w-0">
                    <span className="truncate min-w-0">{formatFeatureName(feature)}</span>
                    <div className="min-w-0 overflow-hidden h-1.5 rounded-full bg-muted">
                      <div className="h-full max-w-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
                    </div>
                    <span className="font-mono text-right tabular-nums">{(importance * 100).toFixed(1)}%</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {data.ml_favorites?.length > 0 && (
          <section className="glass-panel rounded-xl p-6 min-w-0">
            <h2 className="font-display text-2xl font-semibold mb-4">ML vs rules</h2>
            <ul className="space-y-3">
              {data.ml_favorites.slice(0, 5).map((p, i) => (
                <li key={i} className="flex justify-between items-center border-b border-border pb-2">
                  <span className="font-semibold">{p.name}</span>
                  <span className="font-mono text-sm">
                    ML {p.ml_xpts?.toFixed(1)} / rules {p.rule_xpts?.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <h2 className="font-display text-2xl font-semibold mb-3">Top forecasts</h2>
      <TableWrap>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Player', 'Team', 'FDR', 'ML xPts', 'Base xPts', 'Δ', 'RF', 'XGB'].map((h) => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.top_predictions?.slice(0, 10).map((p, i) => (
              <tr key={i} className={rowClass}>
                <td className={`${tdClass} font-semibold`}>{p.name}</td>
                <td className={`${tdClass} text-muted-fg`}>{p.team || '—'}</td>
                <td className={`${tdClass} font-mono`}>{p.fdr ?? '—'}</td>
                <td className={`${tdClass} font-mono`}>{p.ml_xpts?.toFixed(2)}</td>
                <td className={`${tdClass} font-mono text-muted-fg`}>{p.rule_xpts?.toFixed(2)}</td>
                <td className={`${tdClass} font-mono ${p.difference > 0 ? 'text-secondary' : 'text-muted-fg'}`}>
                  {p.difference > 0 ? '+' : ''}{p.difference?.toFixed(2)}
                </td>
                <td className={`${tdClass} font-mono hidden sm:table-cell`}>{p.model_votes?.random_forest?.toFixed(1) || '—'}</td>
                <td className={`${tdClass} font-mono hidden sm:table-cell`}>{p.model_votes?.xgboost?.toFixed(1) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
