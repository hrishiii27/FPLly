"""
FPL-Agent: Team Vision Agent
Extracts player names from team screenshots using EasyOCR.
"""

import io
import re
import ssl
import certifi
import os
from dataclasses import dataclass
from PIL import Image
import numpy as np
from fuzzywuzzy import fuzz, process
from .data_ingestion import FPLDataIngestion, Player

# Fix SSL certificate issue on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# Disable SSL verification as fallback (for local dev only)
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except:
    pass

# EasyOCR reader (initialized lazily to save memory)
_ocr_reader = None
_ocr_failed = False

def get_ocr_reader():
    """Get or create the EasyOCR reader."""
    global _ocr_reader, _ocr_failed
    
    if _ocr_failed:
        return None
        
    if _ocr_reader is None:
        try:
            # Set environment variables to prevent memory issues
            os.environ['OMP_NUM_THREADS'] = '1'
            os.environ['MKL_NUM_THREADS'] = '1'
            
            import easyocr
            print("📷 Initializing EasyOCR (first time may take a moment)...")
            _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False, 
                                         model_storage_directory=None,
                                         download_enabled=True)
            print("✅ EasyOCR ready!")
        except Exception as e:
            print(f"❌ EasyOCR initialization failed: {e}")
            print("   Falling back to text-based input")
            _ocr_failed = True
            return None
    return _ocr_reader


@dataclass
class DetectedPlayer:
    """A player detected from an image."""
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
    """Agent for detecting players from team screenshots using EasyOCR."""
    
    def __init__(self, data_agent: FPLDataIngestion):
        self.data = data_agent
        
        # Build player name lookup
        self.player_names = {p.web_name.lower(): p for p in data_agent.players}
        self.player_list = [p.web_name for p in data_agent.players]
    
    def extract_text_from_image(self, image_data: bytes) -> list[tuple]:
        """Extract text from image using EasyOCR."""
        try:
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array for EasyOCR
            img_array = np.array(image)
            
            # Get OCR reader and extract text
            reader = get_ocr_reader()
            results = reader.readtext(img_array)
            
            # results is list of (bbox, text, confidence)
            return results
        except Exception as e:
            print(f"OCR Error: {e}")
            return []
    
    def parse_player_names(self, ocr_results: list[tuple]) -> list[str]:
        """Parse potential player names from OCR results."""
        potential_names = []
        
        for result in ocr_results:
            if len(result) < 2:
                continue
            
            text = result[1].strip()
            confidence = result[2] if len(result) > 2 else 0.5
            
            # Skip low confidence results
            if confidence < 0.3:
                continue
            
            # Skip empty lines and very short text
            if len(text) < 3:
                continue
            
            # Skip lines with only numbers or common UI text
            if re.match(r'^[\d\s£,\.]+$', text):
                continue
            
            skip_words = ['gameweek', 'points', 'transfers', 'value', 'bank', 
                          'bench', 'captain', 'vice', 'chip', 'total', 'free',
                          'wildcard', 'hit', 'deadline', 'average', 'rank',
                          'manager', 'overall', 'squad', 'make', 'view',
                          'pick', 'team', 'gw', 'pts', 'used', 'selected',
                          'fwd', 'def', 'mid', 'gkp', 'price', 'budget',
                          'transfer', 'remaining', 'money', 'itb', 'squad']
            if any(word in text.lower() for word in skip_words):
                continue
            
            # Skip opponent names with venue markers (e.g., "LEE (A)", "MUN (H)")
            if re.search(r'\([HA]\)', text) or re.search(r'\s[HA]$', text):
                continue
            
            # Clean up common OCR artifacts
            clean_text = re.sub(r'[^\w\s\-\']', '', text)
            clean_text = clean_text.strip()
            
            # Skip if it's just a number after cleaning
            if clean_text.isdigit():
                continue
            
            if len(clean_text) >= 3:
                potential_names.append(clean_text)
        
        return potential_names
    
    def match_player(self, name: str, threshold: int = 65) -> DetectedPlayer:
        """Match a detected name to an FPL player."""
        # Try exact match first (case insensitive)
        if name.lower() in self.player_names:
            player = self.player_names[name.lower()]
            return DetectedPlayer(
                raw_text=name,
                matched_name=player.web_name,
                player_id=player.id,
                confidence=100,
                matched=True,
                position=player.position,
                team=player.team_name,
                price=player.price
            )
        
        # Try fuzzy matching with multiple scorers
        result = process.extractOne(name, self.player_list, scorer=fuzz.token_set_ratio)
        
        # Enforce higher threshold for short names to avoid team shorthand matches (e.g., "LEE")
        min_threshold = threshold
        if len(name) <= 4:
            min_threshold = max(80, threshold + 10)
            
        if result and result[1] >= min_threshold:
            matched_name = result[0]
            player = self.player_names.get(matched_name.lower())
            
            if player:
                return DetectedPlayer(
                    raw_text=name,
                    matched_name=player.web_name,
                    player_id=player.id,
                    confidence=result[1],
                    matched=True,
                    position=player.position,
                    team=player.team_name,
                    price=player.price
                )
        
        return DetectedPlayer(
            raw_text=name,
            matched_name="",
            player_id=0,
            confidence=0,
            matched=False
        )
    
    def detect_team(self, image_data: bytes) -> list[DetectedPlayer]:
        """Main method: detect players from team image."""
        # Extract text from image
        ocr_results = self.extract_text_from_image(image_data)
        
        # Log extracted text
        text_items = [r[1] for r in ocr_results if len(r) > 1]
        print(f"📷 EasyOCR extracted {len(text_items)} text items:")
        print(f"   {text_items[:20]}...")
        
        # Parse potential player names
        potential_names = self.parse_player_names(ocr_results)
        print(f"🔍 Potential player names: {potential_names}")
        
        # Match to FPL players
        detected = []
        seen_ids = set()
        
        for name in potential_names:
            match = self.match_player(name)
            
            # Avoid duplicates and only add matched players
            if match.matched and match.player_id not in seen_ids:
                detected.append(match)
                seen_ids.add(match.player_id)
        
        # Sort by confidence
        detected.sort(key=lambda x: x.confidence, reverse=True)
        
        print(f"✅ Matched {len(detected)} players")
        
        # Limit to 15 players (max FPL squad size)
        return detected[:15]
    
    def detect_chips(self, ocr_results: list[tuple]) -> dict:
        """Detect active chips from image text."""
        chips = {
            "wildcard_active": False,
            "free_hit_active": False,
            "bench_boost_active": False,
            "triple_captain": None
        }
        
        all_text = " ".join([r[1].lower() for r in ocr_results if len(r) > 1])
        
        if "wildcard" in all_text and "active" in all_text:
            chips["wildcard_active"] = True
        
        if "free hit" in all_text and "active" in all_text:
            chips["free_hit_active"] = True
        
        if "bench boost" in all_text:
            chips["bench_boost_active"] = True
        
        return chips
    
    def to_dict(self, detected: list[DetectedPlayer]) -> list[dict]:
        """Convert detected players to dictionary for JSON."""
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
                "xPts": d.expected_points
            }
            for d in detected
        ]


if __name__ == "__main__":
    # Test with sample image
    print("Team Vision Agent with EasyOCR initialized")
    print("Use detect_team(image_bytes) to analyze team screenshots")
