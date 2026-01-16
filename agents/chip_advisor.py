"""
FPL-Agent: Enhanced Chip Strategy Advisor
Recommends optimal timing for Wildcard, Bench Boost, Triple Captain, and Free Hit.
Uses fixture data, FDR, and captain fixture analysis for data-backed recommendations.
"""

from dataclasses import dataclass
from typing import Optional
from .data_ingestion import FPLDataIngestion, Fixture


@dataclass
class ChipRecommendation:
    """Recommendation for a specific chip."""
    chip_name: str
    recommended_gw: int
    score: float  # 0-100
    reason: str
    data_points: list[str]  # Specific data backing the recommendation
    is_ideal: bool
    verdict: str  # PLAY NOW, WAIT, or HOLD


@dataclass
class GameweekAnalysis:
    """Analysis of a specific gameweek for chip usage."""
    gw: int
    gw_type: str  # 'DGW', 'BGW', 'Normal', 'MixedDGW'
    dgw_teams: list[str]
    bgw_teams: list[str]
    total_fixtures: int
    avg_fdr: float
    easy_home_fixtures: int  # FDR <= 2 at home
    easy_away_fixtures: int
    premium_captain_options: list[dict]  # name, team, fixture, fdr
    chip_scores: dict


class ChipAdvisor:
    """Agent for recommending optimal chip timing with data-backed analysis."""
    
    CHIPS = ["wildcard", "bench_boost", "triple_captain", "free_hit"]
    
    # Premium captains to track for TC analysis
    PREMIUM_TEAMS = ["MCI", "LIV", "ARS", "CHE"]  # City, Liverpool, Arsenal, Chelsea
    
    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        self.gw_analyses: dict[int, GameweekAnalysis] = {}
    
    def analyze_gameweeks(self, num_gws: int = 10) -> dict[int, GameweekAnalysis]:
        """Analyze upcoming gameweeks for chip opportunities."""
        current_gw = self.data.next_gw
        
        for gw in range(current_gw, min(current_gw + num_gws, 39)):
            analysis = self._analyze_single_gw(gw)
            self.gw_analyses[gw] = analysis
        
        return self.gw_analyses
    
    def _analyze_single_gw(self, gw: int) -> GameweekAnalysis:
        """Detailed analysis of a single gameweek."""
        gw_fixtures = [f for f in self.data.fixtures if f.event == gw]
        
        # Count fixtures per team
        team_fixture_count = {}
        team_fixtures_detail = {}  # Store fixture details per team
        
        for f in gw_fixtures:
            team_h = self.data.teams.get(f.team_h)
            team_a = self.data.teams.get(f.team_a)
            h_name = team_h.short_name if team_h else str(f.team_h)
            a_name = team_a.short_name if team_a else str(f.team_a)
            
            team_fixture_count[h_name] = team_fixture_count.get(h_name, 0) + 1
            team_fixture_count[a_name] = team_fixture_count.get(a_name, 0) + 1
            
            # Store fixture details
            if h_name not in team_fixtures_detail:
                team_fixtures_detail[h_name] = []
            team_fixtures_detail[h_name].append({
                "opponent": a_name, "home": True, "fdr": f.team_h_difficulty
            })
            
            if a_name not in team_fixtures_detail:
                team_fixtures_detail[a_name] = []
            team_fixtures_detail[a_name].append({
                "opponent": h_name, "home": False, "fdr": f.team_a_difficulty
            })
        
        # Detect DGW/BGW teams
        dgw_teams = sorted([t for t, c in team_fixture_count.items() if c >= 2])
        all_teams = {t.short_name for t in self.data.teams.values()}
        teams_with_fixtures = set(team_fixture_count.keys())
        bgw_teams = sorted(list(all_teams - teams_with_fixtures))
        
        # Determine GW type
        if len(dgw_teams) >= 10:
            gw_type = "DGW"
        elif len(dgw_teams) >= 3:
            gw_type = "MixedDGW"
        elif len(bgw_teams) >= 5:
            gw_type = "BGW"
        else:
            gw_type = "Normal"
        
        # FDR analysis
        all_fdrs = []
        easy_home = 0
        easy_away = 0
        for f in gw_fixtures:
            all_fdrs.extend([f.team_h_difficulty, f.team_a_difficulty])
            if f.team_h_difficulty <= 2:
                easy_home += 1
            if f.team_a_difficulty <= 2:
                easy_away += 1
        
        avg_fdr = sum(all_fdrs) / len(all_fdrs) if all_fdrs else 3.0
        
        # Premium captain options (big teams with FDR <= 2)
        premium_options = []
        for team in self.PREMIUM_TEAMS:
            if team in team_fixtures_detail:
                for fix in team_fixtures_detail[team]:
                    if fix["fdr"] <= 2:
                        premium_options.append({
                            "team": team,
                            "opponent": fix["opponent"],
                            "home": fix["home"],
                            "fdr": fix["fdr"]
                        })
        
        # Calculate chip scores with detailed logic
        chip_scores = self._calculate_chip_scores(
            gw=gw,
            gw_type=gw_type,
            dgw_teams=dgw_teams,
            bgw_teams=bgw_teams,
            avg_fdr=avg_fdr,
            easy_home=easy_home,
            easy_away=easy_away,
            premium_count=len(premium_options),
            total_fixtures=len(gw_fixtures)
        )
        
        return GameweekAnalysis(
            gw=gw,
            gw_type=gw_type,
            dgw_teams=dgw_teams[:6],
            bgw_teams=bgw_teams[:6],
            total_fixtures=len(gw_fixtures),
            avg_fdr=round(avg_fdr, 2),
            easy_home_fixtures=easy_home,
            easy_away_fixtures=easy_away,
            premium_captain_options=premium_options[:4],
            chip_scores=chip_scores
        )
    
    def _calculate_chip_scores(self, gw: int, gw_type: str, dgw_teams: list, 
                                bgw_teams: list, avg_fdr: float, easy_home: int,
                                easy_away: int, premium_count: int, 
                                total_fixtures: int) -> dict:
        """Calculate detailed opportunity scores for each chip."""
        scores = {}
        
        # === BENCH BOOST ===
        # Best on DGW when many teams double, bench gets extra points
        bb_base = 10
        if gw_type == "DGW":
            bb_base = 85 + min(len(dgw_teams) - 10, 5) * 2  # 85-95 for full DGW
        elif gw_type == "MixedDGW":
            bb_base = 55 + len(dgw_teams) * 5  # 70-80 for mixed
        elif easy_home + easy_away >= 8:
            bb_base = 40  # Decent fixtures but not ideal
        else:
            # Penalize based on avg FDR
            bb_base = max(5, int(30 - (avg_fdr - 2.5) * 10))
        scores["bench_boost"] = min(95, max(5, bb_base))
        
        # === TRIPLE CAPTAIN ===
        # Best on DGW with premium captain having easy fixtures
        tc_base = 15
        if gw_type == "DGW" and premium_count >= 2:
            tc_base = 90  # Premium with double
        elif gw_type == "DGW" and premium_count >= 1:
            tc_base = 75
        elif gw_type == "MixedDGW" and premium_count >= 1:
            tc_base = 60
        elif premium_count >= 3:
            tc_base = 45  # Multiple easy premium fixtures
        elif premium_count >= 1:
            tc_base = 30
        else:
            # No premium easy fixtures
            tc_base = max(10, int(25 - (avg_fdr - 2.5) * 8))
        scores["triple_captain"] = min(95, max(5, tc_base))
        
        # === FREE HIT ===
        # Best on BGW or major DGW to field optimal one-week team
        fh_base = 10
        if gw_type == "BGW":
            fh_base = 90 + min(len(bgw_teams) - 5, 5)  # 90-95 for BGW
        elif gw_type == "DGW":
            fh_base = 70  # Can build optimal DGW team
        elif gw_type == "MixedDGW" and len(dgw_teams) >= 5:
            fh_base = 55
        elif total_fixtures < 8:
            fh_base = 65  # Reduced fixtures = mini blank
        else:
            fh_base = max(5, int(20 - (avg_fdr - 3) * 5))
        scores["free_hit"] = min(95, max(5, fh_base))
        
        # === WILDCARD ===
        # Complex - based on fixture swing and team restructuring potential
        wc_base = 40  # Neutral default
        
        # Look for fixture swing (low avg FDR = good time to structure)
        if avg_fdr <= 2.5:
            wc_base = 70 + int((2.5 - avg_fdr) * 20)  # Up to 80
        elif avg_fdr <= 2.8:
            wc_base = 55
        elif avg_fdr >= 3.5:
            wc_base = 25  # Bad fixtures, maybe wait
        
        # Boost if many easy fixtures
        if easy_home + easy_away >= 10:
            wc_base += 10
        
        # Slight boost mid-season (GW 20-25 range for WC2)
        if 19 <= gw <= 26:
            wc_base += 5
        
        scores["wildcard"] = min(95, max(15, wc_base))
        
        return scores
    
    def get_chip_recommendations(self) -> list[ChipRecommendation]:
        """Get detailed recommendations for all chips."""
        if not self.gw_analyses:
            self.analyze_gameweeks()
        
        recommendations = []
        
        for chip in self.CHIPS:
            # Find best GW for this chip
            best_gw = None
            best_score = 0
            best_analysis = None
            
            for gw, analysis in self.gw_analyses.items():
                score = analysis.chip_scores.get(chip, 0)
                if score > best_score:
                    best_score = score
                    best_gw = gw
                    best_analysis = analysis
            
            if best_gw and best_analysis:
                reason, data_points = self._get_detailed_reason(chip, best_analysis, best_score)
                
                # Determine verdict
                if best_score >= 80:
                    verdict = "🟢 PLAY NOW" if best_gw == self.data.next_gw else f"🟢 PLAY GW{best_gw}"
                elif best_score >= 50:
                    verdict = "🟡 CONSIDER"
                else:
                    verdict = "🔴 HOLD"
                
                recommendations.append(ChipRecommendation(
                    chip_name=chip,
                    recommended_gw=best_gw,
                    score=best_score,
                    reason=reason,
                    data_points=data_points,
                    is_ideal=best_score >= 70,
                    verdict=verdict
                ))
        
        return sorted(recommendations, key=lambda x: x.score, reverse=True)
    
    def _get_detailed_reason(self, chip: str, analysis: GameweekAnalysis, score: int) -> tuple:
        """Generate detailed, data-backed explanation."""
        data_points = []
        
        if chip == "bench_boost":
            if analysis.gw_type == "DGW":
                reason = f"Double Gameweek with {len(analysis.dgw_teams)} teams playing twice"
                data_points = [
                    f"DGW Teams: {', '.join(analysis.dgw_teams[:4])}",
                    f"Total Fixtures: {analysis.total_fixtures} (vs normal ~10)",
                    f"Your bench gets {len(analysis.dgw_teams)}+ extra games"
                ]
            elif analysis.gw_type == "MixedDGW":
                reason = f"Partial DGW - {len(analysis.dgw_teams)} teams doubling"
                data_points = [
                    f"DGW Teams: {', '.join(analysis.dgw_teams[:3])}",
                    f"Consider if you own doublers on bench"
                ]
            else:
                reason = "Normal gameweek - Bench Boost wastes potential"
                data_points = [
                    f"No DGW teams this week",
                    f"Avg FDR: {analysis.avg_fdr} (needs DGW for BB value)",
                    "💡 Wait for confirmed DGW"
                ]
        
        elif chip == "triple_captain":
            if analysis.gw_type in ["DGW", "MixedDGW"] and analysis.premium_captain_options:
                reason = f"Premium captain with DGW opportunity"
                opts = analysis.premium_captain_options[:2]
                data_points = [
                    f"Captain fixtures: {', '.join([f'{o['team']} vs {o['opponent']}(FDR {o['fdr']})' for o in opts])}",
                    f"DGW means 2x captain = 6x points potential",
                ]
                if len(analysis.dgw_teams) >= 3:
                    data_points.append(f"{len(analysis.dgw_teams)} teams with double fixtures")
            elif analysis.premium_captain_options:
                reason = "Good fixtures but no DGW - TC better saved"
                data_points = [
                    f"Easy fixtures: {analysis.easy_home_fixtures}H + {analysis.easy_away_fixtures}A",
                    "Single GW = only 3x points (not 6x)",
                    "💡 Wait for DGW with premium captains"
                ]
            else:
                reason = "No standout captain fixtures"
                data_points = [
                    f"Avg FDR: {analysis.avg_fdr} (too tough)",
                    f"Premium teams face difficult opponents",
                    "💡 TC needs DGW + easy fixture combo"
                ]
        
        elif chip == "free_hit":
            if analysis.gw_type == "BGW":
                reason = f"Blank Gameweek - {len(analysis.bgw_teams)} teams not playing"
                data_points = [
                    f"Teams blanking: {', '.join(analysis.bgw_teams[:4])}",
                    f"Only {analysis.total_fixtures} fixtures this GW",
                    "FH lets you field 11 players who all play"
                ]
            elif analysis.gw_type == "DGW":
                reason = "DGW opportunity - build optimal one-week team"
                data_points = [
                    f"DGW Teams: {', '.join(analysis.dgw_teams[:4])}",
                    "Stack doublers without long-term commitment",
                ]
            else:
                reason = "Normal gameweek - save FH for BGW/DGW"
                data_points = [
                    f"{analysis.total_fixtures} fixtures (normal amount)",
                    "FH most valuable when fixtures are irregular",
                    "💡 Wait for blank or double gameweek"
                ]
        
        elif chip == "wildcard":
            if analysis.avg_fdr <= 2.7 and analysis.easy_home_fixtures >= 5:
                reason = "Favorable fixture swing - good time to restructure"
                data_points = [
                    f"Avg FDR: {analysis.avg_fdr} (easier than average 3.0)",
                    f"Easy fixtures: {analysis.easy_home_fixtures} home, {analysis.easy_away_fixtures} away",
                    "Restructure now to ride the good run"
                ]
            elif analysis.avg_fdr >= 3.3:
                reason = "Tough fixtures ahead - consider waiting"
                data_points = [
                    f"Avg FDR: {analysis.avg_fdr} (above average)",
                    "Teams face difficult opponents",
                    "💡 WC before a fixture swing, not during tough run"
                ]
            else:
                reason = "Neutral fixtures - WC if team needs major surgery"
                data_points = [
                    f"Avg FDR: {analysis.avg_fdr} (neutral)",
                    "Use WC if 4+ transfers needed",
                    "Otherwise, accumulate free transfers"
                ]
        
        return reason, data_points
    
    def to_dict(self) -> dict:
        """Export analysis as JSON-friendly dict."""
        recommendations = self.get_chip_recommendations()
        
        return {
            "current_gw": self.data.next_gw,
            "recommendations": [
                {
                    "chip": r.chip_name,
                    "recommended_gw": r.recommended_gw,
                    "score": r.score,
                    "verdict": r.verdict,
                    "reason": r.reason,
                    "data_points": r.data_points,
                    "is_ideal": r.is_ideal,
                }
                for r in recommendations
            ],
            "gameweek_analysis": {
                gw: {
                    "type": a.gw_type,
                    "is_dgw": a.gw_type in ["DGW", "MixedDGW"],
                    "is_bgw": a.gw_type == "BGW",
                    "dgw_teams": a.dgw_teams,
                    "bgw_teams": a.bgw_teams,
                    "total_fixtures": a.total_fixtures,
                    "avg_fdr": a.avg_fdr,
                    "easy_fixtures": a.easy_home_fixtures + a.easy_away_fixtures,
                    "chip_scores": a.chip_scores,
                    "premium_captain_options": a.premium_captain_options
                }
                for gw, a in self.gw_analyses.items()
            }
        }


if __name__ == "__main__":
    print("🎯 Testing Enhanced Chip Advisor...")
    
    data = FPLDataIngestion()
    data.ingest_all_data()
    
    advisor = ChipAdvisor(data)
    advisor.analyze_gameweeks(8)
    
    print(f"\n📅 Chip Recommendations for GW{data.next_gw}+:")
    for rec in advisor.get_chip_recommendations():
        print(f"\n{rec.chip_name.upper()}: GW{rec.recommended_gw} ({rec.score}/100) {rec.verdict}")
        print(f"  📝 {rec.reason}")
        for dp in rec.data_points:
            print(f"     • {dp}")
