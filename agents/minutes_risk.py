"""
FPL-Agent: Minutes & Rotation Risk Agent
Predicts expected minutes and flags rotation risks.
"""

from dataclasses import dataclass
from typing import Literal
from .data_ingestion import Player, FPLDataIngestion


MinutesTag = Literal["Nailed", "Rotation Risk", "Minutes-Managed", "Injured", "Suspended", "Unknown"]


@dataclass
class MinutesAnalysis:
    """Minutes risk analysis for a player."""
    player_id: int
    player_name: str
    team: str
    position: str
    
    # Minutes data
    total_minutes: int
    matches_played: int  # Approximate based on minutes
    starts: int  # Approximate
    minutes_per_match: float
    
    # Expected minutes for next GW
    expected_minutes: float
    expected_minutes_range: tuple[float, float]  # (low, high)
    
    # Risk tag
    tag: MinutesTag
    
    # Availability
    chance_of_playing: int  # 0-100
    is_available: bool
    injury_news: str
    
    # Confidence
    confidence: float  # 0-100


class MinutesRiskAgent:
    """Agent for predicting minutes and rotation risk."""
    
    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        self.analyses: dict[int, MinutesAnalysis] = {}
        
        # Games played so far this season (approximate)
        self.games_played = max(self.data.current_gw - 1, 1)
    
    def analyze_player(self, player: Player) -> MinutesAnalysis:
        """Analyze minutes risk for a player."""
        
        # Calculate matches and starts
        matches_approx = player.minutes / 90 if player.minutes > 0 else 0
        starts_approx = int(matches_approx * 0.9)  # Rough estimate
        minutes_per_match = player.minutes / max(self.games_played, 1)
        
        # Determine expected minutes
        if player.status == "i":
            expected_minutes = 0
            tag = "Injured"
            chance = player.chance_of_playing or 0
        elif player.status == "s":
            expected_minutes = 0
            tag = "Suspended"
            chance = 0
        elif player.status != "a":
            expected_minutes = 0
            tag = "Unknown"
            chance = player.chance_of_playing or 0
        else:
            chance = player.chance_of_playing if player.chance_of_playing is not None else 100
            
            # Calculate expected minutes based on historical average
            if minutes_per_match >= 80:
                expected_minutes = 90
                tag = "Nailed"
            elif minutes_per_match >= 60:
                expected_minutes = 75
                tag = "Nailed"
            elif minutes_per_match >= 40:
                expected_minutes = 60
                tag = "Rotation Risk"
            elif minutes_per_match >= 20:
                expected_minutes = 45
                tag = "Rotation Risk"
            else:
                expected_minutes = 20
                tag = "Minutes-Managed"
            
            # Adjust for chance of playing
            if chance < 100:
                expected_minutes *= (chance / 100)
                if chance <= 50:
                    tag = "Injured" if "injury" in player.news.lower() else "Minutes-Managed"
        
        # Calculate range
        low = max(0, expected_minutes - 20)
        high = min(90, expected_minutes + 15)
        
        # Confidence based on data availability
        if player.minutes >= 900:
            confidence = 90
        elif player.minutes >= 450:
            confidence = 70
        elif player.minutes >= 180:
            confidence = 50
        else:
            confidence = 30
        
        analysis = MinutesAnalysis(
            player_id=player.id,
            player_name=player.web_name,
            team=player.team_name,
            position=player.position,
            total_minutes=player.minutes,
            matches_played=int(matches_approx),
            starts=starts_approx,
            minutes_per_match=round(minutes_per_match, 1),
            expected_minutes=round(expected_minutes, 1),
            expected_minutes_range=(round(low, 1), round(high, 1)),
            tag=tag,
            chance_of_playing=chance,
            is_available=player.status == "a" and chance >= 75,
            injury_news=player.news,
            confidence=confidence
        )
        
        self.analyses[player.id] = analysis
        return analysis
    
    def analyze_all_players(self) -> list[MinutesAnalysis]:
        """Analyze minutes for all players."""
        results = []
        for player in self.data.players:
            analysis = self.analyze_player(player)
            results.append(analysis)
        
        return results
    
    def get_nailed_players(self) -> list[MinutesAnalysis]:
        """Get players who are nailed on for 90 minutes."""
        return [
            a for a in self.analyses.values()
            if a.tag == "Nailed" and a.is_available
        ]
    
    def get_rotation_risks(self) -> list[MinutesAnalysis]:
        """Get players with rotation risk."""
        return [
            a for a in self.analyses.values()
            if a.tag == "Rotation Risk"
        ]
    
    def get_injured_players(self) -> list[MinutesAnalysis]:
        """Get injured/doubtful players."""
        return [
            a for a in self.analyses.values()
            if a.tag in ["Injured", "Suspended"] or a.chance_of_playing < 75
        ]
    
    def get_minutes_factor(self, player_id: int) -> float:
        """Get a minutes factor (0-1) for use in predictions."""
        if player_id not in self.analyses:
            return 0.5
        
        a = self.analyses[player_id]
        return a.expected_minutes / 90 * (a.chance_of_playing / 100)


if __name__ == "__main__":
    # Test the minutes agent
    data_agent = FPLDataIngestion()
    data_agent.ingest_all_data()
    
    minutes_agent = MinutesRiskAgent(data_agent)
    minutes_agent.analyze_all_players()
    
    print("\n✅ Nailed Players (Top 15):")
    print("-" * 60)
    nailed = minutes_agent.get_nailed_players()
    nailed_sorted = sorted(nailed, key=lambda x: x.minutes_per_match, reverse=True)[:15]
    for a in nailed_sorted:
        print(f"{a.player_name:15} ({a.team}) {a.position} | Avg: {a.minutes_per_match:.0f}min | Expected: {a.expected_minutes:.0f}")
    
    print("\n⚠️ Rotation Risks:")
    print("-" * 60)
    for a in minutes_agent.get_rotation_risks()[:10]:
        print(f"{a.player_name:15} ({a.team}) | Avg: {a.minutes_per_match:.0f}min | Expected: {a.expected_minutes:.0f}")
    
    print("\n🏥 Injured/Doubtful:")
    print("-" * 60)
    injured = [a for a in minutes_agent.get_injured_players() if a.injury_news][:10]
    for a in injured:
        print(f"{a.player_name:15} ({a.team}) | {a.chance_of_playing}% | {a.injury_news[:40]}")
