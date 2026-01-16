"""
FPL-Agent: Enhanced ML Predictor
Uses ensemble machine learning (RF + XGBoost + GradientBoosting) for better predictions.
"""

import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Optional
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, VotingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️ XGBoost not available, using sklearn only")

from .historical_data import HistoricalDataAgent
from .data_ingestion import FPLDataIngestion


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
    model_votes: dict = None  # Individual model predictions


class EnsembleMLPredictor:
    """Agent that uses ensemble ML to predict FPL points."""
    
    # Core features from FPL data
    FEATURE_COLUMNS = [
        'minutes', 'goals_scored', 'assists', 'clean_sheets',
        'goals_conceded', 'bonus', 'bps', 'influence', 'creativity',
        'threat', 'ict_index', 'expected_goals', 'expected_assists',
        'expected_goal_involvements', 'value'
    ]
    
    # Additional engineered features
    ENGINEERED_FEATURES = [
        'form_score', 'minutes_ratio', 'goal_involvement_rate',
        'xg_overperformance', 'consistency_score'
    ]
    
    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        self.historical = HistoricalDataAgent()
        self.ensemble = None
        self.models = {}
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_stats = {}
    
    def load_training_data(self) -> Optional[pd.DataFrame]:
        """Load and prepare historical data for training."""
        print("📚 Loading historical data for ML training...")
        self.historical.load_all_historical_data()
        
        all_data = []
        for season, df in self.historical.merged_gw_data.items():
            df = df.copy()
            df['season'] = season
            all_data.append(df)
        
        if not all_data:
            print("❌ No historical data available")
            return None
        
        combined = pd.concat(all_data, ignore_index=True)
        print(f"✅ Loaded {len(combined)} gameweek records for training")
        
        return combined
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create additional engineered features."""
        df = df.copy()
        
        # Form score: weighted recent performance
        if 'total_points' in df.columns and 'GW' in df.columns:
            df['form_score'] = df.groupby('name')['total_points'].transform(
                lambda x: x.rolling(5, min_periods=1).mean()
            )
        else:
            df['form_score'] = 0
        
        # Minutes ratio: what % of available minutes played
        df['minutes_ratio'] = df['minutes'] / 90 if 'minutes' in df.columns else 0
        
        # Goal involvement rate
        if 'goals_scored' in df.columns and 'assists' in df.columns:
            df['goal_involvement_rate'] = (df['goals_scored'] + df['assists']) / df['minutes'].clip(lower=1) * 90
        else:
            df['goal_involvement_rate'] = 0
        
        # xG overperformance
        if 'goals_scored' in df.columns and 'expected_goals' in df.columns:
            df['xg_overperformance'] = df['goals_scored'] - df['expected_goals']
        else:
            df['xg_overperformance'] = 0
        
        # Consistency score (inverse of std deviation)
        if 'total_points' in df.columns:
            df['consistency_score'] = df.groupby('name')['total_points'].transform(
                lambda x: 1 / (x.std() + 1)
            )
        else:
            df['consistency_score'] = 0
        
        return df
    
    def prepare_features(self, df: pd.DataFrame) -> tuple:
        """Prepare features and target for ML training."""
        # Engineer additional features
        df = self.engineer_features(df)
        
        # Use all available features
        all_features = self.FEATURE_COLUMNS + self.ENGINEERED_FEATURES
        available_features = [f for f in all_features if f in df.columns]
        
        if 'total_points' not in df.columns:
            print("❌ Target column 'total_points' not found")
            return None, None
        
        subset_cols = available_features + ['total_points']
        df_clean = df[subset_cols].dropna()
        
        # Remove outliers (points > 20 are rare)
        df_clean = df_clean[df_clean['total_points'] <= 25]
        
        if len(df_clean) < 100:
            print(f"❌ Not enough data: {len(df_clean)} rows")
            return None, None
        
        X = df_clean[available_features]
        y = df_clean['total_points']
        
        return X, y
    
    def train(self) -> bool:
        """Train the ensemble ML model on historical data."""
        df = self.load_training_data()
        if df is None:
            return False
        
        X, y = self.prepare_features(df)
        if X is None:
            return False
        
        print(f"🏋️ Training ensemble on {len(X)} samples with {len(X.columns)} features...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Initialize individual models
        print("  📊 Training Random Forest...")
        rf = RandomForestRegressor(
            n_estimators=150,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train_scaled, y_train)
        rf_pred = rf.predict(X_test_scaled)
        rf_mae = mean_absolute_error(y_test, rf_pred)
        rf_r2 = r2_score(y_test, rf_pred)
        self.models['random_forest'] = rf
        print(f"     RF: MAE={rf_mae:.3f}, R²={rf_r2:.3f}")
        
        print("  🚀 Training Gradient Boosting...")
        gb = GradientBoostingRegressor(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.08,
            subsample=0.8,
            random_state=42
        )
        gb.fit(X_train_scaled, y_train)
        gb_pred = gb.predict(X_test_scaled)
        gb_mae = mean_absolute_error(y_test, gb_pred)
        gb_r2 = r2_score(y_test, gb_pred)
        self.models['gradient_boosting'] = gb
        print(f"     GB: MAE={gb_mae:.3f}, R²={gb_r2:.3f}")
        
        if HAS_XGBOOST:
            print("  ⚡ Training XGBoost...")
            xgb = XGBRegressor(
                n_estimators=150,
                max_depth=6,
                learning_rate=0.08,
                subsample=0.8,
                random_state=42,
                verbosity=0
            )
            xgb.fit(X_train_scaled, y_train)
            xgb_pred = xgb.predict(X_test_scaled)
            xgb_mae = mean_absolute_error(y_test, xgb_pred)
            xgb_r2 = r2_score(y_test, xgb_pred)
            self.models['xgboost'] = xgb
            print(f"     XGB: MAE={xgb_mae:.3f}, R²={xgb_r2:.3f}")
        
        # Create ensemble (weighted average)
        print("  🎯 Creating ensemble...")
        if HAS_XGBOOST:
            # Weighted ensemble based on R² scores
            weights = [rf_r2, gb_r2, xgb_r2]
            weights = [w/sum(weights) for w in weights]  # Normalize
            ensemble_pred = (
                weights[0] * rf_pred + 
                weights[1] * gb_pred + 
                weights[2] * xgb_pred
            )
        else:
            weights = [rf_r2, gb_r2]
            weights = [w/sum(weights) for w in weights]
            ensemble_pred = weights[0] * rf_pred + weights[1] * gb_pred
        
        # Evaluate ensemble
        ensemble_mae = mean_absolute_error(y_test, ensemble_pred)
        ensemble_r2 = r2_score(y_test, ensemble_pred)
        
        print(f"\n✅ Ensemble trained! MAE: {ensemble_mae:.3f}, R²: {ensemble_r2:.3f}")
        
        self.training_stats = {
            "samples_trained": len(X_train),
            "samples_tested": len(X_test),
            "mae": round(ensemble_mae, 3),
            "r2_score": round(ensemble_r2, 3),
            "features_used": list(X.columns),
            "model_scores": {
                "random_forest": {"mae": round(rf_mae, 3), "r2": round(rf_r2, 3)},
                "gradient_boosting": {"mae": round(gb_mae, 3), "r2": round(gb_r2, 3)},
            },
            "ensemble_type": "weighted_average"
        }
        
        if HAS_XGBOOST:
            self.training_stats["model_scores"]["xgboost"] = {
                "mae": round(xgb_mae, 3), "r2": round(xgb_r2, 3)
            }
        
        # Feature importance (average across models)
        importance = dict(zip(X.columns, rf.feature_importances_))
        self.training_stats["feature_importance"] = {
            k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: x[1], reverse=True)
        }
        
        self.is_trained = True
        return True
    
    def predict_player(self, player) -> Optional[MLPrediction]:
        """Predict points for a player using ensemble ML."""
        if not self.is_trained:
            if not self.train():
                return None
        
        # Calculate games played for normalization
        games_played = max(player.minutes / 90, 1)
        
        # Build feature vector - NORMALIZE to per-game values
        features = {}
        features['minutes'] = player.minutes / games_played
        features['goals_scored'] = player.goals_scored / games_played
        features['assists'] = player.assists / games_played
        features['clean_sheets'] = player.clean_sheets / games_played
        features['goals_conceded'] = 0
        features['bonus'] = player.bonus / games_played
        features['bps'] = player.bps / games_played
        features['influence'] = player.influence / games_played
        features['creativity'] = player.creativity / games_played
        features['threat'] = player.threat / games_played
        features['ict_index'] = player.ict_index / games_played
        features['expected_goals'] = player.expected_goals / games_played
        features['expected_assists'] = player.expected_assists / games_played
        features['expected_goal_involvements'] = player.expected_goal_involvements / games_played
        features['value'] = player.price * 10
        
        # Engineered features
        features['form_score'] = player.form
        features['minutes_ratio'] = min(1.0, player.minutes / games_played / 90)
        features['goal_involvement_rate'] = (player.goals_scored + player.assists) / max(games_played, 1)
        features['xg_overperformance'] = player.goals_scored - player.expected_goals
        features['consistency_score'] = 0.5  # Default, would need historical calc
        
        # Create feature array
        available = [f for f in self.scaler.feature_names_in_ if f in features]
        if not available:
            return None
        
        X_pred = pd.DataFrame([{f: features.get(f, 0) for f in self.scaler.feature_names_in_}])
        X_scaled = self.scaler.transform(X_pred)
        
        # Get predictions from each model
        model_votes = {}
        predictions = []
        
        for name, model in self.models.items():
            pred = model.predict(X_scaled)[0]
            pred = max(0, min(15, pred))  # Cap between 0-15
            model_votes[name] = round(float(pred), 2)  # Convert to Python float
            predictions.append(float(pred))
        
        # Ensemble prediction (average)
        ml_points = np.mean(predictions)
        
        return MLPrediction(
            player_id=player.id,
            player_name=player.web_name,
            ml_predicted_points=round(ml_points, 2),
            rule_based_points=0,
            confidence=round(self.training_stats.get('r2_score', 0.5) * 100, 1),
            difference=0,
            features_used=features,
            model_votes=model_votes
        )
    
    def predict_all_players(self, rule_based_predictions: dict = None) -> list[MLPrediction]:
        """Predict points for all available players."""
        if not self.is_trained:
            if not self.train():
                return []
        
        predictions = []
        for player in self.data.players:
            if player.status != "a":
                continue
            
            pred = self.predict_player(player)
            if pred:
                if rule_based_predictions and player.id in rule_based_predictions:
                    rule_pts = rule_based_predictions[player.id].expected_points
                    pred.rule_based_points = rule_pts
                    pred.difference = round(pred.ml_predicted_points - rule_pts, 2)
                
                predictions.append(pred)
        
        return sorted(predictions, key=lambda x: x.ml_predicted_points, reverse=True)
    
    def get_disagreements(self, predictions: list[MLPrediction], threshold: float = 1.5) -> list[MLPrediction]:
        """Find players where ML and rule-based disagree."""
        return sorted(
            [p for p in predictions if abs(p.difference) >= threshold],
            key=lambda x: abs(x.difference),
            reverse=True
        )
    
    def get_model_consensus(self, predictions: list[MLPrediction]) -> list[dict]:
        """Find players where all models agree."""
        consensus = []
        for p in predictions[:30]:
            if p.model_votes:
                votes = list(p.model_votes.values())
                variance = np.var(votes)
                if variance < 0.5:  # Models agree
                    consensus.append({
                        "name": p.player_name,
                        "ml_xpts": p.ml_predicted_points,
                        "votes": p.model_votes,
                        "consensus_strength": round(1 - variance, 2)
                    })
        return sorted(consensus, key=lambda x: x["ml_xpts"], reverse=True)[:10]
    
    def to_dict(self, predictions: list[MLPrediction] = None) -> dict:
        """Export as JSON-friendly dict."""
        if predictions is None:
            predictions = self.predict_all_players()
        
        disagreements = self.get_disagreements(predictions)
        consensus = self.get_model_consensus(predictions)
        
        return {
            "model_info": {
                "is_trained": self.is_trained,
                "training_stats": self.training_stats,
                "model_type": "ensemble",
                "models_used": list(self.models.keys())
            },
            "top_predictions": [
                {
                    "id": p.player_id,
                    "name": p.player_name,
                    "ml_xpts": p.ml_predicted_points,
                    "rule_xpts": p.rule_based_points,
                    "difference": p.difference,
                    "confidence": p.confidence,
                    "model_votes": p.model_votes
                }
                for p in predictions[:20]
            ],
            "ml_favorites": [
                {
                    "name": p.player_name,
                    "ml_xpts": p.ml_predicted_points,
                    "rule_xpts": p.rule_based_points,
                    "difference": p.difference,
                    "insight": "ML sees something rules miss" if p.difference > 0 else "Rules more optimistic"
                }
                for p in disagreements[:10]
            ],
            "consensus_picks": consensus
        }


# Keep backward compatibility
MLPredictor = EnsembleMLPredictor


if __name__ == "__main__":
    print("🤖 Testing Ensemble ML Predictor...")
    
    data = FPLDataIngestion()
    data.ingest_all_data()
    
    ml = EnsembleMLPredictor(data)
    ml.train()
    
    predictions = ml.predict_all_players()
    
    print(f"\n🎯 Top 10 ML Predictions:")
    for p in predictions[:10]:
        votes = p.model_votes if p.model_votes else {}
        print(f"  {p.player_name}: {p.ml_predicted_points:.2f} pts | Votes: {votes}")
    
    print(f"\n📊 Training Stats:")
    for k, v in ml.training_stats.items():
        if k != "feature_importance":
            print(f"  {k}: {v}")
