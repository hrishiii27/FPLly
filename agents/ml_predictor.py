"""
FPL-Agent: Ensemble ML Predictor

Predicts *next* gameweek points from information known *before* kickoff.
Training uses lagged rolling stats (prior GWs only) so metrics are honest —
same-GW goals/bonus are not used as features (those reconstruct the FPL
scoring formula and produce a fake R² ~ 0.97).
"""

import os
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️ XGBoost not available, using sklearn only")

try:
    import joblib
except ImportError:
    joblib = None

from .data_ingestion import FPLDataIngestion
from .historical_data import HistoricalDataAgent

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
MODEL_PATH = os.path.join(MODEL_DIR, "ml_ensemble.joblib")
MODEL_VERSION = "v2-fdr-lagged"

# Same-GW box-score fields that reconstruct FPL scoring — never use as features.
LEAKY_FEATURES = {
    "goals_scored", "assists", "bonus", "bps", "clean_sheets", "minutes",
    "ict_index", "influence", "creativity", "threat", "expected_goals",
    "expected_assists", "expected_goal_involvements", "total_points",
    "goals_conceded", "saves", "yellow_cards", "red_cards",
}

POS_MAP = {
    "GK": 1, "GKP": 1, "Goalkeeper": 1,
    "DEF": 2, "Defender": 2,
    "MID": 3, "Midfielder": 3,
    "FWD": 4, "Forward": 4,
}

# Rolling windows computed from *previous* GWs only
LAG_SOURCE_COLS = [
    "minutes", "total_points", "goals_scored", "assists", "clean_sheets",
    "bonus", "bps", "ict_index", "expected_goals", "expected_assists",
    "expected_goal_involvements",
]


@dataclass
class MLPrediction:
    """ML-based prediction for a player."""
    player_id: int
    player_name: str
    ml_predicted_points: float
    rule_based_points: float
    confidence: float
    difference: float
    features_used: dict
    model_votes: dict = field(default_factory=dict)


class EnsembleMLPredictor:
    """Agent that uses ensemble ML to predict FPL points for the next GW."""

    FEATURE_COLUMNS = [
        "minutes_roll5",
        "points_roll5",
        "points_lag1",
        "xg_roll5",
        "xa_roll5",
        "xgi_roll5",
        "ict_roll5",
        "bonus_roll5",
        "cs_roll5",
        "minutes_ratio_roll5",
        "gi_rate_roll5",
        "xg_overperf_roll5",
        "value",
        "was_home",
        "pos_code",
        "fdr",
    ]

    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        self.historical = HistoricalDataAgent()
        self.models = {}
        self.ensemble_weights = {}
        self.feature_names: list[str] = []
        self.is_trained = False
        self.training_stats = {}

    def load_training_data(self) -> Optional[pd.DataFrame]:
        """Load and prepare historical data for training."""
        print("📚 Loading historical data for ML training...")
        self.historical.load_all_historical_data()

        all_data = []
        for season, df in self.historical.merged_gw_data.items():
            df = df.copy()
            df["season"] = season
            all_data.append(df)

        if not all_data:
            print("❌ No historical data available")
            return None

        combined = pd.concat(all_data, ignore_index=True)
        print(f"✅ Loaded {len(combined)} gameweek records for training")
        return combined

    def _ensure_gw_column(self, df: pd.DataFrame) -> pd.DataFrame:
        if "GW" not in df.columns:
            if "round" in df.columns:
                df["GW"] = df["round"]
            else:
                df["GW"] = 1
        return df

    def build_lagged_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create pre-match features: rolling stats from prior GWs + known fixture flags."""
        df = df.copy()
        df = self._ensure_gw_column(df)

        if "name" not in df.columns:
            return df.iloc[0:0]

        for col in LAG_SOURCE_COLS:
            if col not in df.columns:
                df[col] = 0.0
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        if "value" not in df.columns:
            df["value"] = 50
        df["value"] = pd.to_numeric(df["value"], errors="coerce").fillna(50)

        if "was_home" in df.columns:
            df["was_home"] = df["was_home"].astype(str).str.lower().isin(["true", "1", "yes"]).astype(int)
        else:
            df["was_home"] = 0

        if "position" in df.columns:
            df["pos_code"] = df["position"].map(POS_MAP).fillna(3)
        else:
            df["pos_code"] = 3

        if "fdr" in df.columns:
            df["fdr"] = pd.to_numeric(df["fdr"], errors="coerce").fillna(3).clip(1, 5)
        else:
            df["fdr"] = 3

        df = df.sort_values(["season", "name", "GW"])
        grouped = df.groupby(["season", "name"], group_keys=False)

        df["minutes_lag1"] = grouped["minutes"].shift(1)
        df["points_lag1"] = grouped["total_points"].shift(1)

        df["minutes_roll5"] = grouped["minutes"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["points_roll5"] = grouped["total_points"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["xg_roll5"] = grouped["expected_goals"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["xa_roll5"] = grouped["expected_assists"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["xgi_roll5"] = grouped["expected_goal_involvements"].transform(
            lambda s: s.shift(1).rolling(5, min_periods=1).mean()
        )
        df["ict_roll5"] = grouped["ict_index"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["bonus_roll5"] = grouped["bonus"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["cs_roll5"] = grouped["clean_sheets"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["goals_roll5"] = grouped["goals_scored"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        df["assists_roll5"] = grouped["assists"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())

        df["minutes_ratio_roll5"] = (df["minutes_roll5"] / 90.0).clip(0, 1.2)
        df["gi_rate_roll5"] = df["goals_roll5"] + df["assists_roll5"]
        df["xg_overperf_roll5"] = df["goals_roll5"] - df["xg_roll5"]

        # Need at least one prior appearance to predict
        df = df[df["minutes_lag1"].notna()]
        df = df[df["minutes_roll5"] >= 10]
        return df

    def prepare_features(self, df: pd.DataFrame) -> tuple:
        df = self.build_lagged_features(df)
        available = [f for f in self.FEATURE_COLUMNS if f in df.columns]
        leaked = [f for f in available if f in LEAKY_FEATURES]
        if leaked:
            print(f"❌ Refusing to train with leaky same-GW features: {leaked}")
            return None, None, None

        if "total_points" not in df.columns or len(df) < 100:
            print("❌ Not enough lagged training rows")
            return None, None, None

        df = df.replace([np.inf, -np.inf], np.nan)
        subset = df[available + ["total_points", "season"]].dropna()
        subset = subset[subset["total_points"] <= 24]

        if len(subset) < 100:
            print(f"❌ Not enough data after lagging: {len(subset)} rows")
            return None, None, None

        X = subset[available]
        y = subset["total_points"]
        seasons = subset["season"]
        return X, y, seasons

    def _chronological_split(self, X, y, seasons, test_size=0.2):
        """Hold out the most recent season(s) instead of a random row split."""
        unique_seasons = [s for s in HistoricalDataAgent.SEASONS if s in set(seasons.values)]
        if len(unique_seasons) >= 2:
            test_season = unique_seasons[-1]
            test_mask = seasons == test_season
            # If the latest season is tiny, fall back to last two seasons as test
            if test_mask.sum() < 500 and len(unique_seasons) >= 3:
                test_mask = seasons.isin(unique_seasons[-2:])
            train_mask = ~test_mask
            if train_mask.sum() > 0 and test_mask.sum() > 0:
                return X[train_mask], X[test_mask], y[train_mask], y[test_mask]

        split = int(len(X) * (1 - test_size))
        return X.iloc[:split], X.iloc[split:], y.iloc[:split], y.iloc[split:]

    def _season_sample_weights(self, seasons: pd.Series) -> np.ndarray:
        unique = list(HistoricalDataAgent.SEASONS)
        weights = []
        for s in seasons:
            if s in unique:
                idx = unique.index(s)
                weights.append(0.55 + 0.12 * idx)
            else:
                weights.append(1.0)
        return np.array(weights, dtype=float)

    def load_cached_model(self) -> bool:
        if joblib is None or not os.path.exists(MODEL_PATH):
            return False
        try:
            payload = joblib.load(MODEL_PATH)
            if payload.get("version") != MODEL_VERSION:
                print("ℹ️ Cached model is an older version — retraining")
                return False
            if payload.get("seasons") != HistoricalDataAgent.SEASONS:
                return False
            if "fdr" not in payload.get("feature_names", []):
                return False
            self.models = payload["models"]
            self.ensemble_weights = payload["ensemble_weights"]
            self.feature_names = payload["feature_names"]
            self.training_stats = payload["training_stats"]
            self.is_trained = True
            print("✅ Loaded cached ML ensemble from disk")
            return True
        except Exception as e:
            print(f"⚠️ Could not load cached model: {e}")
            return False

    def _save_cached_model(self):
        if joblib is None:
            return
        try:
            os.makedirs(MODEL_DIR, exist_ok=True)
            joblib.dump({
                "version": MODEL_VERSION,
                "seasons": HistoricalDataAgent.SEASONS,
                "models": self.models,
                "ensemble_weights": self.ensemble_weights,
                "feature_names": self.feature_names,
                "training_stats": self.training_stats,
            }, MODEL_PATH)
            print(f"💾 Saved ML ensemble to {MODEL_PATH}")
        except Exception as e:
            print(f"⚠️ Could not cache model: {e}")

    def train(self, force: bool = False) -> bool:
        """Train the ensemble ML model on lagged historical data."""
        if not force and self.load_cached_model():
            return True

        df = self.load_training_data()
        if df is None:
            return False

        X, y, seasons = self.prepare_features(df)
        if X is None:
            return False

        print(f"🏋️ Training lagged ensemble on {len(X)} samples with {len(X.columns)} features...")

        X_train, X_test, y_train, y_test = self._chronological_split(X, y, seasons)
        sample_w = self._season_sample_weights(seasons.loc[X_train.index])

        self.feature_names = list(X.columns)
        self.models = {}
        maes = {}
        r2s = {}

        print("  📊 Training Random Forest...")
        rf = RandomForestRegressor(
            n_estimators=180,
            max_depth=8,
            min_samples_split=12,
            min_samples_leaf=8,
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train, sample_weight=sample_w)
        rf_pred = rf.predict(X_test)
        maes["random_forest"] = mean_absolute_error(y_test, rf_pred)
        r2s["random_forest"] = r2_score(y_test, rf_pred)
        self.models["random_forest"] = rf
        print(f"     RF: MAE={maes['random_forest']:.3f}, R²={r2s['random_forest']:.3f}")

        print("  🚀 Training Gradient Boosting...")
        gb = GradientBoostingRegressor(
            n_estimators=180,
            max_depth=4,
            learning_rate=0.06,
            subsample=0.8,
            random_state=42,
        )
        gb.fit(X_train, y_train, sample_weight=sample_w)
        gb_pred = gb.predict(X_test)
        maes["gradient_boosting"] = mean_absolute_error(y_test, gb_pred)
        r2s["gradient_boosting"] = r2_score(y_test, gb_pred)
        self.models["gradient_boosting"] = gb
        print(f"     GB: MAE={maes['gradient_boosting']:.3f}, R²={r2s['gradient_boosting']:.3f}")

        preds = {"random_forest": rf_pred, "gradient_boosting": gb_pred}

        if HAS_XGBOOST:
            print("  ⚡ Training XGBoost...")
            xgb = XGBRegressor(
                n_estimators=220,
                max_depth=4,
                learning_rate=0.06,
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=8,
                random_state=42,
                verbosity=0,
            )
            xgb.fit(X_train, y_train, sample_weight=sample_w)
            xgb_pred = xgb.predict(X_test)
            maes["xgboost"] = mean_absolute_error(y_test, xgb_pred)
            r2s["xgboost"] = r2_score(y_test, xgb_pred)
            self.models["xgboost"] = xgb
            preds["xgboost"] = xgb_pred
            print(f"     XGB: MAE={maes['xgboost']:.3f}, R²={r2s['xgboost']:.3f}")

        inv = {k: 1.0 / (v + 1e-6) for k, v in maes.items()}
        total = sum(inv.values())
        self.ensemble_weights = {k: inv[k] / total for k in inv}

        ensemble_pred = sum(self.ensemble_weights[k] * preds[k] for k in preds)
        ensemble_mae = mean_absolute_error(y_test, ensemble_pred)
        ensemble_r2 = r2_score(y_test, ensemble_pred)
        baseline_pred = np.full(len(y_test), float(y_train.mean()))
        baseline_mae = mean_absolute_error(y_test, baseline_pred)
        skill = 1.0 - (ensemble_mae / baseline_mae) if baseline_mae > 0 else 0.0

        print(f"\n✅ Honest next-GW holdout — MAE: {ensemble_mae:.3f} pts  |  R²: {ensemble_r2:.3f}")
        print(f"   Naive mean baseline MAE: {baseline_mae:.3f}  |  skill vs mean: {skill:.1%}")
        print("   (Same-GW box-score leakage is blocked; R² near 0.97 would mean the old bug is back)")

        importance = dict(zip(self.feature_names, rf.feature_importances_))

        self.training_stats = {
            "samples_trained": int(len(X_train)),
            "samples_tested": int(len(X_test)),
            "mae": round(float(ensemble_mae), 3),
            "r2_score": round(float(ensemble_r2), 3),
            "baseline_mae": round(float(baseline_mae), 3),
            "skill_vs_mean": round(float(skill), 3),
            "holdout": "latest season, chronological",
            "leakage_guard": True,
            "metric_note": "MAE is average next-GW points error. R² ~0.10–0.25 is typical; 0.97 was leakage.",
            "features_used": self.feature_names,
            "seasons": list(self.historical.merged_gw_data.keys()),
            "task": "next_gw_from_lagged_form",
            "model_scores": {
                name: {"mae": round(float(maes[name]), 3), "r2": round(float(r2s[name]), 3)}
                for name in maes
            },
            "ensemble_weights": {k: round(v, 3) for k, v in self.ensemble_weights.items()},
            "ensemble_type": "inverse_mae_weighted",
            "feature_importance": {
                k: round(float(v), 4)
                for k, v in sorted(importance.items(), key=lambda x: x[1], reverse=True)
            },
        }

        self.is_trained = True
        self._save_cached_model()
        return True

    def _next_fixture_context(self, player) -> tuple[int, int]:
        """Return (was_home, fdr) for the next fixture."""
        upcoming = self.data.get_player_fixtures(player, 1)
        if not upcoming:
            return 0, 3
        fix = upcoming[0]
        home = 1 if fix.get("home") else 0
        fdr = int(fix.get("difficulty") or 3)
        return home, max(1, min(5, fdr))

    def _feature_row_for_player(self, player) -> dict:
        games_played = max(player.minutes / 90.0, 1.0)
        per_game_minutes = player.minutes / games_played
        was_home, fdr = self._next_fixture_context(player)

        # Season-to-date averages are the live analogue of roll5 features
        xg_pg = player.expected_goals / games_played
        xa_pg = player.expected_assists / games_played
        goals_pg = player.goals_scored / games_played
        assists_pg = player.assists / games_played

        return {
            "minutes_roll5": per_game_minutes,
            "points_roll5": float(player.form) if player.form else player.points_per_game,
            "points_lag1": float(player.form) if player.form else player.points_per_game,
            "xg_roll5": xg_pg,
            "xa_roll5": xa_pg,
            "xgi_roll5": player.expected_goal_involvements / games_played,
            "ict_roll5": player.ict_index / games_played,
            "bonus_roll5": player.bonus / games_played,
            "cs_roll5": player.clean_sheets / games_played,
            "minutes_ratio_roll5": min(1.2, per_game_minutes / 90.0),
            "gi_rate_roll5": goals_pg + assists_pg,
            "xg_overperf_roll5": goals_pg - xg_pg,
            "value": player.price * 10,
            "was_home": was_home,
            "pos_code": POS_MAP.get(player.position, 3),
            "fdr": fdr,
        }

    def _ensemble_predict(self, features: dict) -> tuple[float, dict]:
        row = {name: features.get(name, 0) for name in self.feature_names}
        X_pred = pd.DataFrame([row], columns=self.feature_names)

        votes = {}
        weighted = 0.0
        for name, model in self.models.items():
            pred = float(model.predict(X_pred)[0])
            pred = max(0.0, min(16.0, pred))
            votes[name] = round(pred, 2)
            weighted += self.ensemble_weights.get(name, 1.0 / len(self.models)) * pred

        return weighted, votes

    def predict_player(self, player) -> Optional[MLPrediction]:
        if not self.is_trained:
            if not self.train():
                return None

        if player.minutes < 1:
            return None

        features = self._feature_row_for_player(player)
        ml_points, votes = self._ensemble_predict(features)

        r2 = self.training_stats.get("r2_score", 0.15)
        skill = self.training_stats.get("skill_vs_mean", 0.1)
        confidence = round(min(80.0, max(40.0, 45 + max(skill, 0) * 40 + max(r2, 0) * 20)), 1)

        return MLPrediction(
            player_id=player.id,
            player_name=player.web_name,
            ml_predicted_points=round(float(ml_points), 2),
            rule_based_points=0,
            confidence=confidence,
            difference=0,
            features_used=features,
            model_votes=votes,
        )

    def predict_all_players(self, rule_based_predictions: dict = None) -> list[MLPrediction]:
        if not self.is_trained:
            if not self.train():
                return []

        predictions = []
        for player in self.data.players:
            if player.status != "a":
                continue

            pred = self.predict_player(player)
            if not pred:
                continue

            if rule_based_predictions and player.id in rule_based_predictions:
                rule_pts = rule_based_predictions[player.id].expected_points
                pred.rule_based_points = rule_pts
                # ML is a single-match forecast; DGW/BGW already live on the rule side
                gw_mult = getattr(rule_based_predictions[player.id], "gw_multiplier", 1)
                if gw_mult == 0:
                    pred.ml_predicted_points = 0.0
                elif gw_mult >= 2:
                    pred.ml_predicted_points = round(pred.ml_predicted_points * 1.8, 2)
                pred.difference = round(pred.ml_predicted_points - rule_pts, 2)

            predictions.append(pred)

        return sorted(predictions, key=lambda x: x.ml_predicted_points, reverse=True)

    def get_disagreements(self, predictions: list[MLPrediction], threshold: float = 1.5) -> list[MLPrediction]:
        return sorted(
            [p for p in predictions if abs(p.difference) >= threshold],
            key=lambda x: abs(x.difference),
            reverse=True,
        )

    def get_model_consensus(self, predictions: list[MLPrediction]) -> list[dict]:
        consensus = []
        for p in predictions[:30]:
            if p.model_votes:
                votes = list(p.model_votes.values())
                variance = float(np.var(votes))
                if variance < 0.5:
                    consensus.append({
                        "name": p.player_name,
                        "ml_xpts": p.ml_predicted_points,
                        "votes": p.model_votes,
                        "consensus_strength": round(1 - variance, 2),
                    })
        return sorted(consensus, key=lambda x: x["ml_xpts"], reverse=True)[:10]

    def to_dict(self, predictions: list[MLPrediction] = None) -> dict:
        if predictions is None:
            predictions = self.predict_all_players()

        disagreements = self.get_disagreements(predictions)
        consensus = self.get_model_consensus(predictions)

        return {
            "model_info": {
                "is_trained": self.is_trained,
                "training_stats": self.training_stats,
                "model_type": "lagged_ensemble",
                "models_used": list(self.models.keys()),
            },
            "top_predictions": [
                {
                    "id": p.player_id,
                    "name": p.player_name,
                    "team": next((pl.team_name for pl in self.data.players if pl.id == p.player_id), ""),
                    "ml_xpts": p.ml_predicted_points,
                    "rule_xpts": p.rule_based_points,
                    "difference": p.difference,
                    "confidence": p.confidence,
                    "model_votes": p.model_votes,
                    "fdr": (p.features_used or {}).get("fdr"),
                }
                for p in predictions[:20]
            ],
            "ml_favorites": [
                {
                    "name": p.player_name,
                    "ml_xpts": p.ml_predicted_points,
                    "rule_xpts": p.rule_based_points,
                    "difference": p.difference,
                    "insight": "ML sees something rules miss" if p.difference > 0 else "Rules more optimistic",
                }
                for p in disagreements[:10]
            ],
            "consensus_picks": consensus,
        }


MLPredictor = EnsembleMLPredictor


if __name__ == "__main__":
    print("🤖 Testing Ensemble ML Predictor...")

    data = FPLDataIngestion()
    data.ingest_all_data()

    ml = EnsembleMLPredictor(data)
    ml.train()

    predictions = ml.predict_all_players()

    print("\n🎯 Top 10 ML Predictions:")
    for p in predictions[:10]:
        print(f"  {p.player_name}: {p.ml_predicted_points:.2f} pts | Votes: {p.model_votes}")
