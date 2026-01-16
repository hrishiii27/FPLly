"""
FPL-Agent: Historical Data Agent
Fetches and analyzes historical FPL data from vaastav/Fantasy-Premier-League GitHub repo.
Data source: https://github.com/vaastav/Fantasy-Premier-League
"""

import pandas as pd
import requests
from dataclasses import dataclass
from typing import Optional
from io import StringIO


@dataclass
class PlayerHistoricalStats:
    """Historical statistics for a player."""
    player_name: str
    seasons_played: int
    total_points: int
    total_goals: int
    total_assists: int
    total_xg: float
    total_xa: float
    xg_overperformance: float  # Actual goals - xG
    xa_overperformance: float  # Actual assists - xA
    avg_minutes_per_gw: float
    avg_points_per_gw: float
    consistency_score: float  # Based on std deviation of points


@dataclass 
class FixtureHistoricalData:
    """Historical data for a team vs opponent matchup."""
    team: str
    opponent: str
    matches_played: int
    avg_goals_scored: float
    avg_goals_conceded: float
    avg_clean_sheets: float
    home_advantage: float


class HistoricalDataAgent:
    """Agent that fetches and processes historical FPL data from GitHub."""
    
    BASE_URL = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data"
    SEASONS = ["2023-24", "2022-23", "2021-22", "2020-21", "2019-20"]
    
    def __init__(self):
        self.player_history: dict[str, PlayerHistoricalStats] = {}
        self.season_data: dict[str, pd.DataFrame] = {}
        self.merged_gw_data: dict[str, pd.DataFrame] = {}
        self.loaded = False
    
    def fetch_season_data(self, season: str) -> Optional[pd.DataFrame]:
        """Fetch merged gameweek data for a season."""
        url = f"{self.BASE_URL}/{season}/gws/merged_gw.csv"
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            df = pd.read_csv(StringIO(response.text))
            print(f"  ✓ Loaded {season}: {len(df)} GW records")
            return df
        except Exception as e:
            print(f"  ✗ Failed to load {season}: {e}")
            return None
    
    def fetch_cleaned_players(self, season: str) -> Optional[pd.DataFrame]:
        """Fetch cleaned players overview for a season."""
        url = f"{self.BASE_URL}/{season}/cleaned_players.csv"
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            df = pd.read_csv(StringIO(response.text))
            return df
        except Exception as e:
            print(f"  ✗ Failed to load cleaned players for {season}: {e}")
            return None
    
    def load_all_historical_data(self):
        """Load historical data from all available seasons."""
        if self.loaded:
            return
        
        print("📚 Loading historical FPL data...")
        
        for season in self.SEASONS:
            df = self.fetch_season_data(season)
            if df is not None:
                self.merged_gw_data[season] = df
        
        self.loaded = True
        print(f"✅ Loaded {len(self.merged_gw_data)} seasons of historical data")
    
    def calculate_player_historical_stats(self, player_name: str) -> Optional[PlayerHistoricalStats]:
        """Calculate historical statistics for a player across all seasons."""
        if not self.loaded:
            self.load_all_historical_data()
        
        all_gw_data = []
        
        for season, df in self.merged_gw_data.items():
            # Try to match player name (handle name variations)
            player_data = df[df['name'].str.lower() == player_name.lower()]
            if len(player_data) == 0:
                # Try partial match
                player_data = df[df['name'].str.lower().str.contains(player_name.lower(), na=False)]
            
            if len(player_data) > 0:
                all_gw_data.append(player_data)
        
        if not all_gw_data:
            return None
        
        combined = pd.concat(all_gw_data, ignore_index=True)
        
        # Calculate stats
        total_points = combined['total_points'].sum() if 'total_points' in combined.columns else 0
        total_goals = combined['goals_scored'].sum() if 'goals_scored' in combined.columns else 0
        total_assists = combined['assists'].sum() if 'assists' in combined.columns else 0
        
        # xG/xA (may not be in all seasons)
        total_xg = combined['expected_goals'].sum() if 'expected_goals' in combined.columns else 0
        total_xa = combined['expected_assists'].sum() if 'expected_assists' in combined.columns else 0
        
        # Calculate overperformance
        xg_overperformance = total_goals - total_xg if total_xg > 0 else 0
        xa_overperformance = total_assists - total_xa if total_xa > 0 else 0
        
        # Minutes and points per GW
        total_gws = len(combined)
        avg_minutes = combined['minutes'].mean() if 'minutes' in combined.columns else 0
        avg_points = combined['total_points'].mean() if 'total_points' in combined.columns else 0
        
        # Consistency (lower std = more consistent)
        points_std = combined['total_points'].std() if 'total_points' in combined.columns else 0
        consistency_score = max(0, 10 - points_std) if points_std < 10 else 0
        
        return PlayerHistoricalStats(
            player_name=player_name,
            seasons_played=len(self.merged_gw_data),
            total_points=int(total_points),
            total_goals=int(total_goals),
            total_assists=int(total_assists),
            total_xg=round(total_xg, 2),
            total_xa=round(total_xa, 2),
            xg_overperformance=round(xg_overperformance, 2),
            xa_overperformance=round(xa_overperformance, 2),
            avg_minutes_per_gw=round(avg_minutes, 1),
            avg_points_per_gw=round(avg_points, 2),
            consistency_score=round(consistency_score, 2)
        )
    
    def get_xg_overperformance(self, player_name: str) -> float:
        """Get xG overperformance for a player (positive = scores more than expected)."""
        stats = self.calculate_player_historical_stats(player_name)
        return stats.xg_overperformance if stats else 0.0
    
    def get_xa_overperformance(self, player_name: str) -> float:
        """Get xA overperformance for a player."""
        stats = self.calculate_player_historical_stats(player_name)
        return stats.xa_overperformance if stats else 0.0
    
    def get_historical_consistency(self, player_name: str) -> float:
        """Get consistency score for a player (0-10, higher = more consistent)."""
        stats = self.calculate_player_historical_stats(player_name)
        return stats.consistency_score if stats else 5.0
    
    def get_avg_points_per_gw(self, player_name: str) -> float:
        """Get average points per gameweek historically."""
        stats = self.calculate_player_historical_stats(player_name)
        return stats.avg_points_per_gw if stats else 0.0
    
    def get_top_overperformers(self, limit: int = 20) -> list[dict]:
        """Get players who consistently overperform their xG."""
        if not self.loaded:
            self.load_all_historical_data()
        
        # Get all unique player names from recent season
        if "2023-24" not in self.merged_gw_data:
            return []
        
        recent_players = self.merged_gw_data["2023-24"]['name'].unique()
        
        overperformers = []
        for player in recent_players[:100]:  # Limit for performance
            stats = self.calculate_player_historical_stats(player)
            if stats and stats.total_xg > 5:  # Only players with significant xG
                overperformers.append({
                    "name": player,
                    "xg_overperformance": stats.xg_overperformance,
                    "total_goals": stats.total_goals,
                    "total_xg": stats.total_xg,
                    "seasons": stats.seasons_played
                })
        
        # Sort by overperformance
        overperformers.sort(key=lambda x: x["xg_overperformance"], reverse=True)
        return overperformers[:limit]
    
    def to_dict(self, stats: PlayerHistoricalStats) -> dict:
        """Convert PlayerHistoricalStats to dictionary."""
        return {
            "player_name": stats.player_name,
            "seasons_played": stats.seasons_played,
            "total_points": stats.total_points,
            "total_goals": stats.total_goals,
            "total_assists": stats.total_assists,
            "total_xg": stats.total_xg,
            "total_xa": stats.total_xa,
            "xg_overperformance": stats.xg_overperformance,
            "xa_overperformance": stats.xa_overperformance,
            "avg_minutes_per_gw": stats.avg_minutes_per_gw,
            "avg_points_per_gw": stats.avg_points_per_gw,
            "consistency_score": stats.consistency_score
        }


if __name__ == "__main__":
    # Test the agent
    agent = HistoricalDataAgent()
    agent.load_all_historical_data()
    
    # Test with a known player
    stats = agent.calculate_player_historical_stats("Salah")
    if stats:
        print(f"\n📊 {stats.player_name}:")
        print(f"  Total Points: {stats.total_points}")
        print(f"  Goals: {stats.total_goals} (xG: {stats.total_xg})")
        print(f"  xG Overperformance: {stats.xg_overperformance:+.2f}")
        print(f"  Consistency: {stats.consistency_score}/10")
