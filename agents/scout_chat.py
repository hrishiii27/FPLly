"""
FPL-Agent: Scout Chat
Keyword router over live agents — not a general LLM. Intents are matched
with whole phrases so short tokens like "c" do not hijack every message.
"""

from typing import Optional
import re


class ScoutChatAgent:
    """Conversational FPL scout backed by the same prediction agents as the UI."""

    def __init__(self, agents: dict):
        self.agents = agents

    def get_response(self, query: str) -> str:
        raw = (query or "").strip()
        if not raw:
            return self._help()
        q = raw.lower()
        gw = self.agents["data"].next_gw

        if self._is_help(q):
            return self._help(gw)
        if self._is_captain(q):
            return self._get_captain_advice(gw)
        if self._is_chip(q):
            return self._get_chip_advice(gw)
        if self._is_differential(q):
            return self._get_differential_advice()
        if self._is_transfer(q):
            return self._get_transfer_advice(gw)
        if self._is_team(q):
            return self._get_optimal_team_advice(gw)
        if self._is_fixture(q):
            return self._get_fixture_advice(gw)

        player = self._find_player_in_query(q)
        if player:
            return self._get_player_analysis(player)

        if any(w in q.split() for w in ("hi", "hello", "hey", "yo")):
            return (
                f"Scout on GW{gw}. Ask **who to captain**, **nailed transfers**, "
                f"**differentials**, **chips**, or a player name like **Salah**."
            )
        return self._help(gw)

    def _help(self, gw: int = None) -> str:
        gw = gw or self.agents["data"].next_gw
        return (
            f"### Scout (GW{gw})\n\n"
            "I am a **stats router**, not ChatGPT — I pull from the same models as the tabs.\n\n"
            "Try:\n"
            "- **Who should I captain?**\n"
            "- **Who should I transfer in?**\n"
            "- **Best differentials**\n"
            "- **Wildcard / bench boost / triple captain**\n"
            "- **Optimal XI**\n"
            "- A **player name** (Salah, Palmer, …)\n"
        )

    def _is_help(self, q: str) -> bool:
        return q in ("help", "?", "what can you do") or "what can you" in q

    def _is_captain(self, q: str) -> bool:
        return bool(re.search(r"\b(captain|captains|armband|triple cap|\btc\b|who (do i|should i) cap)\b", q))

    def _is_chip(self, q: str) -> bool:
        return bool(re.search(r"\b(chip|wildcard|\bwc\b|free hit|\bfh\b|bench boost|\bbb\b|triple captain)\b", q))

    def _is_differential(self, q: str) -> bool:
        return bool(re.search(r"\b(differential|low owned|under.?owned|punt)\b", q))

    def _is_transfer(self, q: str) -> bool:
        return bool(re.search(r"\b(transfer|bring in|ship out|who (do i|should i) buy|wildcard in)\b", q))

    def _is_team(self, q: str) -> bool:
        return bool(re.search(r"\b(best team|optimal|dream team|best xi|wildcard team)\b", q))

    def _is_fixture(self, q: str) -> bool:
        return bool(re.search(r"\b(fixture|fdr|easy run|blank|double)\b", q))

    def _get_captain_advice(self, gw: int) -> str:
        preds = self.agents["predictions"].get_captain_picks(3)
        if not preds:
            return "No nailed attacking captains this week (blank or injury flags)."
        lines = [f"### Captaincy GW{gw}\n", "Nailed midfielders/forwards only — rotation options are excluded.\n"]
        for i, p in enumerate(preds):
            tag = "Top pick" if i == 0 else "Alternative"
            lines.append(
                f"**{tag}: {p.player_name}** ({p.team}) — {p.expected_points} xPts, {p.minutes_tag}. {p.fixture_info}."
            )
        return "\n\n".join(lines)

    def _get_chip_advice(self, gw: int) -> str:
        advisor = self.agents.get("chips")
        if not advisor:
            return "Chip advisor is not ready yet."
        recs = advisor.get_chip_recommendations()
        if not recs:
            return "Hold chips — nothing scores as a play-now week."
        top = recs[0]
        name = top.chip_name.replace("_", " ").title()
        if top.score >= 70:
            return f"### Chips GW{gw}\n\n**Play {name}** ({top.score}/100). {top.reason}"
        return (
            f"### Chips GW{gw}\n\n**Hold.** Best unused option is {name} "
            f"({top.score}/100) but the week is not strong enough to force it. {top.reason}"
        )

    def _get_differential_advice(self) -> str:
        finder = self.agents.get("differentials")
        if not finder:
            return "Differential finder is still loading."
        diffs = finder.find_differentials()[:5]
        if not diffs:
            return "No nailed starters under 10% ownership clearing the xPts bar this week."
        lines = ["### Differentials\n", "Nailed starters, 1–10% owned — not 0.2% kids who never start.\n"]
        for p in diffs:
            lines.append(
                f"**{p.player_name}** ({p.team}, {p.position}) £{p.price}m · {p.ownership}% · "
                f"**{p.xpts} xPts** · {p.fixture_info}\n{p.reason}"
            )
        return "\n\n".join(lines)

    def _get_transfer_advice(self, gw: int) -> str:
        opt = self.agents.get("optimizer")
        pred = self.agents["predictions"]
        if not opt:
            return "Optimizer not ready."
        squad = opt.optimize_team()
        targets = [p for p in squad.starting_xi if p.position in ("MID", "FWD")][:5]
        lines = [
            f"### Transfers GW{gw}\n",
            "These are **nailed starters** from the £100m XI — not leftover-budget fillers.\n",
            "**Priority ins:**",
        ]
        for p in targets:
            lines.append(f"- **{p.player_name}** ({p.team}) £{p.price}m · {p.expected_points} xPts · {p.minutes_tag}")
        values = pred.get_value_picks(max_price=6.5, n=4)
        if values:
            lines.append("\n**Cheap nailed enablers:**")
            for p in values:
                lines.append(f"- **{p.player_name}** £{p.price}m · {p.expected_points} xPts")
        return "\n".join(lines)

    def _get_optimal_team_advice(self, gw: int) -> str:
        optimizer = self.agents.get("optimizer")
        squad = optimizer.optimize_team()
        lines = [
            f"### Scout XI GW{gw}\n",
            f"**{squad.formation}** · {squad.expected_points} xPts · £{squad.total_price}m",
            f"Captain **{squad.captain.player_name}** (nailed attackers preferred).\n",
            "**XI:**",
        ]
        for p in sorted(squad.starting_xi, key=lambda x: ["GKP", "DEF", "MID", "FWD"].index(x.position)):
            lines.append(f"- {p.position} **{p.player_name}** ({p.team}) {p.expected_points} xPts · {p.minutes_tag}")
        return "\n".join(lines)

    def _get_fixture_advice(self, gw: int) -> str:
        fx = self.agents.get("fixtures")
        if not fx:
            return "Fixture agent not ready."
        # Best attack fixtures if the agent exposes per-player runs
        preds = sorted(
            [p for p in self.agents["predictions"].predictions.values() if p.minutes_tag == "Nailed" and p.gw_multiplier > 0],
            key=lambda p: p.expected_points,
            reverse=True,
        )[:8]
        lines = [f"### Fixtures GW{gw}\n", "Highest xPts among **nailed** players (FDR baked into the forecast):\n"]
        for p in preds:
            lines.append(f"- **{p.player_name}** {p.fixture_info} · {p.expected_points} xPts")
        return "\n".join(lines)

    def _find_player_in_query(self, query: str) -> Optional[object]:
        stop = {"who", "is", "the", "a", "to", "for", "my", "should", "i", "good", "stats", "about", "on"}
        tokens = [t for t in re.findall(r"[a-z0-9']+", query.lower()) if t not in stop and len(t) > 2]
        if not tokens:
            return None
        best = None
        best_n = 0
        for pred in self.agents["predictions"].predictions.values():
            name = pred.player_name.lower()
            hits = sum(1 for t in tokens if t in name.split() or name.startswith(t) or t in name)
            if hits == 0:
                continue
            score = hits * 10 + (20 if name in query else 0) + len(name)
            if score > best_n:
                best_n = score
                best = pred
        return best if best_n >= 10 else None

    def _get_player_analysis(self, player) -> str:
        tag = player.minutes_tag
        startable = tag == "Nailed"
        if not startable:
            verdict = f"Not a nailed starter ({tag}) — do not force him in just because he is cheap."
        elif player.expected_points >= 6.0:
            verdict = "Essential nailed attacker."
        elif player.expected_points >= 4.0:
            verdict = "Solid starter if the price fits."
        else:
            verdict = "Nailed but the fixture/xPts are modest — only as an enabler."
        return (
            f"### {player.player_name}\n\n"
            f"**{player.expected_points} xPts** · {player.position} · {player.team} · "
            f"£{player.price}m · **{tag}** · {player.fixture_info}\n\n"
            f"{verdict}\n\n"
            f"Goal {player.goal_probability}% · Assist {player.assist_probability}% · form {player.form_trend}."
        )
