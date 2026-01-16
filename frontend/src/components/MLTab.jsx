import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Target, BarChart3, Users, Zap } from 'lucide-react'

function Spinner() {
    return (
        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
    )
}

export default function MLTab() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchML()
    }, [])

    const fetchML = async () => {
        try {
            const res = await fetch('/api/ml-predictions')
            const result = await res.json()
            setData(result)
        } catch (error) {
            console.error('Failed to fetch ML predictions:', error)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500 dark:text-slate-400">
                <Spinner />
                <div className="text-center">
                    <p className="font-medium">Training Ensemble Model...</p>
                    <p className="text-sm">(First load may take 30-60 seconds)</p>
                </div>
            </div>
        )
    }

    const stats = data?.model_info?.training_stats || {}
    const modelScores = stats.model_scores || {}
    const featureImportance = stats.feature_importance || {}
    const topFeatures = Object.entries(featureImportance).slice(0, 8)
    const maxImportance = topFeatures.length > 0 ? topFeatures[0][1] : 1

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                    <Brain className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">ML Insights</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Ensemble model trained on 5 seasons of FPL data</p>
                </div>
            </div>

            {/* Model Performance Cards */}
            <section>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-500" />
                    Model Performance Comparison
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Ensemble (Main) */}
                    <ModelCard
                        name="Ensemble"
                        emoji="🎯"
                        mae={stats.mae}
                        r2={stats.r2_score}
                        isMain={true}
                    />
                    {/* Individual Models */}
                    <ModelCard
                        name="Random Forest"
                        emoji="🌲"
                        mae={modelScores.random_forest?.mae}
                        r2={modelScores.random_forest?.r2}
                    />
                    <ModelCard
                        name="Gradient Boost"
                        emoji="🚀"
                        mae={modelScores.gradient_boosting?.mae}
                        r2={modelScores.gradient_boosting?.r2}
                    />
                    <ModelCard
                        name="XGBoost"
                        emoji="⚡"
                        mae={modelScores.xgboost?.mae}
                        r2={modelScores.xgboost?.r2}
                    />
                </div>
            </section>

            {/* Feature Importance */}
            {topFeatures.length > 0 && (
                <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <Target size={18} className="text-amber-500" />
                        Feature Importance (What the ML Focuses On)
                    </h3>
                    <div className="space-y-3">
                        {topFeatures.map(([feature, importance], i) => (
                            <div key={feature} className="flex items-center gap-3">
                                <span className="w-6 text-right text-xs text-slate-400 font-mono">{i + 1}</span>
                                <span className="w-40 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {formatFeatureName(feature)}
                                </span>
                                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(importance / maxImportance) * 100}%` }}
                                        transition={{ delay: i * 0.05, duration: 0.5 }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                    />
                                </div>
                                <span className="w-16 text-right text-sm font-mono text-slate-500">
                                    {(importance * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        These features have the highest impact on predictions. Minutes and BPS are typically most predictive.
                    </p>
                </section>
            )}

            {/* Consensus Picks */}
            {data?.consensus_picks && data.consensus_picks.length > 0 && (
                <section className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-6">
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                        <Users size={18} />
                        Model Consensus (All Models Agree)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.consensus_picks.map((p, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800/50 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                                    <div className="text-xs text-slate-500 mt-1">
                                        RF: {p.votes?.random_forest} | GB: {p.votes?.gradient_boosting} | XGB: {p.votes?.xgboost || '-'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{p.ml_xpts.toFixed(1)}</div>
                                    <div className="text-xs text-slate-500">xPts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ML vs Rules Disagreements */}
            {data?.ml_favorites && data.ml_favorites.length > 0 && (
                <section className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl p-6">
                    <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-4 flex items-center gap-2">
                        <Zap size={18} />
                        ML Disagrees with Rules (Hidden Edges)
                    </h3>
                    <p className="text-sm text-purple-600/70 dark:text-purple-300/70 mb-4">
                        These players have significant differences between ML and rule-based predictions.
                    </p>
                    <div className="space-y-3">
                        {data.ml_favorites.map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-4">
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                                    <span className="text-sm text-slate-500 ml-2 italic">{p.insight}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{p.ml_xpts?.toFixed(1)}</div>
                                        <div className="text-xs text-slate-400">ML</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-slate-500">{p.rule_xpts?.toFixed(1)}</div>
                                        <div className="text-xs text-slate-400">Rules</div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${p.difference > 0
                                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'
                                            : 'bg-red-100 dark:bg-red-500/20 text-red-600'
                                        }`}>
                                        {p.difference > 0 ? '+' : ''}{p.difference?.toFixed(1)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Full Predictions Table */}
            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500" />
                        Top 20 ML Predictions
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 text-left text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-medium">#</th>
                                <th className="px-4 py-3 font-medium">Player</th>
                                <th className="px-4 py-3 font-medium">ML xPts</th>
                                <th className="px-4 py-3 font-medium">Rules xPts</th>
                                <th className="px-4 py-3 font-medium">Diff</th>
                                <th className="px-4 py-3 font-medium">RF</th>
                                <th className="px-4 py-3 font-medium">GB</th>
                                <th className="px-4 py-3 font-medium">XGB</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {data?.top_predictions?.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                                    <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{p.ml_xpts?.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-slate-500">{p.rule_xpts?.toFixed(2)}</td>
                                    <td className={`px-4 py-3 font-medium ${p.difference > 0 ? 'text-emerald-600' : p.difference < 0 ? 'text-red-500' : 'text-slate-400'
                                        }`}>
                                        {p.difference > 0 ? '+' : ''}{p.difference?.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.model_votes?.random_forest?.toFixed(1) || '-'}</td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.model_votes?.gradient_boosting?.toFixed(1) || '-'}</td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.model_votes?.xgboost?.toFixed(1) || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Training Info Footer */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>📊 Training Info:</strong> Ensemble combines {Object.keys(modelScores).length || 3} models using weighted averaging.
                    Trained on <strong>{stats.samples_trained?.toLocaleString() || 'N/A'}</strong> GW records with {stats.features_used?.length || 0} features.
                    R² of {stats.r2_score || 'N/A'} means the model explains ~{((stats.r2_score || 0) * 100).toFixed(0)}% of points variance.
                </p>
            </div>
        </div>
    )
}

function ModelCard({ name, emoji, mae, r2, isMain }) {
    return (
        <div className={`rounded-xl p-4 border ${isMain
                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{emoji}</span>
                {isMain && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">MAIN</span>}
            </div>
            <div className={`text-sm font-medium mb-2 ${isMain ? 'text-white/80' : 'text-slate-500'}`}>
                {name}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <div className={`text-lg font-bold ${isMain ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}>
                        {r2 ?? '-'}
                    </div>
                    <div className={`text-xs ${isMain ? 'text-white/60' : 'text-slate-400'}`}>R²</div>
                </div>
                <div>
                    <div className={`text-lg font-bold ${isMain ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {mae ?? '-'}
                    </div>
                    <div className={`text-xs ${isMain ? 'text-white/60' : 'text-slate-400'}`}>MAE</div>
                </div>
            </div>
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
        'expected_goals': 'Expected Goals (xG)',
        'expected_assists': 'Expected Assists (xA)',
        'expected_goal_involvements': 'xGI',
        'clean_sheets': 'Clean Sheets',
        'value': 'Price',
        'form_score': 'Form Score',
        'minutes_ratio': 'Minutes %',
        'goal_involvement_rate': 'Goal Involvement Rate',
        'xg_overperformance': 'xG Overperformance',
        'consistency_score': 'Consistency'
    }
    return mapping[name] || name.replace(/_/g, ' ')
}
