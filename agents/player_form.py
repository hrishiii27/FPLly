"""
FPL-Agent: Player Form & Role Agent
Analyzes player form metrics, xG/xA trends, and role detection.
"""

from dataclasses import dataclass
from typing import Optional
from .data_ingestion import Player, FPLDataIngestion


@dataclass
class FormAnalysis:
    """Form analysis result for a player."""
    player_id: int
    player_name: str
    team: str
    position: str
    
    # Form metrics
    form_score: float  # FPL official form (last 30 days)
    form_trend: str  # "rising", "stable", "falling"
    
    # Expected stats per 90
    xg_per_90: float
    xa_per_90: float
    xgi_per_90: float
    
    # Involvement rates
    goal_involvement: float  # Goals + Assists vs team's total
    
    # Set piece detection
    is_set_piece_taker: bool
    corners_and_freekicks_text: str
    penalties_order: Optional[int]
    
    # Over/Under performance
    goals_vs_xg: float  # Positive = overperforming
    assists_vs_xa: float
    
    # Confidence
    confidence_score: float  # 0-100, based on sample size
    
    # Flags
    is_overperforming: bool
    is_underperforming: bool
    minutes_sample: int


class PlayerFormAgent:
    """Agent for analyzing player form and roles."""
    
    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        self.analyses: dict[int, FormAnalysis] = {}
        self.player_histories: dict[int, list] = {}
    
    def analyze_player(self, player: Player) -> FormAnalysis:
        """Perform form analysis on a single player."""
        
        # Calculate season per-90 stats (avoid division by zero)
        minutes_90 = max(player.minutes / 90, 0.1)
        
        xg_per_90 = player.expected_goals / minutes_90 if minutes_90 > 0 else 0
        xa_per_90 = player.expected_assists / minutes_90 if minutes_90 > 0 else 0
        xgi_per_90 = player.expected_goal_involvements / minutes_90 if minutes_90 > 0 else 0
        
        # Integrate Short-Term Underlying Form (last 4 matches) if available
        history = getattr(self, "player_histories", {}).get(player.id, [])
        recent = history[-4:] if history else []
        
        if recent:
            recent_mins = sum(r.get("minutes", 0) for r in recent)
            if recent_mins > 0:
                xg_recent = sum(float(r.get("expected_goals", 0)) for r in recent)
                xa_recent = sum(float(r.get("expected_assists", 0)) for r in recent)
                xgi_recent = sum(float(r.get("expected_goal_involvements", 0)) for r in recent)
                
                # Calculate recent per-90 metrics
                xg_per_90_recent = (xg_recent / recent_mins) * 90
                xa_per_90_recent = (xa_recent / recent_mins) * 90
                xgi_per_90_recent = (xgi_recent / recent_mins) * 90
                
                # Blend recent form and season form (70% weight to short-term form)
                xg_per_90 = (xg_per_90_recent * 0.7) + (xg_per_90 * 0.3)
                xa_per_90 = (xa_per_90_recent * 0.7) + (xa_per_90 * 0.3)
                xgi_per_90 = (xgi_per_90_recent * 0.7) + (xgi_per_90 * 0.3)
        
        # Over/Under performance
        goals_vs_xg = player.goals_scored - player.expected_goals
        assists_vs_xa = player.assists - player.expected_assists
        
        # Determine form trend based on comparing form to points_per_game
        if player.form > player.points_per_game * 1.2:
            form_trend = "rising"
        elif player.form < player.points_per_game * 0.8:
            form_trend = "falling"
        else:
            form_trend = "stable"
        
        # Confidence score based on minutes played
        if player.minutes >= 1500:
            confidence_score = 95
        elif player.minutes >= 900:
            confidence_score = 80
        elif player.minutes >= 450:
            confidence_score = 60
        elif player.minutes >= 180:
            confidence_score = 40
        else:
            confidence_score = 20
        
        # Overperformance detection (significant deviation from xG/xA)
        is_overperforming = (goals_vs_xg > 2) or (assists_vs_xa > 2)
        is_underperforming = (goals_vs_xg < -2) or (assists_vs_xa < -2)
        
        # Goal involvement (rough estimate)
        goal_involvement = (player.goals_scored + player.assists) / max(player.minutes / 90, 1)
        
        analysis = FormAnalysis(
            player_id=player.id,
            player_name=player.web_name,
            team=player.team_name,
            position=player.position,
            form_score=player.form,
            form_trend=form_trend,
            xg_per_90=round(xg_per_90, 2),
            xa_per_90=round(xa_per_90, 2),
            xgi_per_90=round(xgi_per_90, 2),
            goal_involvement=round(goal_involvement, 2),
            is_set_piece_taker=False,  # Would need penalty/corner data
            corners_and_freekicks_text="",
            penalties_order=None,
            goals_vs_xg=round(goals_vs_xg, 2),
            assists_vs_xa=round(assists_vs_xa, 2),
            confidence_score=confidence_score,
            is_overperforming=is_overperforming,
            is_underperforming=is_underperforming,
            minutes_sample=player.minutes
        )
        
        self.analyses[player.id] = analysis
        return analysis
    
    def analyze_all_players(self) -> list[FormAnalysis]:
        """Analyze form for all available players."""
        import concurrent.futures
        
        # Pre-fetch history for relevant players (e.g. > 1% ownership or > 30 points)
        relevant_players = [
            p for p in self.data.players 
            if p.status == "a" and p.minutes > 0 and (p.selected_by_percent > 1.0 or p.total_points > 30)
        ]
        
        print(f"📊 Fetching granular match history for {len(relevant_players)} relevant players...")
        self.player_histories = {}
        
        def fetch_history(player: Player):
            try:
                hist = self.data.fetch_player_history(player.id)
                return player.id, hist.get("history", [])
            except Exception:
                return player.id, []
                
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_player = {executor.submit(fetch_history, p): p for p in relevant_players}
            for future in concurrent.futures.as_completed(future_to_player):
                pid, history = future.result()
                self.player_histories[pid] = history
                
        results = []
        for player in self.data.players:
            if player.status == "a" and player.minutes > 0:
                analysis = self.analyze_player(player)
                results.append(analysis)
        
        return sorted(results, key=lambda x: x.form_score, reverse=True)
    
    def get_hot_players(self, min_form: float = 5.0, min_minutes: int = 270) -> list[FormAnalysis]:
        """Get players in excellent form."""
        return [
            a for a in self.analyses.values()
            if a.form_score >= min_form and a.minutes_sample >= min_minutes
        ]
    
    def get_rising_players(self) -> list[FormAnalysis]:
        """Get players with rising form trend."""
        return [
            a for a in self.analyses.values()
            if a.form_trend == "rising" and a.confidence_score >= 40
        ]
    
    def get_overperformers(self) -> list[FormAnalysis]:
        """Get players overperforming their xG/xA - potential regression candidates."""
        return [
            a for a in self.analyses.values()
            if a.is_overperforming and a.confidence_score >= 60
        ]
    
    def get_underperformers(self) -> list[FormAnalysis]:
        """Get players underperforming their xG/xA - potential value picks."""
        return [
            a for a in self.analyses.values()
            if a.is_underperforming and a.confidence_score >= 60
        ]
    
    def get_form_vector(self, player_id: int) -> dict:
        """Get a form vector for use in predictions."""
        if player_id not in self.analyses:
            return {}
        
        a = self.analyses[player_id]
        return {
            "form": a.form_score,
            "trend": 1 if a.form_trend == "rising" else (-1 if a.form_trend == "falling" else 0),
            "xgi_per_90": a.xgi_per_90,
            "confidence": a.confidence_score / 100,
            "over_under": a.goals_vs_xg + a.assists_vs_xa
        }


if __name__ == "__main__":
    # Test the form agent
    data_agent = FPLDataIngestion()
    data_agent.ingest_all_data()
    
    form_agent = PlayerFormAgent(data_agent)
    analyses = form_agent.analyze_all_players()
    
    print("\n🔥 Top 10 Players by Form:")
    print("-" * 80)
    for a in analyses[:10]:
        trend_icon = "📈" if a.form_trend == "rising" else ("📉" if a.form_trend == "falling" else "➡️")
        perf = "⚠️ Over" if a.is_overperforming else ("💎 Under" if a.is_underperforming else "")
        print(f"{a.player_name:15} ({a.team}) | Form: {a.form_score:.1f} {trend_icon} | xGI/90: {a.xgi_per_90:.2f} | {perf}")
    
    print("\n💎 Underperformers (Value Picks):")
    print("-" * 60)
    for a in form_agent.get_underperformers()[:5]:
        print(f"{a.player_name:15} ({a.team}) | xG-G: {a.goals_vs_xg:+.1f} | xA-A: {a.assists_vs_xa:+.1f}")
