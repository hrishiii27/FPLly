import requests
from dataclasses import dataclass
from .data_ingestion import BASE_URL, FPLDataIngestion

class LiveTrackerAgent:
    """Fetches real-time points and metadata for a specific FPL entry."""
    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        
    def get_live_team_points(self, fpl_id: int) -> dict:
        """Fetch the live points and rank for a user's FPL ID in the current gameweek."""
        current_gw = self.data.current_gw
        
        # 1. Get user's basic info
        resp1 = requests.get(f"{BASE_URL}entry/{fpl_id}/")
        if resp1.status_code != 200:
            return {"error": "Invalid FPL ID"}
        entry_data = resp1.json()
        
        # 2. Get user's picks for this GW
        resp2 = requests.get(f"{BASE_URL}entry/{fpl_id}/event/{current_gw}/picks/")
        if resp2.status_code != 200:
            return {"error": f"Could not fetch GW {current_gw} picks"}
        picks_data = resp2.json()
        
        # 3. Get live event data
        resp3 = requests.get(f"{BASE_URL}event/{current_gw}/live/")
        if resp3.status_code != 200:
            return {"error": "Could not fetch live event data"}
        live_data = resp3.json()
        elements = {str(e['id']): e for e in live_data['elements']}
        
        # Calculate live points
        live_score = 0
        picks_details = []
        for pick in picks_data.get('picks', []):
            pid = str(pick['element'])
            multiplier = pick['multiplier']
            is_captain = pick['is_captain']
            is_vice = pick['is_vice_captain']
            
            p_data = elements.get(pid, {})
            stats = p_data.get('stats', {})
            points = stats.get('total_points', 0)
            
            total_pts = points * multiplier
            if multiplier > 0:
                live_score += total_pts
                
            # Try to get player name
            p_obj = next((p for p in self.data.players if p.id == int(pid)), None)
            
            picks_details.append({
                "id": int(pid),
                "name": p_obj.web_name if p_obj else "Unknown",
                "position": p_obj.position if p_obj else "???",
                "price": p_obj.price if p_obj else 0.0,
                "multiplier": multiplier,
                "is_captain": is_captain,
                "is_vice": is_vice,
                "base_points": points,
                "total_points": total_pts,
                "minutes": stats.get('minutes', 0)
            })
            
        return {
            "gw": current_gw,
            "team_name": entry_data.get("name"),
            "manager_name": f"{entry_data.get('player_first_name', '')} {entry_data.get('player_last_name', '')}".strip(),
            "overall_rank": entry_data.get("summary_overall_rank"),
            "overall_points": entry_data.get("summary_overall_points"),
            "gw_points_so_far": live_score,
            "active_chip": picks_data.get('active_chip'),
            "picks": picks_details
        }
