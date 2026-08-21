"""
FPL-Agent: Historical Data Agent
Fetches and analyzes historical FPL data from vaastav/Fantasy-Premier-League.
Data source: https://github.com/vaastav/Fantasy-Premier-League
"""

import os
from dataclasses import dataclass
from io import StringIO
from typing import Optional

import pandas as pd
import requests


CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "historical_cache")


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


class HistoricalDataAgent:
    """Agent that fetches and processes historical FPL data from GitHub."""

    BASE_URL = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data"
    # Most recent 5 seasons, including 2025-26
    SEASONS = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]

    def __init__(self):
        self.player_history: dict[str, PlayerHistoricalStats] = {}
        self.merged_gw_data: dict[str, pd.DataFrame] = {}
        self.fixture_data: dict[str, pd.DataFrame] = {}
        self.loaded = False

    def fetch_season_data(self, season: str) -> Optional[pd.DataFrame]:
        """Fetch merged gameweek data for a season, with local cache + per-GW fallback."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        cache_path = os.path.join(CACHE_DIR, f"{season}_merged_gw.csv")

        if os.path.exists(cache_path):
            try:
                df = pd.read_csv(cache_path)
                print(f"  ✓ Loaded {season} from cache: {len(df)} GW records")
                return df
            except Exception as e:
                print(f"  ⚠️ Cache unreadable for {season}: {e}")

        df = self._download_merged_gw(season)
        if df is None:
            df = self._download_individual_gws(season)

        if df is not None and len(df) > 0:
            try:
                df.to_csv(cache_path, index=False)
            except Exception:
                pass
            print(f"  ✓ Loaded {season}: {len(df)} GW records")
            return df

        print(f"  ✗ Failed to load {season}")
        return None

    def _download_merged_gw(self, season: str) -> Optional[pd.DataFrame]:
        url = f"{self.BASE_URL}/{season}/gws/merged_gw.csv"
        try:
            response = requests.get(url, timeout=45)
            if response.status_code != 200:
                return None
            return pd.read_csv(StringIO(response.text))
        except Exception:
            return None

    def _download_individual_gws(self, season: str) -> Optional[pd.DataFrame]:
        """Some seasons (e.g. in-progress) ship per-GW CSVs instead of merged_gw.csv."""
        frames = []
        for gw in range(1, 39):
            url = f"{self.BASE_URL}/{season}/gws/gw{gw}.csv"
            try:
                response = requests.get(url, timeout=20)
                if response.status_code != 200:
                    if gw == 1:
                        return None
                    break
                gw_df = pd.read_csv(StringIO(response.text))
                if "GW" not in gw_df.columns:
                    gw_df["GW"] = gw
                frames.append(gw_df)
            except Exception:
                if gw == 1:
                    return None
                break

        if not frames:
            return None
        return pd.concat(frames, ignore_index=True)

    def load_all_historical_data(self):
        """Load historical data from all configured seasons."""
        if self.loaded:
            return

        print("📚 Loading historical FPL data...")

        for season in self.SEASONS:
            df = self.fetch_season_data(season)
            if df is not None:
                fx = self.fetch_season_fixtures(season)
                if fx is not None:
                    self.fixture_data[season] = fx
                    df = self.attach_fdr(df, season)
                else:
                    df = df.copy()
                    df["fdr"] = 3
                self.merged_gw_data[season] = df

        self.loaded = True
        print(f"✅ Loaded {len(self.merged_gw_data)} seasons of historical data")

    def fetch_season_fixtures(self, season: str) -> Optional[pd.DataFrame]:
        """FPL fixture list with official FDR (team_h/a_difficulty), known pre-match."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        cache_path = os.path.join(CACHE_DIR, f"{season}_fixtures.csv")
        usecols = ["id", "event", "team_h", "team_a", "team_h_difficulty", "team_a_difficulty"]

        if os.path.exists(cache_path):
            try:
                return pd.read_csv(cache_path)
            except Exception:
                pass

        url = f"{self.BASE_URL}/{season}/fixtures.csv"
        try:
            response = requests.get(url, timeout=45)
            if response.status_code != 200:
                return None
            df = pd.read_csv(StringIO(response.text))
            keep = [c for c in usecols if c in df.columns]
            df = df[keep]
            df.to_csv(cache_path, index=False)
            print(f"  ✓ Loaded {season} fixtures ({len(df)} matches)")
            return df
        except Exception as e:
            print(f"  ⚠️ Fixtures missing for {season}: {e}")
            return None

    def attach_fdr(self, gw_df: pd.DataFrame, season: str) -> pd.DataFrame:
        """Join official FDR onto each player-GW. Pre-match info only — not leakage."""
        df = gw_df.copy()
        fx = self.fixture_data.get(season)
        if fx is None or fx.empty:
            df["fdr"] = 3
            return df

        fx = fx.rename(columns={"id": "fixture_id"})
        if "fixture" in df.columns:
            df = df.copy()
            df["fixture"] = pd.to_numeric(df["fixture"], errors="coerce")
            fx = fx.copy()
            fx["fixture_id"] = pd.to_numeric(fx["fixture_id"], errors="coerce")
            merged = df.merge(
                fx,
                left_on="fixture",
                right_on="fixture_id",
                how="left",
                suffixes=("", "_fx"),
            )
        else:
            df["fdr"] = 3
            return df

        home_flag = merged["was_home"] if "was_home" in merged.columns else False
        if hasattr(home_flag, "astype"):
            home_flag = home_flag.astype(str).str.lower().isin(["true", "1", "yes"])

        h_diff = pd.to_numeric(merged.get("team_h_difficulty"), errors="coerce")
        a_diff = pd.to_numeric(merged.get("team_a_difficulty"), errors="coerce")
        merged["fdr"] = h_diff.where(home_flag, a_diff).fillna(3).clip(1, 5).astype(int)

        drop_cols = [c for c in ["fixture_id", "team_h_difficulty", "team_a_difficulty", "event"] if c in merged.columns]
        return merged.drop(columns=drop_cols, errors="ignore")

    def _match_player(self, df: pd.DataFrame, player_name: str) -> pd.DataFrame:
        if "name" not in df.columns:
            return df.iloc[0:0]
        name_col = df["name"].astype(str)
        exact = df[name_col.str.lower() == player_name.lower()]
        if len(exact) > 0:
            return exact
        return df[name_col.str.lower().str.contains(player_name.lower(), na=False, regex=False)]

    def calculate_player_historical_stats(self, player_name: str) -> Optional[PlayerHistoricalStats]:
        """Calculate historical statistics for a player across all seasons."""
        if not self.loaded:
            self.load_all_historical_data()

        all_gw_data = []
        seasons_found = 0

        for _season, df in self.merged_gw_data.items():
            player_data = self._match_player(df, player_name)
            if len(player_data) > 0:
                all_gw_data.append(player_data)
                seasons_found += 1

        if not all_gw_data:
            return None

        combined = pd.concat(all_gw_data, ignore_index=True)

        total_points = combined["total_points"].sum() if "total_points" in combined.columns else 0
        total_goals = combined["goals_scored"].sum() if "goals_scored" in combined.columns else 0
        total_assists = combined["assists"].sum() if "assists" in combined.columns else 0

        total_xg = combined["expected_goals"].sum() if "expected_goals" in combined.columns else 0
        total_xa = combined["expected_assists"].sum() if "expected_assists" in combined.columns else 0

        xg_overperformance = total_goals - total_xg if total_xg > 0 else 0
        xa_overperformance = total_assists - total_xa if total_xa > 0 else 0

        avg_minutes = combined["minutes"].mean() if "minutes" in combined.columns else 0
        avg_points = combined["total_points"].mean() if "total_points" in combined.columns else 0

        points_std = combined["total_points"].std() if "total_points" in combined.columns else 0
        consistency_score = max(0, 10 - points_std) if points_std < 10 else 0

        return PlayerHistoricalStats(
            player_name=player_name,
            seasons_played=seasons_found,
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

    def get_top_overperformers(self, limit: int = 20) -> list[dict]:
        """Get players who consistently overperform their xG."""
        if not self.loaded:
            self.load_all_historical_data()

        latest = None
        for season in reversed(self.SEASONS):
            if season in self.merged_gw_data:
                latest = season
                break

        if latest is None:
            return []

        recent_players = self.merged_gw_data[latest]["name"].unique()

        overperformers = []
        for player in recent_players[:120]:
            stats = self.calculate_player_historical_stats(player)
            if stats and stats.total_xg > 5:
                overperformers.append({
                    "name": player,
                    "xg_overperformance": stats.xg_overperformance,
                    "total_goals": stats.total_goals,
                    "total_xg": stats.total_xg,
                    "seasons": stats.seasons_played
                })

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
    agent = HistoricalDataAgent()
    agent.load_all_historical_data()

    stats = agent.calculate_player_historical_stats("Salah")
    if stats:
        print(f"\n📊 {stats.player_name}:")
        print(f"  Total Points: {stats.total_points}")
        print(f"  Goals: {stats.total_goals} (xG: {stats.total_xg})")
        print(f"  xG Overperformance: {stats.xg_overperformance:+.2f}")
        print(f"  Consistency: {stats.consistency_score}/10")
