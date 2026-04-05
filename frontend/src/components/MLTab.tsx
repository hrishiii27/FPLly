import { useState, useEffect } from 'react'

function Spinner() {
  return (
    <div className="flex justify-center my-12">
      <div className="animate-spin w-8 h-8 flex items-center justify-center border-2 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
}

function formatFeatureName(name) {
    const mapping = {
        'minutes': 'Minutes Played',
        'bps': 'Bonus Points System',
        'bonus': 'Bonus Points',
        'goals_scored': 'Goals Scored',
        'assists': 'Assists',
        'ict_index': 'ICT Index',
        'threat': 'Threat',
        'creativity': 'Creativity',
        'influence': 'Influence',
        'expected_goals': 'xG',
        'expected_assists': 'xA',
        'expected_goal_involvements': 'xGI',
        'clean_sheets': 'Clean Sheets',
        'value': 'Price',
        'form_score': 'Form Score',
        'minutes_ratio': 'Minutes %',
        'goal_involvement_rate': 'Goal Inv. Rate',
        'xg_overperformance': 'xG Overperf.',
        'consistency_score': 'Consistency'
    }
    return mapping[name] || name.replace(/_/g, ' ')
}

export default function MLTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchML() {
      try {
        const res = await fetch('/api/ml-predictions')
        const result = await res.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch ML predictions:', error)
      }
      setLoading(false)
    }
    fetchML()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface">
        <Spinner />
        <div className="text-center font-mono opacity-80">
          <p className="text-sm uppercase tracking-widest text-primary">Initializing Neural Nets...</p>
        </div>
      </div>
    )
  }

  const stats = data?.model_info?.training_stats || {}
  const modelScores = stats.model_scores || {}
  const featureImportance = stats.feature_importance || {}
  const topFeatures = Object.entries(featureImportance).slice(0, 8)
  const maxImportance: any = topFeatures.length > 0 ? topFeatures[0][1] : 1

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* Hero Header */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl text-on-surface">
            <span className="font-label text-secondary font-bold tracking-[0.2em] uppercase text-sm mb-2 block">The Algorithm</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
              Predictive<br /><span className="text-primary italic">Intelligence</span>
            </h1>
            <p className="mt-6 text-lg text-outline font-body leading-relaxed max-w-xl">
              An ensemble of XGBoost, Random Forest, and Gradient Boosting models trained on half a decade of underlying metric arrays to decode FPL performance.
            </p>
          </div>
          <div className="hidden lg:block text-right">
            <div className="bg-surface-container-high border border-surface-container-highest p-4 rounded-xl font-mono text-xs text-secondary-fixed">
              <p className="mb-1 text-outline">System Status</p>
              <p className="text-secondary">&gt; ENSEMBLE ACTIVE</p>
              <p>&gt; R² {(stats.r2_score*100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Models Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-surface-container-lowest border border-surface-container-high p-6 rounded-xl flex flex-col justify-between">
          <div>
            <span className="material-symbols-outlined text-primary mb-4 text-4xl tracking-normal">target</span>
            <h4 className="font-headline font-bold text-xl uppercase">Ensemble</h4>
            <p className="font-body text-xs text-outline mt-2">Weighted average of core models</p>
          </div>
          <div className="mt-6 flex justify-between items-end border-t border-surface-container-high pt-4">
            <div>
              <p className="font-headline text-3xl font-black">{stats.mae}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-outline">MAE Score</p>
            </div>
            <div>
              <p className="font-headline text-xl font-black text-secondary">{stats.r2_score}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-outline">R²</p>
            </div>
          </div>
        </div>
        
        {/* Child Models */}
        {[
          { name: 'Random Forest', val: modelScores.random_forest, icon: 'account_tree' },
          { name: 'Gradient Boost', val: modelScores.gradient_boosting, icon: 'speed' },
          { name: 'XGBoost', val: modelScores.xgboost, icon: 'bolt' }
        ].map((m, i) => (
          <div key={i} className="bg-surface-container-low border border-surface-container-high p-6 rounded-xl flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-outline mb-4 text-3xl tracking-normal">{m.icon}</span>
              <h4 className="font-headline font-bold text-lg uppercase">{m.name}</h4>
            </div>
            <div className="mt-6 flex justify-between items-end border-t border-surface-container-high pt-4">
              <div>
                <p className="font-headline text-2xl font-bold">{m.val?.mae ?? '-'}</p>
                <p className="font-label text-[10px] uppercase tracking-widest text-outline">MAE</p>
              </div>
              <div className="text-right">
                <p className="font-headline text-lg font-bold opacity-60">{m.val?.r2 ?? '-'}</p>
                <p className="font-label text-[10px] uppercase tracking-widest text-outline">R²</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feature Importance Bar Chart */}
        {topFeatures.length > 0 && (
          <section className="bg-surface-container-lowest border border-surface-container-high p-8 rounded-xl">
            <h3 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-tight mb-2">The Black Box</h3>
            <p className="font-body text-sm text-outline mb-8">Feature importance ranking across all ensemble trees.</p>
            
            <div className="space-y-4">
              {topFeatures.map(([feature, importance]: any, i) => (
                <div key={feature} className="flex items-center gap-4">
                  <div className="w-1/3 truncate font-label text-xs uppercase tracking-widest text-on-surface">
                    {formatFeatureName(feature)}
                  </div>
                  <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${i===0?'bg-primary':'bg-secondary'} transition-all duration-1000`} 
                      style={{ width: `${(importance / maxImportance) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-right font-mono text-xs opacity-60">
                    {(importance * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hidden Edges */}
        {data?.ml_favorites && data.ml_favorites.length > 0 && (
          <section className="bg-primary text-on-primary border border-surface-container-high p-8 rounded-xl relative overflow-hidden grain-overlay">
            <h3 className="font-headline text-2xl font-bold uppercase tracking-tight mb-2 block relative z-10">Hidden Edges</h3>
            <p className="font-body text-sm opacity-80 mb-8 block relative z-10 text-on-primary">Where Machine Learning predicts significantly higher scores than human-derived heuristics.</p>
            
            <div className="space-y-4 relative z-10">
              {data.ml_favorites.slice(0,5).map((p, i) => (
                <div key={i} className="bg-surface-container-low/20 backdrop-blur-md border border-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="font-headline font-bold text-lg">{p.name}</span>
                    <span className="font-body text-[10px] uppercase ml-2 px-2 py-0.5 bg-white/20 rounded">{p.insight?.split(' ')[0]} Edge</span>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <div className="font-headline text-xl font-bold text-white">{p.ml_xpts?.toFixed(1)}</div>
                      <div className="font-label text-[9px] uppercase tracking-widest opacity-60">ML xPts</div>
                    </div>
                    <div>
                      <div className="font-headline text-xl font-bold opacity-60">{p.rule_xpts?.toFixed(1)}</div>
                      <div className="font-label text-[9px] uppercase tracking-widest opacity-60">Reg xPts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <span className="material-symbols-outlined text-9xl tracking-normal">troubleshoot</span>
            </div>
          </section>
        )}
      </div>

      {/* Top 20 Predictions Table Detailed */}
      <section className="bg-surface-container-lowest border border-surface-container-high rounded-xl overflow-hidden">
        <div className="p-6 border-b border-surface-container-high">
          <h3 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-tight">Top Forecasts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low font-label text-[10px] uppercase tracking-widest text-outline border-b border-surface-container-high">
              <tr>
                <th className="px-6 py-4 text-left">Player</th>
                <th className="px-6 py-4 text-left">Team</th>
                <th className="px-6 py-4 text-right">Machine xPts</th>
                <th className="px-6 py-4 text-right">Base xPts</th>
                <th className="px-6 py-4 text-right">Variance</th>
                <th className="px-6 py-4 text-right hidden sm:table-cell">RF</th>
                <th className="px-6 py-4 text-right hidden sm:table-cell">XGB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {data?.top_predictions?.slice(0,10).map((p, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 font-headline font-bold text-on-surface">{p.name}</td>
                  <td className="px-6 py-4 font-body text-outline text-xs">{p.team || 'UNK'}</td>
                  <td className="px-6 py-4 font-bold text-primary text-right text-lg">{p.ml_xpts?.toFixed(2)}</td>
                  <td className="px-6 py-4 opacity-50 text-right">{p.rule_xpts?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.difference > 0 ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-high text-outline'}`}>
                      {p.difference > 0 ? '+' : ''}{p.difference?.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs opacity-50 hidden sm:table-cell">{p.model_votes?.random_forest?.toFixed(1) || '-'}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs opacity-50 hidden sm:table-cell">{p.model_votes?.xgboost?.toFixed(1) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
