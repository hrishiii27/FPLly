"""
FPL-Agent: Fixture & Opponent Agent
Analyzes upcoming fixtures and opponent strength.
"""

from dataclasses import dataclass
from typing import Literal
from .data_ingestion import Player, Team, Fixture, FPLDataIngestion


FixtureRating = Literal["Easy", "Medium", "Hard", "Very Hard"]


@dataclass
class FixtureAnalysis:
    """Fixture analysis for a player's team."""
    player_id: int
    player_name: str
    team: str
    team_id: int
    
    # Next GW fixture
    next_opponent: str
    next_opponent_id: int
    next_gw: int
    is_home: bool
    fdr: int  # Fixture Difficulty Rating 1-5
    rating: FixtureRating
    
    # Opponent analysis
    opponent_attack_strength: int
    opponent_defence_strength: int
    
    # Multi-GW analysis (next 5 GWs)
    fixture_run: list[dict]  # [{gw, opp, home, fdr}]
    avg_fdr_5gw: float
    easy_fixtures_count: int  # FDR 1-2
    hard_fixtures_count: int  # FDR 4-5
    fixture_swing_score: float  # Higher = better fixture run
    
    # Double/Blank gameweek flags
    has_double_gw: bool
    has_blank_gw: bool
    
    # Next-GW specific fixture count (0=BGW, 1=normal, 2=DGW)
    next_gw_fixture_count: int


class FixtureAnalysisAgent:
    """Agent for analyzing fixtures and opponent strength."""
    
    def __init__(self, data_agent: FPLDataIngestion, horizon: int = 5):
        self.data = data_agent
        self.horizon = horizon
        self.analyses: dict[int, FixtureAnalysis] = {}
    
    def _fdr_to_rating(self, fdr: int) -> FixtureRating:
        """Convert FDR number to rating string."""
        if fdr <= 2:
            return "Easy"
        elif fdr == 3:
            return "Medium"
        elif fdr == 4:
            return "Hard"
        else:
            return "Very Hard"
    
    def _get_fixture_run(self, team_id: int) -> list[dict]:
        """Get fixture run for a team over the horizon."""
        fixtures = []
        
        for gw in range(self.data.next_gw, self.data.next_gw + self.horizon):
            gw_fixtures = [
                f for f in self.data.fixtures
                if f.event == gw and (f.team_h == team_id or f.team_a == team_id)
            ]
            
            for f in gw_fixtures:
                if f.team_h == team_id:
                    opp = self.data.teams.get(f.team_a)
                    fixtures.append({
                        "gw": gw,
                        "opponent": opp.short_name if opp else "???",
                        "opponent_id": f.team_a,
                        "home": True,
                        "fdr": f.team_h_difficulty
                    })
                else:
                    opp = self.data.teams.get(f.team_h)
                    fixtures.append({
                        "gw": gw,
                        "opponent": opp.short_name if opp else "???",
                        "opponent_id": f.team_h,
                        "home": False,
                        "fdr": f.team_a_difficulty
                    })
        
        return sorted(fixtures, key=lambda x: x["gw"])
    
    def analyze_player(self, player: Player) -> FixtureAnalysis:
        """Analyze fixtures for a player's team."""
        
        fixture_run = self._get_fixture_run(player.team_id)
        
        # Count how many fixtures this team has in the immediate next GW
        next_gw_fixtures = [f for f in fixture_run if f["gw"] == self.data.next_gw]
        next_gw_fixture_count = len(next_gw_fixtures)
        
        # Handle case where no fixtures found at all
        if not fixture_run:
            return FixtureAnalysis(
                player_id=player.id,
                player_name=player.web_name,
                team=player.team_name,
                team_id=player.team_id,
                next_opponent="BLANK",
                next_opponent_id=0,
                next_gw=self.data.next_gw,
                is_home=True,
                fdr=3,
                rating="Medium",
                opponent_attack_strength=1100,
                opponent_defence_strength=1100,
                fixture_run=[],
                avg_fdr_5gw=3.0,
                easy_fixtures_count=0,
                hard_fixtures_count=0,
                fixture_swing_score=50.0,
                has_double_gw=False,
                has_blank_gw=True,
                next_gw_fixture_count=0
            )
        
        # Handle BGW: team has future fixtures but NOT in next_gw
        if next_gw_fixture_count == 0:
            # Use the first future fixture for analysis context
            first_future = fixture_run[0]
            next_opp = self.data.teams.get(first_future["opponent_id"])
            return FixtureAnalysis(
                player_id=player.id,
                player_name=player.web_name,
                team=player.team_name,
                team_id=player.team_id,
                next_opponent="BLANK",
                next_opponent_id=0,
                next_gw=self.data.next_gw,
                is_home=True,
                fdr=3,
                rating="Medium",
                opponent_attack_strength=1100,
                opponent_defence_strength=1100,
                fixture_run=fixture_run,
                avg_fdr_5gw=sum(f["fdr"] for f in fixture_run) / len(fixture_run),
                easy_fixtures_count=len([f for f in fixture_run if f["fdr"] <= 2]),
                hard_fixtures_count=len([f for f in fixture_run if f["fdr"] >= 4]),
                fixture_swing_score=50.0,
                has_double_gw=any(len([g for g in fixture_run if g["gw"] == gw]) > 1 for gw in set(f["gw"] for f in fixture_run)),
                has_blank_gw=True,
                next_gw_fixture_count=0
            )
        
        # Next fixture analysis
        next_fix = fixture_run[0]
        next_opp = self.data.teams.get(next_fix["opponent_id"])
        
        opp_attack = 1100
        opp_defence = 1100
        if next_opp:
            if next_fix["home"]:
                opp_attack = next_opp.strength_attack_away
                opp_defence = next_opp.strength_defence_away
            else:
                opp_attack = next_opp.strength_attack_home
                opp_defence = next_opp.strength_defence_home
        
        # Calculate FDR stats
        fdrs = [f["fdr"] for f in fixture_run]
        avg_fdr = sum(fdrs) / len(fdrs) if fdrs else 3.0
        easy_count = len([f for f in fdrs if f <= 2])
        hard_count = len([f for f in fdrs if f >= 4])
        
        # Fixture swing score (0-100, higher = better)
        # 5 games with FDR 1 = 100, 5 games with FDR 5 = 0
        fixture_swing = ((5 - avg_fdr) / 4) * 100
        
        # Check for double/blank GWs
        gw_counts = {}
        for f in fixture_run:
            gw_counts[f["gw"]] = gw_counts.get(f["gw"], 0) + 1
        
        has_double = any(count > 1 for count in gw_counts.values())
        expected_gws = set(range(self.data.next_gw, self.data.next_gw + self.horizon))
        actual_gws = set(gw_counts.keys())
        has_blank = len(expected_gws - actual_gws) > 0
        
        analysis = FixtureAnalysis(
            player_id=player.id,
            player_name=player.web_name,
            team=player.team_name,
            team_id=player.team_id,
            next_opponent=next_fix["opponent"],
            next_opponent_id=next_fix["opponent_id"],
            next_gw=next_fix["gw"],
            is_home=next_fix["home"],
            fdr=next_fix["fdr"],
            rating=self._fdr_to_rating(next_fix["fdr"]),
            opponent_attack_strength=opp_attack,
            opponent_defence_strength=opp_defence,
            fixture_run=fixture_run,
            avg_fdr_5gw=round(avg_fdr, 2),
            easy_fixtures_count=easy_count,
            hard_fixtures_count=hard_count,
            fixture_swing_score=round(fixture_swing, 1),
            has_double_gw=has_double,
            has_blank_gw=has_blank,
            next_gw_fixture_count=next_gw_fixture_count
        )
        
        self.analyses[player.id] = analysis
        return analysis
    
    def analyze_all_players(self) -> list[FixtureAnalysis]:
        """Analyze fixtures for all players."""
        results = []
        for player in self.data.players:
            if player.status == "a":
                analysis = self.analyze_player(player)
                results.append(analysis)
        
        return results
    
    def get_best_fixture_teams(self, n: int = 10) -> list[dict]:
        """Get teams with the best fixture runs."""
        team_fixtures = {}
        
        for a in self.analyses.values():
            if a.team_id not in team_fixtures:
                team_fixtures[a.team_id] = {
                    "team": a.team,
                    "team_id": a.team_id,
                    "avg_fdr": a.avg_fdr_5gw,
                    "swing_score": a.fixture_swing_score,
                    "fixture_run": a.fixture_run
                }
        
        sorted_teams = sorted(team_fixtures.values(), key=lambda x: x["swing_score"], reverse=True)
        return sorted_teams[:n]
    
    def get_fixture_factor(self, player_id: int) -> float:
        """Get a fixture factor (0-1) for use in predictions."""
        if player_id not in self.analyses:
            return 0.5
        
        a = self.analyses[player_id]
        # Convert FDR 1-5 to factor 1.0-0.6
        fdr_factor = 1.0 - ((a.fdr - 1) * 0.1)
        # Boost for home games
        home_factor = 1.1 if a.is_home else 1.0
        
        return min(1.0, fdr_factor * home_factor)
    
    def format_fixture_run(self, player_id: int) -> str:
        """Format fixture run as a string for display."""
        if player_id not in self.analyses:
            return "No fixtures"
        
        fixtures = self.analyses[player_id].fixture_run[:5]
        parts = []
        for f in fixtures:
            venue = "H" if f["home"] else "A"
            fdr_color = "🟢" if f["fdr"] <= 2 else ("🟡" if f["fdr"] == 3 else "🔴")
            parts.append(f"{f['opponent']}({venue}){fdr_color}")
        
        return " → ".join(parts)


if __name__ == "__main__":
    # Test the fixture agent
    data_agent = FPLDataIngestion()
    data_agent.ingest_all_data()
    
    fixture_agent = FixtureAnalysisAgent(data_agent)
    fixture_agent.analyze_all_players()
    
    print("\n🏆 Teams with Best Fixture Runs:")
    print("-" * 70)
    for team in fixture_agent.get_best_fixture_teams(10):
        run = " ".join([f"{f['opponent']}({f['fdr']})" for f in team["fixture_run"][:5]])
        print(f"{team['team']:15} | Avg FDR: {team['avg_fdr']:.1f} | Score: {team['swing_score']:.0f} | {run}")
    
    # Show fixture run for a popular player
    print("\n📅 Sample Fixture Runs:")
    print("-" * 70)
    sample_players = [p for p in data_agent.players if p.form > 5][:5]
    for p in sample_players:
        run = fixture_agent.format_fixture_run(p.id)
        print(f"{p.web_name:15} ({p.team_name}) | {run}")
