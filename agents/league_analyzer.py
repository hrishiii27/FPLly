"""
FPL-Agent: Mini-League Analyzer
Analyzes specific mini-leagues to find effective ownership and rivals.
"""

import requests
import time
from dataclasses import dataclass

@dataclass
class Manager:
    id: int
    name: str
    team_name: str
    rank: int
    total_points: int
    gw_points: int

class LeagueAnalyzer:
    """Agent for analyzing FPL mini-leagues."""
    
    BASE_URL = "https://fantasy.premierleague.com/api/"
    
    def __init__(self, data_agent):
        self.data = data_agent
        self.cache = {}  # league_id -> analysis
        
    def analyze_league(self, league_id: int, top_n: int = 10) -> dict:
        """Analyze a mini-league."""
        
        # Check cache
        if league_id in self.cache:
            return self.cache[league_id]
            
        print(f"📊 Analyzing League {league_id}...")
        
        # 1. Fetch Standings
        try:
            url = f"{self.BASE_URL}leagues-classic/{league_id}/standings/"
            resp = requests.get(url)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            return {"error": str(e)}
            
        league_name = data['league']['name']
        standings = data['standings']['results']
        
        # Limit to top N
        top_managers = standings[:top_n]
        
        # 2. Fetch Teams for Top Managers
        managers_data = []
        player_counts = {}
        captain_counts = {}
        
        current_gw = self.data.current_gw
        
        for entry in top_managers:
            manager_id = entry['entry']
            
            # Fetch picks
            try:
                picks_url = f"{self.BASE_URL}entry/{manager_id}/event/{current_gw}/picks/"
                picks_resp = requests.get(picks_url)
                if picks_resp.status_code == 200:
                    picks_data = picks_resp.json()
                    picks = picks_data['entry_history']
                    active_chip = picks_data.get('active_chip')
                    
                    # Track players
                    for p in picks_data['picks']:
                        pid = p['element']
                        player_counts[pid] = player_counts.get(pid, 0) + 1
                        
                        if p['is_captain']:
                            captain_counts[pid] = captain_counts.get(pid, 0) + 1
                    
                    managers_data.append({
                        "id": manager_id,
                        "name": entry['player_name'],
                        "team": entry['entry_name'],
                        "rank": entry['rank'],
                        "points": entry['total'],
                        "gw_points": entry['event_total'],
                        "chip": active_chip
                    })
                    
                time.sleep(0.1) # Be nice to API
            except:
                continue
                
        # 3. Calculate Effective Ownership (League EO)
        eo_data = []
        for pid, count in player_counts.items():
            player = next((p for p in self.data.players if p.id == pid), None)
            if player:
                ownership = (count / len(managers_data)) * 100
                cap_pct = (captain_counts.get(pid, 0) / len(managers_data)) * 100
                
                eo_data.append({
                    "id": pid,
                    "name": player.web_name,
                    "team": player.team_name,
                    "pos": player.position,
                    "ownership": round(ownership, 1),
                    "captaincy": round(cap_pct, 1),
                    "points": player.total_points # Should use GW points actually
                })
        
        # Sort by ownership
        eo_data.sort(key=lambda x: x['ownership'], reverse=True)
        
        result = {
            "id": league_id,
            "name": league_name,
            "managers": managers_data,
            "template": eo_data[:15], # Top 15 owned
            "differential_opportunities": [p for p in eo_data if p['ownership'] < 30][:5]
        }
        
        self.cache[league_id] = result
        return result
