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
        
        # Games completed this season (0 at the GW1 deadline)
        self.games_played = max(self.data.current_gw - 1, 0)
    
    def _effective_chance(self, player: Player) -> int:
        """FPL often stores 0/null chance with no news — that is not 'won't play'."""
        raw = player.chance_of_playing
        news = (player.news or "").strip()
        if player.status == "i":
            return int(raw) if raw is not None else 0
        if player.status == "s":
            return 0
        if player.status == "d":
            return int(raw) if raw is not None else 50
        # status == available (and similar)
        if raw is None:
            return 100
        if raw == 0 and not news:
            return 100
        return int(raw)

    def analyze_player(self, player: Player) -> MinutesAnalysis:
        """Analyze minutes risk for a player."""
        
        matches_approx = player.minutes / 90 if player.minutes > 0 else 0
        starts_approx = int(matches_approx * 0.9)
        denom = max(self.games_played, 1)
        minutes_per_match = player.minutes / denom if self.games_played else 0
        chance = self._effective_chance(player)
        news = (player.news or "").strip()
        template = player.selected_by_percent >= 10 or player.price >= 8.0
        
        if player.status == "i":
            expected_minutes = 0
            tag = "Injured"
        elif player.status == "s":
            expected_minutes = 0
            tag = "Suspended"
        elif player.status not in ("a", "d"):
            expected_minutes = 0
            tag = "Unknown"
        else:
            if self.games_played == 0 and player.minutes == 0:
                # GW1: ownership/price is the only real signal of who starts
                if template or player.selected_by_percent >= 8 or player.price >= 6.5:
                    expected_minutes = 85
                    tag = "Nailed"
                elif player.price >= 4.5 and player.selected_by_percent >= 2:
                    expected_minutes = 75
                    tag = "Nailed"
                elif player.price >= 4.5:
                    expected_minutes = 60
                    tag = "Rotation Risk"
                else:
                    expected_minutes = 45
                    tag = "Rotation Risk"
            elif minutes_per_match >= 80:
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
                if template:
                    expected_minutes = 75
                    tag = "Nailed"

            # Soft-weight doubts. Do not re-tag Haaland-level players as unused.
            if chance < 100:
                expected_minutes *= max(chance, 50) / 100
            if chance <= 25 and news:
                tag = "Injured" if "injur" in news.lower() or "knock" in news.lower() else "Minutes-Managed"
                expected_minutes = min(expected_minutes, 20)
            elif chance <= 50 and news and not template:
                tag = "Rotation Risk"
            elif player.status == "d" and not template:
                tag = "Rotation Risk"
        
        low = max(0, expected_minutes - 20)
        high = min(90, expected_minutes + 15)
        
        if player.minutes >= 900:
            confidence = 90
        elif player.minutes >= 450:
            confidence = 70
        elif player.minutes >= 180:
            confidence = 50
        elif self.games_played == 0 and tag == "Nailed":
            confidence = 55
        else:
            confidence = 35
        
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
