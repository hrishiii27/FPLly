"""
FPL-Agent: Explainability Agent
Provides natural language justifications for all recommendations.
"""

from dataclasses import dataclass
from .points_predictor import PointsPrediction
from .squad_optimizer import TransferRecommendation, OptimizedSquad
from .fixture_analysis import FixtureAnalysis


@dataclass
class Explanation:
    """An explanation for a recommendation."""
    title: str
    summary: str
    factors: list[str]
    confidence_note: str


class ExplainabilityAgent:
    """Agent for generating explanations for FPL decisions."""
    
    def explain_captain_choice(
        self, 
        captain: PointsPrediction,
        alternatives: list[PointsPrediction]
    ) -> Explanation:
        """Explain why a captain was chosen."""
        
        factors = []
        
        # Form analysis
        if captain.form_trend == "rising":
            factors.append(f"📈 Form is rising - {captain.player_name} is in excellent current form")
        elif captain.form_trend == "stable":
            factors.append(f"➡️ Consistent performer with stable output")
        
        # Fixture analysis
        if "FDR:1" in captain.fixture_info or "FDR:2" in captain.fixture_info:
            factors.append(f"🟢 Favorable fixture: {captain.fixture_info}")
        elif "(H)" in captain.fixture_info:
            factors.append(f"🏠 Home advantage: {captain.fixture_info}")
        
        # Minutes reliability
        if captain.minutes_tag == "Nailed":
            factors.append(f"✅ Nailed for 90 minutes - low rotation risk")
        
        # Goal threat
        if captain.goal_probability > 30:
            factors.append(f"⚽ High goal probability: {captain.goal_probability:.0f}%")
        
        # Assist potential
        if captain.assist_probability > 25:
            factors.append(f"🎯 Strong assist potential: {captain.assist_probability:.0f}%")
        
        # Comparison to alternatives
        if alternatives:
            second = alternatives[0] if alternatives else None
            if second:
                diff = captain.expected_points - second.expected_points
                if diff > 1:
                    factors.append(f"📊 {diff:.1f} more xPts than next option ({second.player_name})")
        
        # Ceiling potential
        if captain.expected_points_high > captain.expected_points * 1.5:
            factors.append(f"🚀 High ceiling potential: up to {captain.expected_points_high:.1f} pts")
        
        summary = f"{captain.player_name} is the recommended captain with {captain.expected_points:.2f} expected points."
        
        confidence_note = f"Confidence: {captain.confidence:.0f}% based on form, fixtures, and minutes data."
        
        return Explanation(
            title=f"👑 Captain: {captain.player_name}",
            summary=summary,
            factors=factors,
            confidence_note=confidence_note
        )
    
    def explain_transfer(self, transfer: TransferRecommendation) -> Explanation:
        """Explain why a transfer is recommended."""
        
        factors = []
        
        # Points gain
        factors.append(f"📈 +{transfer.points_gain:.1f} expected points gain per gameweek")
        
        # Price analysis
        if transfer.price_change < 0:
            factors.append(f"💰 Saves £{abs(transfer.price_change):.1f}m in budget")
        elif transfer.price_change > 0:
            factors.append(f"💸 Costs £{transfer.price_change:.1f}m more")
        else:
            factors.append(f"💵 Same price - pure upgrade")
        
        # Reason from optimizer
        if transfer.reason:
            factors.append(f"📋 {transfer.reason}")
        
        summary = (
            f"Transfer {transfer.player_out_name} (£{transfer.player_out_price:.1f}m, "
            f"xPts: {transfer.player_out_xpts:.1f}) OUT for {transfer.player_in_name} "
            f"(£{transfer.player_in_price:.1f}m, xPts: {transfer.player_in_xpts:.1f}) IN."
        )
        
        confidence_note = "Based on expected points for next gameweek."
        
        return Explanation(
            title=f"🔄 {transfer.player_out_name} → {transfer.player_in_name}",
            summary=summary,
            factors=factors,
            confidence_note=confidence_note
        )
    
    def explain_bench_order(self, bench: list[PointsPrediction]) -> Explanation:
        """Explain the recommended bench order."""
        
        factors = []
        
        for i, player in enumerate(bench, 1):
            reason = ""
            if i == 1:
                reason = "( most likely to come on - highest xPts)"
            elif player.position == "GKP":
                reason = "(goalkeeper - emergency backup)"
            
            factors.append(
                f"{i}. {player.player_name} ({player.position}) - xPts: {player.expected_points:.2f} {reason}"
            )
        
        summary = "Bench ordered by expected points with positional considerations."
        
        return Explanation(
            title="🪑 Bench Order",
            summary=summary,
            factors=factors,
            confidence_note="First sub should be the player most likely to score if called upon."
        )
    
    def explain_squad_selection(self, squad: OptimizedSquad) -> Explanation:
        """Explain the squad selection reasoning."""
        
        factors = []
        
        # Formation
        factors.append(f"📐 Formation: {squad.formation}")
        
        # Budget efficiency
        remaining_budget = 100.0 - squad.total_price
        if remaining_budget > 0:
            factors.append(f"💰 £{remaining_budget:.1f}m left in budget")
        
        # Total expected points
        factors.append(f"📊 Total expected points: {squad.expected_points:.1f} (incl. captain bonus)")
        
        # Highlight key picks
        top_3 = sorted(squad.starting_xi, key=lambda x: x.expected_points, reverse=True)[:3]
        factors.append(f"⭐ Key picks: {', '.join(p.player_name for p in top_3)}")
        
        summary = f"Optimal {squad.formation} formation maximizing expected points within £{squad.total_price:.1f}m budget."
        
        return Explanation(
            title="🏆 Optimal Squad",
            summary=summary,
            factors=factors,
            confidence_note=f"Captain: {squad.captain.player_name}, Vice: {squad.vice_captain.player_name}"
        )
    
    def explain_player_prediction(self, prediction: PointsPrediction) -> Explanation:
        """Explain how a player's points prediction was calculated."""
        
        factors = []
        
        # Breakdown
        if prediction.expected_goals_points > 0.5:
            factors.append(f"⚽ Goals contribution: {prediction.expected_goals_points:.2f} pts")
        
        if prediction.expected_assists_points > 0.3:
            factors.append(f"🎯 Assists contribution: {prediction.expected_assists_points:.2f} pts")
        
        if prediction.expected_clean_sheet_points > 0.5:
            factors.append(f"🧤 Clean sheet chance: {prediction.clean_sheet_probability:.0f}% ({prediction.expected_clean_sheet_points:.2f} pts)")
        
        factors.append(f"📋 Appearance points: {prediction.expected_appearance_points:.1f}")
        
        if prediction.expected_bonus_points > 0.5:
            factors.append(f"🌟 Bonus potential: {prediction.expected_bonus_points:.2f} pts")
        
        # Context
        factors.append(f"📅 Fixture: {prediction.fixture_info}")
        factors.append(f"📈 Form: {prediction.form_trend}")
        factors.append(f"⏱️ Minutes: {prediction.minutes_tag}")
        
        summary = (
            f"{prediction.player_name} ({prediction.team}) is predicted to score "
            f"{prediction.expected_points:.2f} points (range: {prediction.expected_points_low:.1f}-{prediction.expected_points_high:.1f})."
        )
        
        confidence_note = f"Confidence: {prediction.confidence:.0f}%"
        
        return Explanation(
            title=f"📊 {prediction.player_name} - {prediction.expected_points:.2f} xPts",
            summary=summary,
            factors=factors,
            confidence_note=confidence_note
        )
    
    def format_explanation_text(self, explanation: Explanation) -> str:
        """Format explanation as readable text."""
        
        lines = [
            explanation.title,
            "=" * 50,
            explanation.summary,
            "",
            "Key Factors:",
        ]
        
        for factor in explanation.factors:
            lines.append(f"  • {factor}")
        
        lines.extend(["", explanation.confidence_note])
        
        return "\n".join(lines)
    
    def to_dict(self, explanation: Explanation) -> dict:
        """Convert explanation to dictionary for JSON."""
        return {
            "title": explanation.title,
            "summary": explanation.summary,
            "factors": explanation.factors,
            "confidence": explanation.confidence_note
        }


if __name__ == "__main__":
    # Demo the explainability agent
    from .data_ingestion import FPLDataIngestion
    from .player_form import PlayerFormAgent
    from .minutes_risk import MinutesRiskAgent
    from .fixture_analysis import FixtureAnalysisAgent
    from .points_predictor import PointsPredictionAgent
    from .squad_optimizer import SquadOptimizer
    
    print("🚀 Initializing Explainability Agent Demo...")
    
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
    prediction_agent.predict_all_players()
    
    optimizer = SquadOptimizer(prediction_agent)
    squad = optimizer.optimize_team()
    
    explainer = ExplainabilityAgent()
    
    # Explain captain choice
    captain_exp = explainer.explain_captain_choice(
        squad.captain, 
        [p for p in squad.starting_xi if p != squad.captain][:3]
    )
    print("\n" + explainer.format_explanation_text(captain_exp))
    
    # Explain a top player
    top_player = prediction_agent.get_top_predictions(1)[0]
    player_exp = explainer.explain_player_prediction(top_player)
    print("\n" + explainer.format_explanation_text(player_exp))
