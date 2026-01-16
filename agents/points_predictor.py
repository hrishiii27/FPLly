"""
FPL-Agent: Points Prediction Agent
Data-driven prediction of expected FPL points.
"""

from dataclasses import dataclass
from .data_ingestion import Player, FPLDataIngestion
from .player_form import PlayerFormAgent
from .minutes_risk import MinutesRiskAgent
from .fixture_analysis import FixtureAnalysisAgent


@dataclass
class PointsPrediction:
    """Points prediction for a player."""
    player_id: int
    player_name: str
    team: str
    position: str
    price: float
    
    # Expected points breakdown
    expected_goals_points: float
    expected_assists_points: float
    expected_clean_sheet_points: float
    expected_appearance_points: float
    expected_bonus_points: float
    
    # Total expected points
    expected_points: float
    expected_points_low: float  # Floor
    expected_points_high: float  # Ceiling
    
    # Value metrics
    value_score: float  # Expected points per £1m
    
    # Confidence
    confidence: float
    
    # Breakdown percentages
    goal_probability: float
    assist_probability: float
    clean_sheet_probability: float
    
    # Context
    fixture_info: str
    form_trend: str
    minutes_tag: str


class PointsPredictionAgent:
    """Agent for predicting expected FPL points."""
    
    # FPL Scoring rules
    POINTS_GOAL = {"GKP": 10, "DEF": 6, "MID": 5, "FWD": 4}
    POINTS_ASSIST = 3
    POINTS_CS = {"GKP": 4, "DEF": 4, "MID": 1, "FWD": 0}
    POINTS_APPEARANCE = 2  # For 60+ minutes
    POINTS_APPEARANCE_SUB = 1  # For <60 minutes
    
    def __init__(
        self,
        data_agent: FPLDataIngestion,
        form_agent: PlayerFormAgent,
        minutes_agent: MinutesRiskAgent,
        fixture_agent: FixtureAnalysisAgent
    ):
        self.data = data_agent
        self.form = form_agent
        self.minutes = minutes_agent
        self.fixtures = fixture_agent
        self.predictions: dict[int, PointsPrediction] = {}
    
    def _calculate_clean_sheet_prob(self, player: Player) -> float:
        """Estimate clean sheet probability based on team data."""
        # Get fixture difficulty
        fixture = self.fixtures.analyses.get(player.id)
        if not fixture:
            return 0.2
        
        # Base CS probability on games played
        games = max(self.data.current_gw - 1, 1)
        team_cs = player.clean_sheets
        base_cs_rate = team_cs / games if games > 0 else 0.3
        
        # Adjust for fixture difficulty
        fdr = fixture.fdr
        fdr_multiplier = {1: 1.4, 2: 1.2, 3: 1.0, 4: 0.7, 5: 0.5}.get(fdr, 1.0)
        
        # Adjust for home/away
        home_multiplier = 1.1 if fixture.is_home else 0.9
        
        cs_prob = base_cs_rate * fdr_multiplier * home_multiplier
        return min(0.6, max(0.05, cs_prob))
    
    def _calculate_goal_contribution(self, player: Player) -> tuple[float, float]:
        """Calculate expected goals and assists for next GW."""
        form = self.form.analyses.get(player.id)
        fixture = self.fixtures.analyses.get(player.id)
        minutes_info = self.minutes.analyses.get(player.id)
        
        if not form or not minutes_info:
            return 0.1, 0.05
        
        # Base xG/xA per 90
        xg_per_90 = form.xg_per_90
        xa_per_90 = form.xa_per_90
        
        # Adjust for expected minutes
        minutes_factor = minutes_info.expected_minutes / 90
        
        # Adjust for fixture difficulty
        fixture_factor = 1.0
        if fixture:
            fdr = fixture.fdr
            fixture_factor = {1: 1.3, 2: 1.15, 3: 1.0, 4: 0.85, 5: 0.7}.get(fdr, 1.0)
            # Home boost
            if fixture.is_home:
                fixture_factor *= 1.1
        
        # Adjust for form
        form_factor = 1.0
        if form.form_trend == "rising":
            form_factor = 1.15
        elif form.form_trend == "falling":
            form_factor = 0.85
        
        xg = xg_per_90 * minutes_factor * fixture_factor * form_factor
        xa = xa_per_90 * minutes_factor * fixture_factor * form_factor
        
        return xg, xa
    
    def _calculate_bonus_probability(self, player: Player) -> float:
        """Estimate expected bonus points."""
        # Use historical bonus rate
        games = max(player.minutes / 90, 1)
        bonus_per_game = player.bonus / games if games > 0 else 0.3
        
        # Adjust based on BPS
        bps_per_game = player.bps / games if games > 0 else 15
        if bps_per_game > 25:
            bonus_factor = 1.3
        elif bps_per_game > 20:
            bonus_factor = 1.1
        elif bps_per_game < 12:
            bonus_factor = 0.7
        else:
            bonus_factor = 1.0
        
        return bonus_per_game * bonus_factor
    
    def predict_player(self, player: Player) -> PointsPrediction:
        """Generate prediction for a single player."""
        
        position = player.position
        
        # Get expected goals/assists
        xg, xa = self._calculate_goal_contribution(player)
        goal_prob = min(0.7, xg)  # Cap at 70%
        assist_prob = min(0.5, xa)
        
        # Expected points from goals
        goal_points = xg * self.POINTS_GOAL.get(position, 4)
        assist_points = xa * self.POINTS_ASSIST
        
        # Clean sheet probability
        cs_prob = 0
        cs_points = 0
        if position in ["GKP", "DEF", "MID"]:
            cs_prob = self._calculate_clean_sheet_prob(player)
            cs_points = cs_prob * self.POINTS_CS.get(position, 0)
        
        # Appearance points
        minutes_info = self.minutes.analyses.get(player.id)
        if minutes_info and minutes_info.is_available:
            if minutes_info.expected_minutes >= 60:
                appearance_points = self.POINTS_APPEARANCE
            elif minutes_info.expected_minutes >= 1:
                appearance_points = self.POINTS_APPEARANCE_SUB
            else:
                appearance_points = 0
        else:
            appearance_points = 0
        
        # Bonus points
        bonus_points = self._calculate_bonus_probability(player)
        
        # Total expected points
        expected_points = goal_points + assist_points + cs_points + appearance_points + bonus_points
        
        # Calculate range (floor/ceiling)
        variance = expected_points * 0.4
        floor = max(0, expected_points - variance)
        ceiling = expected_points + variance * 1.5  # Upside is higher
        
        # Confidence
        confidence = 70
        if minutes_info:
            confidence = min(95, (minutes_info.confidence + 70) / 2)
        
        # Value score
        value_score = expected_points / player.price if player.price > 0 else 0
        
        # Context strings
        fixture_info = "No fixture"
        fixture = self.fixtures.analyses.get(player.id)
        if fixture:
            venue = "H" if fixture.is_home else "A"
            fixture_info = f"{fixture.next_opponent}({venue}) FDR:{fixture.fdr}"
        
        form_trend = "unknown"
        form = self.form.analyses.get(player.id)
        if form:
            form_trend = form.form_trend
        
        minutes_tag = "unknown"
        if minutes_info:
            minutes_tag = minutes_info.tag
        
        prediction = PointsPrediction(
            player_id=player.id,
            player_name=player.web_name,
            team=player.team_name,
            position=position,
            price=player.price,
            expected_goals_points=round(goal_points, 2),
            expected_assists_points=round(assist_points, 2),
            expected_clean_sheet_points=round(cs_points, 2),
            expected_appearance_points=round(appearance_points, 2),
            expected_bonus_points=round(bonus_points, 2),
            expected_points=round(expected_points, 2),
            expected_points_low=round(floor, 2),
            expected_points_high=round(ceiling, 2),
            value_score=round(value_score, 3),
            confidence=round(confidence, 1),
            goal_probability=round(goal_prob * 100, 1),
            assist_probability=round(assist_prob * 100, 1),
            clean_sheet_probability=round(cs_prob * 100, 1),
            fixture_info=fixture_info,
            form_trend=form_trend,
            minutes_tag=minutes_tag
        )
        
        self.predictions[player.id] = prediction
        return prediction
    
    def predict_all_players(self) -> list[PointsPrediction]:
        """Generate predictions for all available players."""
        results = []
        for player in self.data.players:
            if player.status == "a":
                prediction = self.predict_player(player)
                results.append(prediction)
        
        return sorted(results, key=lambda x: x.expected_points, reverse=True)
    
    def get_top_predictions(self, n: int = 20, position: str = None) -> list[PointsPrediction]:
        """Get top N predictions, optionally filtered by position."""
        preds = list(self.predictions.values())
        
        if position:
            preds = [p for p in preds if p.position == position]
        
        return sorted(preds, key=lambda x: x.expected_points, reverse=True)[:n]
    
    def get_captain_picks(self, n: int = 5) -> list[PointsPrediction]:
        """Get top captain picks (highest ceiling upside)."""
        preds = [
            p for p in self.predictions.values()
            if p.minutes_tag in ["Nailed", "unknown"] and p.confidence >= 60
        ]
        
        # Sort by expected points with ceiling bonus
        return sorted(
            preds,
            key=lambda x: x.expected_points * 1.5 + x.expected_points_high * 0.5,
            reverse=True
        )[:n]
    
    def get_value_picks(self, max_price: float = 7.0, n: int = 10) -> list[PointsPrediction]:
        """Get best value picks under a certain price."""
        preds = [
            p for p in self.predictions.values()
            if p.price <= max_price and p.minutes_tag == "Nailed"
        ]
        
        return sorted(preds, key=lambda x: x.value_score, reverse=True)[:n]
    
    def to_dict(self) -> list[dict]:
        """Export predictions as list of dicts for JSON."""
        return [
            {
                "id": p.player_id,
                "name": p.player_name,
                "team": p.team,
                "position": p.position,
                "price": p.price,
                "xPts": p.expected_points,
                "xPts_low": p.expected_points_low,
                "xPts_high": p.expected_points_high,
                "xG": p.goal_probability,
                "xA": p.assist_probability,
                "xCS": p.clean_sheet_probability,
                "value": p.value_score,
                "confidence": p.confidence,
                "fixture": p.fixture_info,
                "form": p.form_trend,
                "minutes": p.minutes_tag
            }
            for p in sorted(self.predictions.values(), key=lambda x: x.expected_points, reverse=True)
        ]


if __name__ == "__main__":
    # Test the prediction agent
    print("🚀 Initializing FPL-Agent Points Prediction...")
    
    # Initialize all agents
    data_agent = FPLDataIngestion()
    data_agent.ingest_all_data()
    
    form_agent = PlayerFormAgent(data_agent)
    form_agent.analyze_all_players()
    
    minutes_agent = MinutesRiskAgent(data_agent)
    minutes_agent.analyze_all_players()
    
    fixture_agent = FixtureAnalysisAgent(data_agent)
    fixture_agent.analyze_all_players()
    
    prediction_agent = PointsPredictionAgent(data_agent, form_agent, minutes_agent, fixture_agent)
    predictions = prediction_agent.predict_all_players()
    
    print(f"\n✅ Generated predictions for {len(predictions)} players")
    
    print(f"\n🏆 Top 15 Predicted Points for GW{data_agent.next_gw}:")
    print("-" * 90)
    print(f"{'Player':<15} {'Team':<5} {'Pos':<4} {'Price':<6} {'xPts':<6} {'Range':<12} {'Fixture':<15} {'Minutes':<12}")
    print("-" * 90)
    
    for p in predictions[:15]:
        range_str = f"[{p.expected_points_low:.1f}-{p.expected_points_high:.1f}]"
        print(f"{p.player_name:<15} {p.team:<5} {p.position:<4} £{p.price:<5.1f} {p.expected_points:<6.2f} {range_str:<12} {p.fixture_info:<15} {p.minutes_tag:<12}")
    
    print("\n👑 Captain Picks:")
    print("-" * 60)
    for p in prediction_agent.get_captain_picks(5):
        print(f"{p.player_name:<15} ({p.team}) | xPts: {p.expected_points:.2f} | Ceiling: {p.expected_points_high:.2f} | {p.fixture_info}")
    
    print("\n💎 Best Value Picks (Under £7.0m):")
    print("-" * 60)
    for p in prediction_agent.get_value_picks(7.0, 5):
        print(f"{p.player_name:<15} ({p.team}) £{p.price:.1f}m | xPts: {p.expected_points:.2f} | Value: {p.value_score:.3f}")
