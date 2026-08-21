"""
FPL-Agent: Team Vision Agent
Reads an FPL squad screenshot (EasyOCR) or a pasted name list and matches
players to the live FPL player pool.
"""

import io
import os
import re
import ssl
from dataclasses import dataclass

import certifi
import numpy as np
from PIL import Image, ImageEnhance, ImageOps
from fuzzywuzzy import fuzz, process

from .data_ingestion import FPLDataIngestion, Player

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

try:
    ssl._create_default_https_context = ssl._create_unverified_context
except Exception:
    pass

_ocr_reader = None
_ocr_failed = False

SKIP_WORDS = {
    "gameweek", "points", "transfers", "value", "bank", "bench", "captain",
    "vice", "chip", "total", "free", "wildcard", "hit", "deadline", "average",
    "rank", "manager", "overall", "squad", "make", "view", "pick", "team",
    "gw", "pts", "used", "selected", "fwd", "def", "mid", "gkp", "price",
    "budget", "transfer", "remaining", "money", "itb", "auto", "subs",
    "triple", "boost", "lineup", "starting", "xi", "pitch", "save",
}


def get_ocr_reader():
    """Lazy-load EasyOCR. Returns None if the model cannot start."""
    global _ocr_reader, _ocr_failed

    if _ocr_failed:
        return None

    if _ocr_reader is None:
        try:
            os.environ["OMP_NUM_THREADS"] = "1"
            os.environ["MKL_NUM_THREADS"] = "1"
            import easyocr
            print("📷 Initializing EasyOCR (first time may take a minute)...")
            _ocr_reader = easyocr.Reader(
                ["en"],
                gpu=False,
                verbose=False,
                download_enabled=True,
            )
            print("✅ EasyOCR ready!")
        except Exception as e:
            print(f"❌ EasyOCR initialization failed: {e}")
            _ocr_failed = True
            return None
    return _ocr_reader


@dataclass
class DetectedPlayer:
    """A player detected from an image or pasted names."""
    raw_text: str
    matched_name: str
    player_id: int
    confidence: int
    matched: bool
    position: str = ""
    team: str = ""
    price: float = 0.0
    expected_points: float = 0.0


class TeamVisionAgent:
    """Match screenshot text / pasted names to FPL players."""

    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        self._rebuild_lookups()

    def _rebuild_lookups(self):
        self.player_by_web = {p.web_name.lower(): p for p in self.data.players}
        self.labels = []
        self.label_to_player: dict[str, Player] = {}
        for p in self.data.players:
            names = {
                p.web_name,
                p.second_name,
                f"{p.first_name} {p.second_name}".strip(),
                f"{p.first_name[0]}.{p.second_name}" if p.first_name else "",
            }
            for name in names:
                key = (name or "").strip()
                if len(key) < 2:
                    continue
                self.labels.append(key)
                self.label_to_player[key.lower()] = p

    def _preprocess(self, image: Image.Image) -> np.ndarray:
        if image.mode != "RGB":
            image = image.convert("RGB")
        # Upscale small phone screenshots so EasyOCR can read shirt names
        w, h = image.size
        if max(w, h) < 1200:
            scale = 1200 / max(w, h)
            image = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        image = ImageOps.autocontrast(image)
        image = ImageEnhance.Sharpness(image).enhance(1.4)
        return np.array(image)

    def extract_text_from_image(self, image_data: bytes) -> list[tuple]:
        try:
            image = Image.open(io.BytesIO(image_data))
            img_array = self._preprocess(image)
            reader = get_ocr_reader()
            if reader is None:
                return []
            return reader.readtext(img_array)
        except Exception as e:
            print(f"OCR Error: {e}")
            return []

    def parse_player_names(self, ocr_results: list[tuple]) -> list[str]:
        tokens = []
        for result in ocr_results:
            if len(result) < 2:
                continue
            text = str(result[1]).strip()
            confidence = result[2] if len(result) > 2 else 0.5
            if confidence < 0.28 or len(text) < 2:
                continue
            if re.match(r"^[\d\s£,.\-%]+$", text):
                continue
            if re.search(r"\([HA]\)", text) or re.search(r"\s[HA]$", text):
                continue
            lower = text.lower()
            if any(word in lower.split() for word in SKIP_WORDS):
                continue
            clean = re.sub(r"[^\w\s\-\'.]", "", text).strip(" .-'")
            clean = re.sub(r"\b[CV]\b", "", clean).strip()
            if len(clean) < 2 or clean.isdigit():
                continue
            tokens.append(clean)

        # Join one-letter initials with the next token: "B" + "Fernandes"
        merged = []
        skip_next = False
        for i, tok in enumerate(tokens):
            if skip_next:
                skip_next = False
                continue
            if len(tok) <= 2 and i + 1 < len(tokens) and tokens[i + 1][0].isupper():
                merged.append(f"{tok} {tokens[i + 1]}")
                skip_next = True
            else:
                merged.append(tok)
        return merged

    def match_player(self, name: str, threshold: int = 72) -> DetectedPlayer:
        needle = name.strip()
        if not needle:
            return DetectedPlayer(needle, "", 0, 0, False)

        exact = self.player_by_web.get(needle.lower()) or self.label_to_player.get(needle.lower())
        if exact:
            return self._from_player(needle, exact, 100)

        min_threshold = 82 if len(needle) <= 4 else threshold
        result = process.extractOne(needle, self.labels, scorer=fuzz.token_set_ratio)
        if result and result[1] >= min_threshold:
            player = self.label_to_player.get(result[0].lower())
            if player:
                return self._from_player(needle, player, result[1])

        result = process.extractOne(needle, self.labels, scorer=fuzz.partial_ratio)
        if result and result[1] >= max(min_threshold, 85):
            player = self.label_to_player.get(result[0].lower())
            if player:
                return self._from_player(needle, player, result[1] - 5)

        return DetectedPlayer(needle, "", 0, 0, False)

    def _from_player(self, raw: str, player: Player, confidence: int) -> DetectedPlayer:
        return DetectedPlayer(
            raw_text=raw,
            matched_name=player.web_name,
            player_id=player.id,
            confidence=int(confidence),
            matched=True,
            position=player.position,
            team=player.team_name,
            price=player.price,
        )

    def match_name_list(self, names: list[str]) -> list[DetectedPlayer]:
        """Match a pasted list of player names (fallback if OCR fails)."""
        detected = []
        seen = set()
        for raw in names:
            for part in re.split(r"[,;\n|/]+", raw):
                name = part.strip()
                if len(name) < 2:
                    continue
                match = self.match_player(name)
                if match.matched and match.player_id not in seen:
                    detected.append(match)
                    seen.add(match.player_id)
                elif not match.matched:
                    detected.append(match)
        matched = [d for d in detected if d.matched][:15]
        unmatched = [d for d in detected if not d.matched]
        return matched + unmatched[:10]

    def detect_team(self, image_data: bytes) -> list[DetectedPlayer]:
        ocr_results = self.extract_text_from_image(image_data)
        text_items = [r[1] for r in ocr_results if len(r) > 1]
        print(f"📷 EasyOCR extracted {len(text_items)} text items: {text_items[:25]}")

        potential_names = self.parse_player_names(ocr_results)
        print(f"🔍 Potential player names: {potential_names}")

        detected = []
        seen_ids = set()
        unmatched = []
        for name in potential_names:
            match = self.match_player(name)
            if match.matched and match.player_id not in seen_ids:
                detected.append(match)
                seen_ids.add(match.player_id)
            elif not match.matched:
                unmatched.append(match)

        detected.sort(key=lambda x: x.confidence, reverse=True)
        print(f"✅ Matched {len(detected)} players, {len(unmatched)} unmatched")
        return detected[:15] + unmatched[:8]

    def detect_chips(self, ocr_results: list[tuple]) -> dict:
        chips = {
            "wildcard_active": False,
            "free_hit_active": False,
            "bench_boost_active": False,
            "triple_captain": None,
        }
        all_text = " ".join([r[1].lower() for r in ocr_results if len(r) > 1])
        if "wildcard" in all_text:
            chips["wildcard_active"] = True
        if "free hit" in all_text:
            chips["free_hit_active"] = True
        if "bench boost" in all_text:
            chips["bench_boost_active"] = True
        return chips

    def to_dict(self, detected: list[DetectedPlayer]) -> list[dict]:
        return [
            {
                "raw_text": d.raw_text,
                "name": d.matched_name if d.matched else d.raw_text,
                "id": d.player_id,
                "matched": d.matched,
                "confidence": d.confidence,
                "position": d.position,
                "team": d.team,
                "price": d.price,
                "xPts": d.expected_points,
            }
            for d in detected
        ]
