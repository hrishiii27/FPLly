"""
FPL-Agent: Data Ingestion Agent
Fetches and normalizes data from the official FPL API.
"""

import requests
from dataclasses import dataclass
from typing import Optional
import json


BASE_URL = "https://fantasy.premierleague.com/api/"


@dataclass
class Player:
    """Represents an FPL player with key attributes."""
    id: int
    web_name: str
    team_id: int
    team_name: str
    position: str
    price: float
    total_points: int
    points_per_game: float
    form: float
    minutes: int
    goals_scored: int
    assists: int
    clean_sheets: int
    expected_goals: float
    expected_assists: float
    expected_goal_involvements: float
    influence: float
    creativity: float
    threat: float
    ict_index: float
    chance_of_playing: Optional[int]
    selected_by_percent: float
    transfers_in_event: int
    transfers_out_event: int
    bonus: int
    bps: int
    news: str
    status: str


@dataclass
class Team:
    """Represents a Premier League team."""
    id: int
    name: str
    short_name: str
    strength: int
    strength_attack_home: int
    strength_attack_away: int
    strength_defence_home: int
    strength_defence_away: int


@dataclass
class Fixture:
    """Represents a future fixture."""
    id: int
    event: int  # Gameweek
    team_h: int
    team_a: int
    team_h_difficulty: int
    team_a_difficulty: int
    finished: bool


@dataclass
class Gameweek:
    """Represents a gameweek event."""
    id: int
    name: str
    deadline_time: str
    is_current: bool
    is_next: bool
    finished: bool
    average_entry_score: int


class FPLDataIngestion:
    """Agent for fetching and normalizing FPL API data."""
    
    def __init__(self):
        self.players: list[Player] = []
        self.teams: dict[int, Team] = {}
        self.fixtures: list[Fixture] = []
        self.gameweeks: list[Gameweek] = []
        self.current_gw: int = 1
        self.next_gw: int = 1
        self._position_map = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}
    
    def fetch_bootstrap_static(self) -> dict:
        """Fetch the main bootstrap-static endpoint."""
        response = requests.get(f"{BASE_URL}bootstrap-static/")
        response.raise_for_status()
        return response.json()
    
    def fetch_fixtures(self) -> list:
        """Fetch all fixtures."""
        response = requests.get(f"{BASE_URL}fixtures/")
        response.raise_for_status()
        return response.json()
    
    def fetch_player_history(self, player_id: int) -> dict:
        """Fetch detailed history for a specific player."""
        response = requests.get(f"{BASE_URL}element-summary/{player_id}/")
        response.raise_for_status()
        return response.json()
    
    def ingest_all_data(self) -> None:
        """Main ingestion method - fetches and normalizes all data."""
        print("📥 Fetching FPL data...")
        
        # Fetch bootstrap data
        bootstrap = self.fetch_bootstrap_static()
        
        # Parse teams
        self._parse_teams(bootstrap.get("teams", []))
        print(f"  ✓ Loaded {len(self.teams)} teams")
        
        # Parse gameweeks
        self._parse_gameweeks(bootstrap.get("events", []))
        print(f"  ✓ Loaded {len(self.gameweeks)} gameweeks (Current: GW{self.current_gw}, Next: GW{self.next_gw})")
        
        # Parse players
        self._parse_players(bootstrap.get("elements", []))
        print(f"  ✓ Loaded {len(self.players)} players")
        
        # Fetch fixtures
        fixtures_data = self.fetch_fixtures()
        self._parse_fixtures(fixtures_data)
        print(f"  ✓ Loaded {len(self.fixtures)} fixtures")
        
        self._snapshot_price_history()
        
        print("✅ Data ingestion complete!")

    def _snapshot_price_history(self) -> None:
        """Save a daily snapshot of player prices and ownership to the database."""
        try:
            from models import db, PlayerPriceHistory
            from flask import current_app
            
            if current_app:
                from datetime import datetime
                today = datetime.utcnow().date()
                
                # Check for existing snapshot today
                recent_snap = PlayerPriceHistory.query.first()
                if recent_snap and recent_snap.recorded_at.date() == today:
                    return # Already snapped today
                    
                for p in self.players:
                    history = PlayerPriceHistory(
                        player_id=p.id,
                        gameweek=self.current_gw,
                        price=p.price,
                        selected_by_percent=p.selected_by_percent
                    )
                    db.session.add(history)
                db.session.commit()
                print("  ✓ Saved daily price & ownership snapshots successfully")
        except Exception as e:
            print(f"  ⚠️ Could not save price history to DB: {e}")
    
    def _parse_teams(self, teams_data: list) -> None:
        """Parse team data from API response."""
        for t in teams_data:
            team = Team(
                id=t["id"],
                name=t["name"],
                short_name=t["short_name"],
                strength=t["strength"],
                strength_attack_home=t["strength_attack_home"],
                strength_attack_away=t["strength_attack_away"],
                strength_defence_home=t["strength_defence_home"],
                strength_defence_away=t["strength_defence_away"]
            )
            self.teams[team.id] = team
    
    def _parse_gameweeks(self, events_data: list) -> None:
        """Parse gameweek data from API response."""
        for e in events_data:
            gw = Gameweek(
                id=e["id"],
                name=e["name"],
                deadline_time=e["deadline_time"],
                is_current=e["is_current"],
                is_next=e["is_next"],
                finished=e["finished"],
                average_entry_score=e["average_entry_score"] or 0
            )
            self.gameweeks.append(gw)
            
            if gw.is_current:
                self.current_gw = gw.id
            if gw.is_next:
                self.next_gw = gw.id
    
    def _parse_players(self, elements_data: list) -> None:
        """Parse player data from API response."""
        for p in elements_data:
            # Skip unavailable players
            if p["status"] == "u":
                continue
                
            player = Player(
                id=p["id"],
                web_name=p["web_name"],
                team_id=p["team"],
                team_name=self.teams[p["team"]].short_name if p["team"] in self.teams else "???",
                position=self._position_map.get(p["element_type"], "???"),
                price=p["now_cost"] / 10,
                total_points=p["total_points"],
                points_per_game=float(p["points_per_game"]),
                form=float(p["form"]),
                minutes=p["minutes"],
                goals_scored=p["goals_scored"],
                assists=p["assists"],
                clean_sheets=p["clean_sheets"],
                expected_goals=float(p["expected_goals"]),
                expected_assists=float(p["expected_assists"]),
                expected_goal_involvements=float(p["expected_goal_involvements"]),
                influence=float(p["influence"]),
                creativity=float(p["creativity"]),
                threat=float(p["threat"]),
                ict_index=float(p["ict_index"]),
                chance_of_playing=p["chance_of_playing_next_round"],
                selected_by_percent=float(p["selected_by_percent"]),
                transfers_in_event=p["transfers_in_event"],
                transfers_out_event=p["transfers_out_event"],
                bonus=p["bonus"],
                bps=p["bps"],
                news=p["news"] or "",
                status=p["status"]
            )
            self.players.append(player)
    
    def _parse_fixtures(self, fixtures_data: list) -> None:
        """Parse fixture data from API response."""
        for f in fixtures_data:
            fixture = Fixture(
                id=f["id"],
                event=f["event"] if f["event"] else 0,
                team_h=f["team_h"],
                team_a=f["team_a"],
                team_h_difficulty=f["team_h_difficulty"],
                team_a_difficulty=f["team_a_difficulty"],
                finished=f["finished"]
            )
            self.fixtures.append(fixture)
    
    def get_upcoming_fixtures(self, gameweeks: int = 5) -> list[Fixture]:
        """Get fixtures for upcoming gameweeks."""
        return [
            f for f in self.fixtures 
            if self.next_gw <= f.event < self.next_gw + gameweeks
        ]
    
    def get_player_fixtures(self, player: Player, gameweeks: int = 5) -> list[dict]:
        """Get upcoming fixtures for a specific player's team."""
        upcoming = self.get_upcoming_fixtures(gameweeks)
        player_fixtures = []
        
        for f in upcoming:
            if f.team_h == player.team_id:
                opp = self.teams.get(f.team_a, None)
                player_fixtures.append({
                    "gw": f.event,
                    "opponent": opp.short_name if opp else "???",
                    "home": True,
                    "difficulty": f.team_h_difficulty
                })
            elif f.team_a == player.team_id:
                opp = self.teams.get(f.team_h, None)
                player_fixtures.append({
                    "gw": f.event,
                    "opponent": opp.short_name if opp else "???",
                    "home": False,
                    "difficulty": f.team_a_difficulty
                })
        
        return sorted(player_fixtures, key=lambda x: x["gw"])
    
    def get_players_by_position(self, position: str) -> list[Player]:
        """Get all players of a specific position."""
        return [p for p in self.players if p.position == position]
    
    def get_top_players_by_form(self, n: int = 20) -> list[Player]:
        """Get top N players by current form."""
        available = [p for p in self.players if p.status == "a"]
        return sorted(available, key=lambda x: x.form, reverse=True)[:n]
    
    def to_dict(self) -> dict:
        """Export data as dictionary for JSON serialization."""
        return {
            "current_gw": self.current_gw,
            "next_gw": self.next_gw,
            "players": [
                {
                    "id": p.id,
                    "name": p.web_name,
                    "team": p.team_name,
                    "position": p.position,
                    "price": p.price,
                    "form": p.form,
                    "total_points": p.total_points,
                    "ppg": p.points_per_game,
                    "xG": p.expected_goals,
                    "xA": p.expected_assists,
                    "xGI": p.expected_goal_involvements,
                    "ict": p.ict_index,
                    "selected": p.selected_by_percent,
                    "status": p.status,
                    "news": p.news
                }
                for p in self.players
            ],
            "teams": {
                tid: {"name": t.name, "short": t.short_name}
                for tid, t in self.teams.items()
            }
        }


if __name__ == "__main__":
    # Test the data ingestion
    agent = FPLDataIngestion()
    agent.ingest_all_data()
    
    # Show top players by form
    print("\n📊 Top 10 Players by Form:")
    print("-" * 60)
    for i, p in enumerate(agent.get_top_players_by_form(10), 1):
        fixtures = agent.get_player_fixtures(p, 3)
        fix_str = ", ".join([f"{f['opponent']}({'H' if f['home'] else 'A'})" for f in fixtures[:3]])
        print(f"{i:2}. {p.web_name:15} ({p.team_name}) | Form: {p.form:.1f} | £{p.price:.1f}m | Next: {fix_str}")
