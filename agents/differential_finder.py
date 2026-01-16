"""
FPL-Agent: Differential Finder
Finds low-owned players with high predicted points.
"""

from dataclasses import dataclass
from .data_ingestion import FPLDataIngestion, Player
from .points_predictor import PointsPredictionAgent


@dataclass
class Differential:
    """A differential player pick."""
    player_id: int
    player_name: str
    team: str
    position: str
    price: float
    ownership: float
    xpts: float
    differential_score: float  # xPts / ownership ratio
    value_score: float
    reason: str
    fixture_info: str
    is_rising: bool  # Price rising


class DifferentialFinder:
    """Agent for finding low-owned high-value players."""
    
    MAX_OWNERSHIP = 10.0  # Max 10% for differential
    MIN_XPTS = 3.5  # Min expected points
    
    def __init__(self, data_agent: FPLDataIngestion, predictor: PointsPredictionAgent):
        self.data = data_agent
        self.predictor = predictor
        self.differentials: list[Differential] = []
    
    def find_differentials(self, max_ownership: float = None, min_xpts: float = None) -> list[Differential]:
        """Find differential players."""
        max_own = max_ownership or self.MAX_OWNERSHIP
        min_pts = min_xpts or self.MIN_XPTS
        
        self.differentials = []
        
        for player in self.data.players:
            if player.status != "a":
                continue
            
            ownership = player.selected_by_percent
            if ownership > max_own:
                continue
            
            prediction = self.predictor.predictions.get(player.id)
            if not prediction or prediction.expected_points < min_pts:
                continue
            
            diff = self._create_differential(player, prediction)
            self.differentials.append(diff)
        
        # Sort by differential score
        self.differentials.sort(key=lambda x: x.differential_score, reverse=True)
        return self.differentials
    
    def _create_differential(self, player: Player, prediction) -> Differential:
        """Create differential analysis for a player."""
        ownership = max(player.selected_by_percent, 0.1)  # Avoid division by zero
        xpts = prediction.expected_points
        
        # Differential score: xPts per % ownership
        diff_score = xpts / ownership * 10  # Scale up
        
        # Value score
        value_score = xpts / player.price if player.price > 0 else 0
        
        # Detect price risers (using transfers in as proxy)
        is_rising = player.transfers_in_event > player.transfers_out_event
        
        # Generate reason
        reason = self._generate_reason(player, prediction, is_rising)
        
        return Differential(
            player_id=player.id,
            player_name=player.web_name,
            team=player.team_name,
            position=player.position,
            price=player.price,
            ownership=ownership,
            xpts=xpts,
            differential_score=round(diff_score, 2),
            value_score=round(value_score, 3),
            reason=reason,
            fixture_info=prediction.fixture_info,
            is_rising=is_rising
        )
    
    def _generate_reason(self, player: Player, prediction, is_rising: bool) -> str:
        """Generate reason why this player is a good differential."""
        reasons = []
        
        if prediction.expected_points > 5:
            reasons.append("High xPts")
        
        if player.selected_by_percent < 3:
            reasons.append("Very low ownership")
        
        if prediction.form_trend == "rising":
            reasons.append("Form rising")
        
        if "FDR:1" in prediction.fixture_info or "FDR:2" in prediction.fixture_info:
            reasons.append("Easy fixture")
        
        if is_rising:
            reasons.append("📈 Price rising")
        
        if prediction.minutes_tag == "Nailed":
            reasons.append("Nailed starter")
        
        return " | ".join(reasons) if reasons else "Good value pick"
    
    def get_by_position(self, position: str) -> list[Differential]:
        """Get differentials filtered by position."""
        return [d for d in self.differentials if d.position == position]
    
    def get_budget_differentials(self, max_price: float = 6.5) -> list[Differential]:
        """Get budget-friendly differentials."""
        return sorted(
            [d for d in self.differentials if d.price <= max_price],
            key=lambda x: x.value_score,
            reverse=True
        )
    
    def get_premium_differentials(self, min_price: float = 8.0) -> list[Differential]:
        """Get premium differentials (expensive but low-owned)."""
        return [d for d in self.differentials if d.price >= min_price]
    
    def to_dict(self) -> dict:
        """Export as JSON-friendly dict."""
        if not self.differentials:
            self.find_differentials()
        
        return {
            "total_found": len(self.differentials),
            "top_differentials": [
                {
                    "id": d.player_id,
                    "name": d.player_name,
                    "team": d.team,
                    "position": d.position,
                    "price": d.price,
                    "ownership": d.ownership,
                    "xpts": d.xpts,
                    "differential_score": d.differential_score,
                    "value_score": d.value_score,
                    "reason": d.reason,
                    "fixture": d.fixture_info,
                    "is_rising": d.is_rising
                }
                for d in self.differentials[:20]
            ],
            "by_position": {
                "GKP": [{"name": d.player_name, "ownership": d.ownership, "xpts": d.xpts} 
                        for d in self.get_by_position("GKP")[:5]],
                "DEF": [{"name": d.player_name, "ownership": d.ownership, "xpts": d.xpts} 
                        for d in self.get_by_position("DEF")[:5]],
                "MID": [{"name": d.player_name, "ownership": d.ownership, "xpts": d.xpts} 
                        for d in self.get_by_position("MID")[:5]],
                "FWD": [{"name": d.player_name, "ownership": d.ownership, "xpts": d.xpts} 
                        for d in self.get_by_position("FWD")[:5]],
            },
            "budget_gems": [
                {"name": d.player_name, "price": d.price, "ownership": d.ownership, "xpts": d.xpts}
                for d in self.get_budget_differentials()[:10]
            ]
        }


if __name__ == "__main__":
    from .player_form import PlayerFormAgent
    from .minutes_risk import MinutesRiskAgent
    from .fixture_analysis import FixtureAnalysisAgent
    
    print("💎 Testing Differential Finder...")
    
    data = FPLDataIngestion()
    data.ingest_all_data()
    
    form = PlayerFormAgent(data)
    form.analyze_all_players()
    
    minutes = MinutesRiskAgent(data)
    minutes.analyze_all_players()
    
    fixtures = FixtureAnalysisAgent(data)
    fixtures.analyze_all_players()
    
    predictor = PointsPredictionAgent(data, form, minutes, fixtures)
    predictor.predict_all_players()
    
    finder = DifferentialFinder(data, predictor)
    diffs = finder.find_differentials()
    
    print(f"\n💎 Top 10 Differentials (<10% owned):")
    for d in diffs[:10]:
        rising = "📈" if d.is_rising else ""
        print(f"  {d.player_name} ({d.team}) - {d.ownership:.1f}% | {d.xpts:.1f} xPts | {d.reason} {rising}")
