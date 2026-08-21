"""
FPL-Agent: Squad Optimization Agent
Optimizes squads under FPL constraints.
"""

from dataclasses import dataclass, field
from .data_ingestion import FPLDataIngestion
from .points_predictor import PointsPrediction, PointsPredictionAgent


@dataclass
class TransferRecommendation:
    """A recommended transfer."""
    player_out_id: int
    player_out_name: str
    player_out_team: str
    player_out_price: float
    player_out_xpts: float
    player_out_xpts_next_5: float
    
    player_in_id: int
    player_in_name: str
    player_in_team: str
    player_in_price: float
    player_in_xpts: float
    player_in_xpts_next_5: float
    
    points_gain: float
    points_gain_next_5: float
    price_change: float
    reason: str


@dataclass
class OptimizedSquad:
    """An optimized FPL squad."""
    starting_xi: list[PointsPrediction]
    bench: list[PointsPrediction]
    captain: PointsPrediction
    vice_captain: PointsPrediction
    
    total_price: float
    expected_points: float
    
    formation: str  # e.g., "3-5-2"


class SquadOptimizer:
    """Agent for optimizing FPL squads."""
    
    # FPL Constraints
    BUDGET = 100.0
    SQUAD_SIZE = 15
    MAX_PER_TEAM = 3
    POSITION_LIMITS = {"GKP": 2, "DEF": 5, "MID": 5, "FWD": 3}
    MIN_PLAY = {"GKP": 1, "DEF": 3, "MID": 2, "FWD": 1}
    MAX_PLAY = {"GKP": 1, "DEF": 5, "MID": 5, "FWD": 3}
    MIN_COST = {"GKP": 4.0, "DEF": 4.0, "MID": 4.5, "FWD": 4.5}
    
    def __init__(self, prediction_agent: PointsPredictionAgent):
        self.predictions = prediction_agent
        self.data = prediction_agent.data

    def _ownership(self, p: PointsPrediction) -> float:
        pl = next((x for x in self.data.players if x.id == p.player_id), None)
        return pl.selected_by_percent if pl else 0.0

    def _start_score(self, p: PointsPrediction) -> float:
        """xPts first; mild minutes/ownership so premiums beat random 6.0s."""
        tag = (p.minutes_tag or "").lower()
        if tag in ("injured", "suspended") or p.gw_multiplier <= 0:
            return 0.0
        weight = {
            "nailed": 1.0,
            "rotation risk": 0.88,
            "minutes-managed": 0.62,
            "unknown": 0.9,
        }.get(tag, 0.85)
        return p.expected_points * weight + 0.015 * self._ownership(p)

    def _is_starter(self, p: PointsPrediction, allow_rotation: bool = False) -> bool:
        if p.gw_multiplier <= 0 or p.expected_points <= 0:
            return False
        tag = p.minutes_tag
        if tag in ("Injured", "Suspended"):
            return False
        if tag == "Nailed" or tag in ("unknown", "Unknown"):
            return True
        if tag == "Rotation Risk":
            return True if allow_rotation or self._ownership(p) >= 8 else allow_rotation
        # Minutes-Managed: still allow template / premium names
        return allow_rotation or self._ownership(p) >= 10 or p.price >= 8.0

    def _min_fill_cost(self, position_counts: dict) -> float:
        return sum(
            max(0, self.POSITION_LIMITS[pos] - position_counts[pos]) * self.MIN_COST[pos]
            for pos in self.POSITION_LIMITS
        )
    
    def _can_add(self, player, selected_ids, team_counts, position_counts, total_cost, budget) -> bool:
        if player.player_id in selected_ids:
            return False
        if position_counts[player.position] >= self.POSITION_LIMITS[player.position]:
            return False
        if team_counts.get(player.team, 0) >= self.MAX_PER_TEAM:
            return False
        new_counts = dict(position_counts)
        new_counts[player.position] += 1
        if total_cost + player.price + self._min_fill_cost(new_counts) > budget + 0.05:
            return False
        return True
    
    def optimize_team(self, budget: float = 100.0) -> OptimizedSquad:
        """Build a 15: nailed starters first, cheap nailed enablers last — never injured fillers."""
        nailed = [p for p in self.predictions.predictions.values() if self._is_starter(p)]
        rotation = [p for p in self.predictions.predictions.values() if self._is_starter(p, allow_rotation=True)]

        selected = []
        selected_ids = set()
        team_counts = {}
        position_counts = {"GKP": 0, "DEF": 0, "MID": 0, "FWD": 0}
        total_cost = 0.0

        def try_add(pool, key):
            nonlocal total_cost
            for p in sorted(pool, key=key, reverse=True):
                if len(selected) >= self.SQUAD_SIZE:
                    return
                if self._can_add(p, selected_ids, team_counts, position_counts, total_cost, budget):
                    selected.append(p)
                    selected_ids.add(p.player_id)
                    position_counts[p.position] += 1
                    team_counts[p.team] = team_counts.get(p.team, 0) + 1
                    total_cost += p.price

        # 1) Highest xPts among startable players (Haaland/Bruno before cheap CS bait)
        try_add(nailed, lambda x: (self._start_score(x), x.expected_points))
        # 2) Fill remaining slots with the cheapest startable enablers (not 0%-owned kids)
        if len(selected) < self.SQUAD_SIZE:
            leftovers = [p for p in rotation if p.player_id not in selected_ids]
            leftovers = [p for p in leftovers if self._ownership(p) >= 0.5 or p.price <= 5.0]
            for p in sorted(leftovers, key=lambda x: (x.price, -self._start_score(x))):
                if len(selected) >= self.SQUAD_SIZE:
                    break
                if self._can_add(p, selected_ids, team_counts, position_counts, total_cost, budget):
                    selected.append(p)
                    selected_ids.add(p.player_id)
                    position_counts[p.position] += 1
                    team_counts[p.team] = team_counts.get(p.team, 0) + 1
                    total_cost += p.price
        if len(selected) < self.SQUAD_SIZE:
            try_add(rotation, lambda x: (self._start_score(x), x.expected_points))
        
        starting = self._select_starting_xi(selected)
        bench = [p for p in selected if p.player_id not in {s.player_id for s in starting}]
        bench.sort(key=lambda x: x.expected_points, reverse=True)
        
        if not starting:
            starting = selected[:11]
            bench = selected[11:]
        
        attackers = [p for p in starting if p.position in ("MID", "FWD") and self._is_starter(p)]
        cap_pool = attackers or [p for p in starting if self._start_score(p) > 0] or starting
        captain = max(cap_pool, key=lambda x: (self._start_score(x), x.expected_points))
        remaining = [p for p in starting if p.player_id != captain.player_id]
        vice_captain = max(remaining, key=lambda x: (self._start_score(x), x.expected_points)) if remaining else captain
        
        formation = self._get_formation(starting)
        xpts = sum(p.expected_points for p in starting) + captain.expected_points
        
        return OptimizedSquad(
            starting_xi=starting,
            bench=bench,
            captain=captain,
            vice_captain=vice_captain,
            total_price=round(total_cost, 1),
            expected_points=round(xpts, 2),
            formation=formation
        )
    
    def _select_starting_xi(self, squad: list[PointsPrediction]) -> list[PointsPrediction]:
        """Select the best starting XI from a 15-man squad."""
        
        # Separate by position
        by_pos = {"GKP": [], "DEF": [], "MID": [], "FWD": []}
        for p in squad:
            by_pos[p.position].append(p)
        
        for pos in by_pos:
            by_pos[pos].sort(key=lambda x: (self._start_score(x), x.expected_points), reverse=True)
        
        starting = []
        
        # Must have 1 GKP
        if by_pos["GKP"]:
            starting.append(by_pos["GKP"][0])
        
        # Must have at least 3 DEF
        starting.extend(by_pos["DEF"][:3])
        
        # Must have at least 2 MID
        starting.extend(by_pos["MID"][:2])
        
        # Must have at least 1 FWD
        starting.extend(by_pos["FWD"][:1])
        
        # Fill remaining 4 spots with best available
        remaining = (
            by_pos["DEF"][3:] + 
            by_pos["MID"][2:] + 
            by_pos["FWD"][1:]
        )
        remaining.sort(key=lambda x: (self._start_score(x), x.expected_points), reverse=True)
        
        slots_left = 11 - len(starting)
        for p in remaining[:slots_left]:
            # Check position maximums
            current_pos_count = len([s for s in starting if s.position == p.position])
            if current_pos_count < self.MAX_PLAY[p.position]:
                starting.append(p)
        
        return starting[:11]
    
    def _get_formation(self, starting: list[PointsPrediction]) -> str:
        """Get formation string from starting XI."""
        counts = {"DEF": 0, "MID": 0, "FWD": 0}
        for p in starting:
            if p.position in counts:
                counts[p.position] += 1
        return f"{counts['DEF']}-{counts['MID']}-{counts['FWD']}"
    
    def suggest_transfers(
        self, 
        current_squad: list[int],  # Player IDs
        free_transfers: int = 1,
        budget: float = 0.0  # Extra budget available
    ) -> list[TransferRecommendation]:
        """Suggest transfers to improve a squad."""
        
        recommendations = []
        
        current_preds = [
            self.predictions.predictions.get(pid)
            for pid in current_squad
            if pid in self.predictions.predictions
        ]
        current_preds = [p for p in current_preds if p is not None]

        # Sell the least startable first (injured / benched), not the cheapest
        current_preds.sort(key=lambda x: (self._start_score(x), x.expected_points_next_5))
        
        for weak in current_preds[:6]:
            team_counts = {}
            for p in current_preds:
                if p.player_id != weak.player_id:
                    team_counts[p.team] = team_counts.get(p.team, 0) + 1
            
            replacements = [
                p for p in self.predictions.predictions.values()
                if p.position == weak.position
                and p.player_id not in current_squad
                and self._is_starter(p, allow_rotation=True)
                and self._start_score(p) > self._start_score(weak) + 0.25
                and p.expected_points_next_5 > weak.expected_points_next_5
                and team_counts.get(p.team, 0) < self.MAX_PER_TEAM
                and p.price <= weak.price + budget
            ]
            
            if replacements:
                best = max(replacements, key=lambda x: (self._start_score(x), x.expected_points_next_5))
                points_gain_next_5 = best.expected_points_next_5 - weak.expected_points_next_5
                points_gain = best.expected_points - weak.expected_points
                
                if points_gain_next_5 >= 2.0:
                    recommendations.append(TransferRecommendation(
                        player_out_id=weak.player_id,
                        player_out_name=weak.player_name,
                        player_out_team=weak.team,
                        player_out_price=weak.price,
                        player_out_xpts=weak.expected_points,
                        player_out_xpts_next_5=weak.expected_points_next_5,
                        player_in_id=best.player_id,
                        player_in_name=best.player_name,
                        player_in_team=best.team,
                        player_in_price=best.price,
                        player_in_xpts=best.expected_points,
                        player_in_xpts_next_5=best.expected_points_next_5,
                        points_gain=round(points_gain, 2),
                        points_gain_next_5=round(points_gain_next_5, 2),
                        price_change=round(best.price - weak.price, 1),
                        reason=(
                            f"{best.player_name} is a nailed starter ({best.minutes_tag}, "
                            f"{best.expected_points_next_5:.1f} vs {weak.expected_points_next_5:.1f} over 5 GWs)."
                        )
                    ))
        
        # Sort by points gain horizon
        recommendations.sort(key=lambda x: x.points_gain_next_5, reverse=True)
        return recommendations[:free_transfers + 2]  # Show a few extra options
    
    def analyze_hit_worth(
        self,
        recommendations: list[TransferRecommendation],
        free_transfers: int = 1,
        gameweeks: int = 5
    ) -> dict:
        """Analyze if taking hits (-4) is worth it."""
        
        if len(recommendations) <= free_transfers:
            return {
                "recommendation": "Use free transfers only",
                "hit_cost": 0,
                "total_gain": sum(r.points_gain for r in recommendations[:free_transfers]),
                "breakeven_gws": 0
            }
        
        # Calculate Horizon gains (since hits take time to pay off)
        free_only_gain_next_5 = sum(r.points_gain_next_5 for r in recommendations[:free_transfers])
        
        results = []
        for extra_hits in range(1, min(4, len(recommendations) - free_transfers + 1)):
            total_transfers = free_transfers + extra_hits
            
            transfer_gain_gw1 = sum(r.points_gain for r in recommendations[:total_transfers])
            transfer_gain_next_5 = sum(r.points_gain_next_5 for r in recommendations[:total_transfers])
            
            hit_cost = extra_hits * 4
            net_gain_gw1 = transfer_gain_gw1 - hit_cost
            net_gain_horizon = transfer_gain_next_5 - hit_cost
            
            # How many GWs to break even on the hit
            per_gw_gain = transfer_gain_next_5 / gameweeks
            breakeven = hit_cost / per_gw_gain if per_gw_gain > 0 else 999
            
            results.append({
                "hits": extra_hits,
                "transfers": total_transfers,
                "points_gain": transfer_gain_gw1, # UI expects 1GW
                "points_gain_next_5": transfer_gain_next_5,
                "hit_cost": hit_cost,
                "net_gain_gw1": net_gain_gw1,
                "net_gain_horizon": net_gain_horizon,
                "breakeven_gws": round(breakeven, 1)
            })
        
        # Find best option
        best = max(results, key=lambda x: x["net_gain_horizon"])
        
        if best["net_gain_horizon"] > free_only_gain_next_5:
            recommendation = f"Take {best['hits']} hit(s) for {best['transfers']} transfers"
        else:
            recommendation = "Use free transfers only"
        
        return {
            "recommendation": recommendation,
            "hit_cost": best["hit_cost"] if best["net_gain_horizon"] > free_only_gain_next_5 else 0,
            "total_gain": best["net_gain_horizon"],
            "breakeven_gws": best["breakeven_gws"],
            "options": results
        }


if __name__ == "__main__":
    from .data_ingestion import FPLDataIngestion
    from .player_form import PlayerFormAgent
    from .minutes_risk import MinutesRiskAgent
    from .fixture_analysis import FixtureAnalysisAgent
    
    print("🚀 Initializing Squad Optimizer...")
    
    # Initialize agents
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
    
    # Optimize a team
    print("\n🏆 Optimal Squad:")
    print("=" * 70)
    
    squad = optimizer.optimize_team(budget=100.0)
    
    print(f"\nFormation: {squad.formation}")
    print(f"Total Cost: £{squad.total_price}m")
    print(f"Expected Points: {squad.expected_points} (including captain)")
    
    print(f"\n👑 Captain: {squad.captain.player_name} (xPts: {squad.captain.expected_points:.2f})")
    print(f"🥈 Vice: {squad.vice_captain.player_name} (xPts: {squad.vice_captain.expected_points:.2f})")
    
    print("\n📋 Starting XI:")
    print("-" * 60)
    for p in sorted(squad.starting_xi, key=lambda x: ["GKP", "DEF", "MID", "FWD"].index(x.position)):
        cap = "👑" if p == squad.captain else ("🥈" if p == squad.vice_captain else "  ")
        print(f"{cap} {p.player_name:<15} ({p.team}) {p.position} | £{p.price:.1f}m | xPts: {p.expected_points:.2f}")
    
    print("\n🪑 Bench:")
    for i, p in enumerate(squad.bench, 1):
        print(f"   {i}. {p.player_name:<15} ({p.team}) {p.position} | £{p.price:.1f}m | xPts: {p.expected_points:.2f}")
