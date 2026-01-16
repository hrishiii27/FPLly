"""
FPL-Agent: Scout Chat Agent (LLM-lite)
Provides natural language advice by querying other agents.
"""

from typing import Optional
import re
import random

class ScoutChatAgent:
    """Conversational agent for FPL advice."""
    
    def __init__(self, agents: dict):
        self.agents = agents
        
        # Responses for greeting/unknown
        self.GREETINGS = [
            "Hello! I'm your FPL Scout. Ask me about captains, differentials, or chip strategy.",
            "Ready to help you climb the ranks! What do you need?",
            "Scout reporting for duty. Ask me anything about GW{gw}."
        ]
        
        self.UNKNOWN = [
            "I'm not sure about that. Try asking about 'captains', 'differentials', or specific players like 'Salah'.",
            "My scouting network didn't catch that. Ask me 'who to captain' or 'best differentials'.",
            "I'm tuned for FPL stats. Ask me about 'wildcard strategy' or 'optimal team'."
        ]

    def get_response(self, query: str) -> str:
        """Process natural language query and return markdown response."""
        query = query.lower()
        next_gw = self.agents['data'].next_gw
        
        # 1. Captaincy
        if any(w in query for w in ['captain', 'cap', 'c']):
            return self._get_captain_advice(next_gw)
            
        # 2. Chips / Strategy
        if any(w in query for w in ['chip', 'wildcard', 'free hit', 'bench boost', 'triple captain']):
            return self._get_chip_advice(next_gw)
            
        # 3. Differentials
        if any(w in query for w in ['differential', 'low owned', 'gem', 'under the radar']):
            return self._get_differential_advice()
            
        # 4. Optimal Team / Best XI
        if any(w in query for w in ['best team', 'optimal', 'dream team', 'scout pick', 'best xi']):
            return self._get_optimal_team_advice(next_gw)
            
        # 5. Specific Player Analysis
        player_match = self._find_player_in_query(query)
        if player_match:
            return self._get_player_analysis(player_match)
            
        # 6. Greeting
        if any(w in query for w in ['hi', 'hello', 'hey', 'start']):
            return random.choice(self.GREETINGS).format(gw=next_gw)
            
        return random.choice(self.UNKNOWN)

    def _get_captain_advice(self, gw: int) -> str:
        """Get captain recommendations."""
        preds = self.agents['predictions'].get_captain_picks(3)
        
        response = f"### 🧢 Captaincy for GW{gw}\n\n"
        
        top = preds[0]
        response += f"**Top Pick: {top.player_name}** ({top.team}) - *{top.expected_points} xPts*\n"
        response += f"The safest armband choice. {top.fixture_info}.\n\n"
        
        if len(preds) > 1:
            diff = preds[1]
            response += f"**Alternative: {diff.player_name}** ({diff.team}) - *{diff.expected_points} xPts*\n"
            response += f"Great if you're chasing. {diff.fixture_info}.\n"
            
        return response

    def _get_chip_advice(self, gw: int) -> str:
        """Get chip strategy."""
        advisor = self.agents.get('chips')
        if not advisor:
            return "Chip Advisor agent not initialized."
            
        recs = advisor.get_chip_recommendations()
        top_rec = recs[0]
        
        response = f"### 🃏 Chip Strategy (GW{gw})\n\n"
        
        if top_rec.score >= 70:
            response += f"🚨 **ACTIVATE: {top_rec.chip_name.replace('_', ' ').title()}**\n"
            response += f"It's the perfect time! {top_rec.reason}\n"
        else:
            response += f"✋ **HOLD YOUR CHIPS**\n"
            response += f"No major opportunities this week. Best potential option is {top_rec.chip_name.replace('_', ' ').title()} ({top_rec.score}/100), but I'd suggest saving it.\n"
            
        return response

    def _get_differential_advice(self) -> str:
        """Get differential picks."""
        finder = self.agents.get('differentials')
        if not finder:
            # Fallback if agent not ready
            return "I'm recalibrating my differential scanner. Try again in a moment."
            
        diffs = finder.find_differentials()[:3]
        
        response = f"### 💎 Differentials (<10% owned)\n\n"
        for p in diffs:
            response += f"**{p.player_name}** ({p.team}) - £{p.price}m\n"
            response += f"• Owned by only **{p.ownership}%**\n"
            response += f"• Predicted: **{p.xpts} pts** | {p.fixture_info}\n\n"
            
        return response

    def _get_optimal_team_advice(self, gw: int) -> str:
        """Summary of optimal XI."""
        optimizer = self.agents.get('optimizer')
        squad = optimizer.optimize_team()
        
        response = f"### 🏆 Scout's Selection (GW{gw})\n\n"
        response += f"I've built a **{squad.formation}** squad projected for **{squad.expected_points} points**.\n\n"
        
        # Key players
        key_players = sorted(squad.starting_xi, key=lambda x: x.expected_points, reverse=True)[:3]
        response += "**Key Men:**\n"
        for p in key_players:
             response += f"- **{p.player_name}** ({p.fixture_info})\n"
             
        response += f"\nTotal Cost: £{squad.total_price}m"
        return response

    def _find_player_in_query(self, query: str) -> Optional[object]:
        """Fuzzy match player name in query."""
        # Simple fuzzy search
        # Remove common words
        clean_query = query.replace("?", "").replace("stats", "").replace("is", "").replace("good", "").strip()
        
        best_match = None
        best_score = 0
        
        # Use existing fuzzy match logic or simple substring for now
        # Creating a simplified search here since we don't assume fuzzywuzzy inside this class
        # (though server.py imports it, we want this class independent-ish)
        
        for pid, pred in self.agents['predictions'].predictions.items():
            name = pred.player_name.lower()
            if name in clean_query or clean_query in name:
                # Basic sub-string match
                if len(clean_query) > 3: # Avoid matching short words like "is"
                    return pred
                    
        return None

    def _get_player_analysis(self, player) -> str:
        """Deep dive on a specific player."""
        response = f"### 🔎 Scout Report: {player.player_name}\n\n"
        
        response += f"**Rating: {player.confidence}% Confidence**\n"
        response += f"Projected for **{player.expected_points} points** vs {player.fixture_info}.\n\n"
        
        # Verdict based on xPts
        if player.expected_points >= 6.0:
            verdict = "🌟 **ESSENTIAL** - Must have."
        elif player.expected_points >= 4.5:
            verdict = "✅ **GOOD PICK** - Solid starter."
        elif player.expected_points >= 3.0:
            verdict = "🤔 **DECENT** - Rotation risk or tough game."
        else:
            verdict = "❌ **AVOID** - Better options available."
            
        response += f"**Verdict:** {verdict}\n\n"
        
        response += "**Underlying Stats:**\n"
        response += f"- Goal Prob: {player.goal_probability}%\n"
        response += f"- Assist Prob: {player.assist_probability}%\n"
        response += f"- Form: {player.form_trend.capitalize()}\n"
        
        return response

def parse_fixture(fix_str):
    # Helper to clean fixture string
    if not fix_str: return ""
    return fix_str.split(' ')[0]
