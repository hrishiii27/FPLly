"""
FPL-Agent: Ownership Analyzer
Analyzes player ownership and effective ownership for differential decisions.
"""

from dataclasses import dataclass
from .data_ingestion import FPLDataIngestion, Player
from .points_predictor import PointsPredictionAgent


@dataclass
class OwnershipAnalysis:
    """Analysis of a player's ownership status."""
    player_id: int
    player_name: str
    team: str
    position: str
    price: float
    ownership: float  # Percentage (0-100)
    is_template: bool  # >25% owned
    is_differential: bool  # <10% owned
    is_essential: bool  # High ownership + high xPts
    xpts: float
    eo_risk: str  # Risk if not owning this player


@dataclass
class EffectiveOwnership:
    """Effective ownership calculation for captain decisions."""
    player_id: int
    player_name: str
    ownership: float
    captain_ownership: float  # Estimated % who will captain
    effective_ownership: float  # ownership + captain_ownership
    relative_eo: str  # Above/below average


class OwnershipAnalyzer:
    """Agent for analyzing ownership and effective ownership."""
    
    TEMPLATE_THRESHOLD = 25.0  # >25% = template
    DIFFERENTIAL_THRESHOLD = 10.0  # <10% = differential
    ESSENTIAL_THRESHOLD = 40.0  # >40% = essential
    
    def __init__(self, data_agent: FPLDataIngestion, predictor: PointsPredictionAgent = None):
        self.data = data_agent
        self.predictor = predictor
        self.analyses: dict[int, OwnershipAnalysis] = {}
    
    def analyze_all_players(self) -> list[OwnershipAnalysis]:
        """Analyze ownership for all players."""
        results = []
        
        for player in self.data.players:
            if player.status == "a" and player.minutes > 0:
                analysis = self._analyze_player(player)
                self.analyses[player.id] = analysis
                results.append(analysis)
        
        return sorted(results, key=lambda x: x.ownership, reverse=True)
    
    def _analyze_player(self, player: Player) -> OwnershipAnalysis:
        """Analyze ownership for a single player."""
        ownership = player.selected_by_percent
        
        is_template = ownership >= self.TEMPLATE_THRESHOLD
        is_differential = ownership < self.DIFFERENTIAL_THRESHOLD
        
        # Get xPts if predictor available
        xpts = 0.0
        if self.predictor and player.id in self.predictor.predictions:
            xpts = self.predictor.predictions[player.id].expected_points
        
        is_essential = ownership >= self.ESSENTIAL_THRESHOLD and xpts > 5.0
        
        # Calculate EO risk
        eo_risk = self._calculate_eo_risk(ownership, xpts, is_essential)
        
        return OwnershipAnalysis(
            player_id=player.id,
            player_name=player.web_name,
            team=player.team_name,
            position=player.position,
            price=player.price,
            ownership=ownership,
            is_template=is_template,
            is_differential=is_differential,
            is_essential=is_essential,
            xpts=xpts,
            eo_risk=eo_risk
        )
    
    def _calculate_eo_risk(self, ownership: float, xpts: float, is_essential: bool) -> str:
        """Calculate risk of not owning a player."""
        if is_essential:
            return "HIGH RISK - Essential player, big haul hurts rank"
        elif ownership > 30 and xpts > 5:
            return "MEDIUM RISK - Popular pick with good fixture"
        elif ownership > 15:
            return "LOW RISK - Template player"
        else:
            return "DIFFERENTIAL - Low EO, haul helps rank"
    
    def get_template_players(self, min_ownership: float = 25.0) -> list[OwnershipAnalysis]:
        """Get most owned template players."""
        return sorted(
            [a for a in self.analyses.values() if a.ownership >= min_ownership],
            key=lambda x: x.ownership,
            reverse=True
        )
    
    def get_essential_players(self) -> list[OwnershipAnalysis]:
        """Get essential must-have players."""
        return [a for a in self.analyses.values() if a.is_essential]
    
    def get_avoid_list(self) -> list[OwnershipAnalysis]:
        """Get highly owned players underperforming - risky to own."""
        avoid = []
        for a in self.analyses.values():
            if a.ownership > 20 and a.xpts < 3.0:
                avoid.append(a)
        return sorted(avoid, key=lambda x: x.ownership, reverse=True)
    
    def calculate_effective_ownership(self, player_id: int, captain_rate: float = 0.15) -> EffectiveOwnership:
        """Calculate effective ownership including captaincy."""
        analysis = self.analyses.get(player_id)
        if not analysis:
            return None
        
        # Estimate captain ownership (top players get more captaincy)
        captain_pct = analysis.ownership * captain_rate
        if analysis.xpts > 7:
            captain_pct *= 2.0  # Premium captains
        elif analysis.xpts > 5:
            captain_pct *= 1.5
        
        eo = analysis.ownership + captain_pct
        
        return EffectiveOwnership(
            player_id=player_id,
            player_name=analysis.player_name,
            ownership=analysis.ownership,
            captain_ownership=round(captain_pct, 1),
            effective_ownership=round(eo, 1),
            relative_eo="Above average" if eo > 30 else "Average" if eo > 15 else "Below average"
        )
    
    def to_dict(self) -> dict:
        """Export analysis as JSON-friendly dict."""
        template = self.get_template_players()[:15]
        essential = self.get_essential_players()
        avoid = self.get_avoid_list()[:10]
        
        return {
            "summary": {
                "total_analyzed": len(self.analyses),
                "template_count": len([a for a in self.analyses.values() if a.is_template]),
                "differential_count": len([a for a in self.analyses.values() if a.is_differential]),
                "essential_count": len(essential)
            },
            "template_players": [
                {
                    "id": a.player_id,
                    "name": a.player_name,
                    "team": a.team,
                    "position": a.position,
                    "ownership": a.ownership,
                    "xpts": a.xpts,
                    "is_essential": a.is_essential,
                    "risk": a.eo_risk
                }
                for a in template
            ],
            "essential_players": [
                {
                    "id": a.player_id,
                    "name": a.player_name,
                    "ownership": a.ownership,
                    "xpts": a.xpts,
                    "risk": a.eo_risk
                }
                for a in essential[:10]
            ],
            "avoid_list": [
                {
                    "id": a.player_id,
                    "name": a.player_name,
                    "ownership": a.ownership,
                    "xpts": a.xpts,
                    "reason": "High ownership but low xPts"
                }
                for a in avoid
            ]
        }


if __name__ == "__main__":
    print("👥 Testing Ownership Analyzer...")
    
    data = FPLDataIngestion()
    data.ingest_all_data()
    
    analyzer = OwnershipAnalyzer(data)
    analyzer.analyze_all_players()
    
    print(f"\n📊 Template Players (>25% owned):")
    for a in analyzer.get_template_players()[:10]:
        status = "⭐ ESSENTIAL" if a.is_essential else ""
        print(f"  {a.player_name} ({a.team}) - {a.ownership:.1f}% {status}")
    
    print(f"\n⚠️ Avoid List:")
    for a in analyzer.get_avoid_list()[:5]:
        print(f"  {a.player_name} - {a.ownership:.1f}% owned, only {a.xpts:.1f} xPts")
