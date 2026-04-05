"""
FPL-Agent: Flask API Server
Serves predictions and recommendations via REST API.
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_caching import Cache
import sys
import os

# Add agents to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.data_ingestion import FPLDataIngestion
from agents.player_form import PlayerFormAgent
from agents.minutes_risk import MinutesRiskAgent
from agents.fixture_analysis import FixtureAnalysisAgent
from agents.points_predictor import PointsPredictionAgent
from agents.squad_optimizer import SquadOptimizer
from agents.explainability import ExplainabilityAgent
from agents.team_vision import TeamVisionAgent
from agents.historical_data import HistoricalDataAgent
from agents.chip_advisor import ChipAdvisor
from agents.ownership_analyzer import OwnershipAnalyzer
from agents.differential_finder import DifferentialFinder
from agents.ml_predictor import MLPredictor
from agents.scout_chat import ScoutChatAgent
from agents.league_analyzer import LeagueAnalyzer
from agents.live_tracker import LiveTrackerAgent

# Get the web folder path
WEB_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web')

from models import db, User, SavedSquad, PlayerPriceHistory

app = Flask(__name__, static_folder=WEB_FOLDER, static_url_path='')
CORS(app)
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 3600})
cache.init_app(app)

# Configure SQLite DB
db_path = os.path.join(os.path.dirname(__file__), 'fplly.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

# Global agents (initialized on first request)
from typing import Any, Dict
agents: Dict[str, Any] = {}


def initialize_agents():
    """Initialize all FPL agents."""
    if 'data' in agents:
        return  # Already initialized
    
    print("🚀 Initializing FPL-Agent system...")
    
    # Data ingestion
    data_agent = FPLDataIngestion()
    data_agent.ingest_all_data()
    agents['data'] = data_agent
    
    # Form analysis
    form_agent = PlayerFormAgent(data_agent)
    form_agent.analyze_all_players()
    agents['form'] = form_agent
    
    # Minutes risk
    minutes_agent = MinutesRiskAgent(data_agent)
    minutes_agent.analyze_all_players()
    agents['minutes'] = minutes_agent
    
    # Fixture analysis
    fixture_agent = FixtureAnalysisAgent(data_agent)
    fixture_agent.analyze_all_players()
    agents['fixtures'] = fixture_agent
    
    # Points prediction
    prediction_agent = PointsPredictionAgent(data_agent, form_agent, minutes_agent, fixture_agent)
    prediction_agent.predict_all_players()
    agents['predictions'] = prediction_agent
    
    # Squad optimizer
    optimizer = SquadOptimizer(prediction_agent)
    agents['optimizer'] = optimizer
    
    # Explainability
    explainer = ExplainabilityAgent()
    agents['explainer'] = explainer

    # Team Vision
    vision_agent = TeamVisionAgent(data_agent)
    agents['vision'] = vision_agent

    # Historical Data
    historical_agent = HistoricalDataAgent()
    # historical_agent.load_data() # Lazy load on request to save startup time
    agents['historical'] = historical_agent

    # Chip Advisor
    chip_advisor = ChipAdvisor(data_agent)
    agents['chips'] = chip_advisor

    # Differential Finder
    diff_finder = DifferentialFinder(data_agent, prediction_agent)
    agents['differentials'] = diff_finder
    
    # Ownership Analyzer
    ownership_analyzer = OwnershipAnalyzer(data_agent, prediction_agent)
    ownership_analyzer.analyze_all_players()
    agents['ownership'] = ownership_analyzer

    # ML Predictor
    ml_predictor = MLPredictor(data_agent)
    # ml_predictor.train() # Lazy train
    agents['ml'] = ml_predictor

    # League Analyzer (Phase 14)
    league_analyzer = LeagueAnalyzer(data_agent)
    agents['league'] = league_analyzer

    # Scout Chat (Phase 15)
    scout_chat = ScoutChatAgent(agents)
    agents['chat'] = scout_chat
    
    # Live Tracker
    tracker = LiveTrackerAgent(data_agent)
    agents['live_tracker'] = tracker
    
    print("✅ All agents ready!")


@app.before_request
def ensure_initialized():
    """Ensure agents are initialized before handling requests."""
    initialize_agents()


@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Handle chat queries."""
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({"error": "No query provided"}), 400
        
    chat_agent = agents.get('chat')
    if not chat_agent:
        return jsonify({"response": "System initializing..."}), 503
        
    response = chat_agent.get_response(query)
    return jsonify({"response": response})


@app.route('/api/league', methods=['POST'])
def api_league():
    """Analyze a league."""
    data = request.json
    league_id = data.get('id')
    user_team = data.get('team_id') # Optional, to find rival delta
    
    if not league_id:
        return jsonify({"error": "No league ID"}), 400
        
    analyzer = agents.get('league')
    if not analyzer:
        return jsonify({"error": "System initializing..."}), 503
        
    try:
        result = analyzer.analyze_league(int(league_id))
        if "error" in result:
             return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dashboard')
@cache.cached(query_string=True)
def api_dashboard():
    """Get dynamic dashboard data for widgets."""
    data_agent = agents.get('data')
    prediction_agent = agents.get('predictions')
    
    if not data_agent or not prediction_agent:
        return jsonify({"error": "System initializing..."}), 503
    
    # Get top form player
    players_by_form = sorted(data_agent.players, key=lambda p: p.form, reverse=True)
    top_form = players_by_form[0] if players_by_form else None
    
    # Get top differential (low ownership, high xPts)
    diff_agent = agents.get('differentials')
    if diff_agent:
        diffs = diff_agent.find_differentials()
        top_diff = diffs[0] if diffs else None
    else:
        top_diff = None
    
    # Get AI confidence (from ML if available)
    ml_agent = agents.get('ml')
    ai_confidence = 92.4  # Default
    if ml_agent and ml_agent.is_trained:
        ai_confidence = ml_agent.training_stats.get('r2_score', 0.92) * 100
    
    # Get top predictions for scout preview
    top_preds = prediction_agent.get_top_predictions(3)
    
    return jsonify({
        "top_form": {
            "name": top_form.web_name if top_form else "N/A",
            "form": top_form.form if top_form else 0,
            "team": top_form.team_name if top_form else ""
        } if top_form else None,
        "top_differential": {
            "name": top_diff.player_name if top_diff else "N/A",
            "ownership": top_diff.ownership if top_diff else 0,
            "xpts": top_diff.xpts if top_diff else 0
        } if top_diff else None,
        "ai_confidence": round(ai_confidence, 1),
        "top_predictions": [
            {"name": p.player_name, "xpts": round(p.expected_points, 1)}
            for p in top_preds
        ],
        "next_gw": data_agent.next_gw
    })



@app.route('/')
def index():
    """Serve the main page."""
    return send_from_directory(WEB_FOLDER, 'index.html')


@app.route('/styles.css')
def styles():
    """Serve CSS."""
    return send_from_directory(WEB_FOLDER, 'styles.css')


@app.route('/app.js')
def javascript():
    """Serve JavaScript."""
    return send_from_directory(WEB_FOLDER, 'app.js')


@app.route('/api/status')
@cache.cached(query_string=True)
def api_status():
    """Get system status."""
    data = agents.get('data')
    return jsonify({
        "status": "ready",
        "current_gw": data.current_gw if data else 0,
        "next_gw": data.next_gw if data else 0,
        "players_loaded": len(data.players) if data else 0,
        "predictions_ready": len(agents.get('predictions', {}).predictions) if 'predictions' in agents else 0
    })


@app.route('/api/predictions')
@cache.cached(query_string=True)
def api_predictions():
    """Get all player predictions."""
    prediction_agent = agents.get('predictions')
    if not prediction_agent:
        return jsonify({"error": "Predictions not ready"}), 500
    
    # Optional filters
    position = request.args.get('position')
    limit = request.args.get('limit', 50, type=int)
    min_price = request.args.get('min_price', 0, type=float)
    max_price = request.args.get('max_price', 20, type=float)
    
    predictions = prediction_agent.to_dict()
    
    # Apply filters
    if position:
        predictions = [p for p in predictions if p['position'] == position]
    
    predictions = [p for p in predictions if min_price <= p['price'] <= max_price]
    predictions = predictions[:limit]
    
    return jsonify({
        "gw": agents['data'].next_gw,
        "count": len(predictions),
        "predictions": predictions
    })


@app.route('/api/captain')
@cache.cached(query_string=True)
def api_captain():
    """Get captain recommendations."""
    prediction_agent = agents.get('predictions')
    explainer = agents.get('explainer')
    
    if not prediction_agent:
        return jsonify({"error": "Not ready"}), 500
    
    captain_picks = prediction_agent.get_captain_picks(10)
    
    # Get explanations
    recommendations = []
    for i, pick in enumerate(captain_picks):
        explanation = explainer.explain_captain_choice(pick, captain_picks[i+1:])
        recommendations.append({
            "rank": i + 1,
            "id": pick.player_id,
            "name": pick.player_name,
            "team": pick.team,
            "position": pick.position,
            "price": pick.price,
            "xPts": pick.expected_points,
            "xPts_high": pick.expected_points_high,
            "fixture": pick.fixture_info,
            "explanation": explainer.to_dict(explanation)
        })
    
    return jsonify({
        "gw": agents['data'].next_gw,
        "recommendations": recommendations
    })


@app.route('/api/transfers', methods=['POST'])
def api_transfers():
    """Get transfer recommendations for a squad."""
    data = request.get_json() or {}
    
    current_squad = data.get('squad', [])
    free_transfers = data.get('free_transfers', 1)
    budget = data.get('budget', 0.0)
    
    optimizer = agents.get('optimizer')
    explainer = agents.get('explainer')
    
    if not optimizer:
        return jsonify({"error": "Not ready"}), 500
    
    # If no squad provided, suggest top picks instead
    if not current_squad:
        return jsonify({
            "error": "No squad provided",
            "hint": "Send POST with {squad: [player_id, ...], free_transfers: 1, budget: 0.0}"
        }), 400
    
    recommendations = optimizer.suggest_transfers(current_squad, free_transfers, budget)
    hit_analysis = optimizer.analyze_hit_worth(recommendations, free_transfers)
    
    transfers = []
    for rec in recommendations:
        explanation = explainer.explain_transfer(rec)
        transfers.append({
            "out": {
                "id": rec.player_out_id,
                "name": rec.player_out_name,
                "team": rec.player_out_team,
                "price": rec.player_out_price,
                "xPts": rec.player_out_xpts
            },
            "in": {
                "id": rec.player_in_id,
                "name": rec.player_in_name,
                "team": rec.player_in_team,
                "price": rec.player_in_price,
                "xPts": rec.player_in_xpts
            },
            "points_gain": rec.points_gain_next_5,
            "price_change": rec.price_change,
            "explanation": explainer.to_dict(explanation)
        })
    
    return jsonify({
        "gw": agents['data'].next_gw,
        "transfers": transfers,
        "hit_analysis": hit_analysis
    })


@app.route('/api/optimal-team')
@cache.cached(query_string=True)
def api_optimal_team():
    """Get an optimal team from scratch."""
    budget = request.args.get('budget', 100.0, type=float)
    
    optimizer = agents.get('optimizer')
    explainer = agents.get('explainer')
    
    if not optimizer:
        return jsonify({"error": "Not ready"}), 500
    
    squad = optimizer.optimize_team(budget)
    squad_explanation = explainer.explain_squad_selection(squad)
    
    def player_to_dict(p, is_captain=False, is_vice=False):
        return {
            "id": p.player_id,
            "name": p.player_name,
            "team": p.team,
            "position": p.position,
            "price": p.price,
            "xPts": round(p.expected_points, 2),
            "fixture": p.fixture_info,
            "analysis": {
                "xG": round(p.expected_goals_points, 2),
                "xA": round(p.expected_assists_points, 2),
                "xCS": round(p.expected_clean_sheet_points, 2),
                "form": p.form_trend
            },
            "captain": is_captain,
            "vice_captain": is_vice
        }
    
    return jsonify({
        "gw": agents['data'].next_gw,
        "formation": squad.formation,
        "total_price": squad.total_price,
        "expected_points": squad.expected_points,
        "starting_xi": [
            player_to_dict(
                p, 
                is_captain=(p.player_id == squad.captain.player_id),
                is_vice=(p.player_id == squad.vice_captain.player_id)
            )
            for p in sorted(squad.starting_xi, key=lambda x: ["GKP", "DEF", "MID", "FWD"].index(x.position))
        ],
        "bench": [player_to_dict(p) for p in squad.bench],
        "explanation": explainer.to_dict(squad_explanation)
    })


@app.route('/api/fixtures')
@cache.cached(query_string=True)
def api_fixtures():
    """Get fixture analysis for teams."""
    fixture_agent = agents.get('fixtures')
    
    if not fixture_agent:
        return jsonify({"error": "Not ready"}), 500
    
    best_teams = fixture_agent.get_best_fixture_teams(20)
    
    return jsonify({
        "gw": agents['data'].next_gw,
        "teams": best_teams
    })


@app.route('/api/player/<int:player_id>')
@cache.cached(query_string=True)
def api_player(player_id: int):
    """Get detailed info for a specific player."""
    prediction_agent = agents.get('predictions')
    form_agent = agents.get('form')
    minutes_agent = agents.get('minutes')
    fixture_agent = agents.get('fixtures')
    explainer = agents.get('explainer')
    
    prediction = prediction_agent.predictions.get(player_id)
    if not prediction:
        return jsonify({"error": "Player not found"}), 404
    
    form = form_agent.analyses.get(player_id)
    minutes = minutes_agent.analyses.get(player_id)
    fixtures = fixture_agent.analyses.get(player_id)
    
    explanation = explainer.explain_player_prediction(prediction)
    
    return jsonify({
        "prediction": {
            "id": prediction.player_id,
            "name": prediction.player_name,
            "team": prediction.team,
            "position": prediction.position,
            "price": prediction.price,
            "xPts": prediction.expected_points,
            "xPts_low": prediction.expected_points_low,
            "xPts_high": prediction.expected_points_high,
            "breakdown": {
                "goals": prediction.expected_goals_points,
                "assists": prediction.expected_assists_points,
                "clean_sheet": prediction.expected_clean_sheet_points,
                "appearance": prediction.expected_appearance_points,
                "bonus": prediction.expected_bonus_points
            },
            "probabilities": {
                "goal": prediction.goal_probability,
                "assist": prediction.assist_probability,
                "clean_sheet": prediction.clean_sheet_probability
            }
        },
        "form": {
            "score": form.form_score if form else 0,
            "trend": form.form_trend if form else "unknown",
            "xG_per_90": form.xg_per_90 if form else 0,
            "xA_per_90": form.xa_per_90 if form else 0
        } if form else None,
        "minutes": {
            "tag": minutes.tag if minutes else "unknown",
            "expected": minutes.expected_minutes if minutes else 0,
            "chance": minutes.chance_of_playing if minutes else 0
        } if minutes else None,
        "fixtures": fixtures.fixture_run[:5] if fixtures else [],
        "explanation": explainer.to_dict(explanation)
    })


@app.route('/api/upload-team', methods=['POST'])
def api_upload_team():
    """Analyze uploaded team screenshot."""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    try:
        # Read image data
        image_data = image_file.read()
        
        # Initialize vision agent if needed
        if 'vision' not in agents:
            agents['vision'] = TeamVisionAgent(agents['data'])
        
        vision_agent = agents['vision']
        prediction_agent = agents.get('predictions')
        optimizer = agents.get('optimizer')
        
        # Detect players from image
        detected = vision_agent.detect_team(image_data)
        
        # Get predictions for detected players
        detected_ids = []
        detected_list = []
        total_team_value = 0
        
        for d in detected:
            pred = None
            if d.matched and d.player_id in prediction_agent.predictions:
                pred = prediction_agent.predictions[d.player_id]
                d.expected_points = pred.expected_points
                detected_ids.append(d.player_id)
                total_team_value += d.price
            
            detected_list.append({
                "raw_text": d.raw_text,
                "name": d.matched_name if d.matched else d.raw_text,
                "id": d.player_id,
                "matched": d.matched,
                "confidence": d.confidence,
                "position": d.position,
                "team": d.team,
                "price": d.price,
                "xPts": d.expected_points,
                "gw_label": getattr(pred, 'gw_label', None) if pred else None,
                "fixture": getattr(pred, 'fixture_info', 'No info') if pred else "No info"
            })
        
        # Get free transfers from request (default 1)
        free_transfers = int(request.form.get('free_transfers', 1))
        free_transfers = max(1, min(5, free_transfers))  # Cap between 1-5
        
        # Get bank value (estimate based on 100m budget)
        bank = max(0, 100.0 - total_team_value)
        
        # Get transfer recommendations if we have a squad
        transfers = []
        hit_advice = None
        best_xi = None
        
        if len(detected_ids) >= 11:
            # Get more transfer options with higher budget tolerance
            transfer_recs = optimizer.suggest_transfers(detected_ids, 5, bank + 3.0)
            
            # DEDUPLICATION: track players already used in transfers
            used_out_ids = set()
            used_in_ids = set()
            unique_transfers = []
            
            for t in transfer_recs:
                # Skip if we've already suggested transferring this player out
                if t.player_out_id in used_out_ids:
                    continue
                # Skip if we've already suggested this player in
                if t.player_in_id in used_in_ids:
                    continue
                
                unique_transfers.append(t)
                used_out_ids.add(t.player_out_id)
                used_in_ids.add(t.player_in_id)
            
            # Analyze transfers with hit costs
            transfer_analysis = []
            for i, t in enumerate(unique_transfers[:6]):
                transfer_num = i + 1
                is_free = transfer_num <= free_transfers
                hit_cost = 0 if is_free else 4
                net_gain = t.points_gain_next_5 - hit_cost
                price_feasible = t.price_change <= bank
                
                transfer_analysis.append({
                    "out": {
                        "id": t.player_out_id,
                        "name": t.player_out_name,
                        "team": t.player_out_team,
                        "price": t.player_out_price,
                        "xPts": round(t.player_out_xpts, 2)
                    },
                    "in": {
                        "id": t.player_in_id,
                        "name": t.player_in_name,
                        "team": t.player_in_team,
                        "price": t.player_in_price,
                        "xPts": round(t.player_in_xpts, 2)
                    },
                    "points_gain": round(t.points_gain_next_5, 2),
                    "price_change": t.price_change,
                    "is_free": is_free,
                    "hit_cost": hit_cost,
                    "net_gain": round(net_gain, 2),
                    "price_feasible": price_feasible,
                    "recommended": net_gain > 0.5 and price_feasible
                })
            
            # Show all analyzed transfers (both free and hit)
            transfers = transfer_analysis
            
            # Better hit advice based on actual analysis (Using 5GW horizon)
            free_gains = sum(t["points_gain"] for t in transfer_analysis[:free_transfers])
            
            # Find hits that are actually worth it (net_gain > 0 means gain exceeds -4 cost)
            potential_hits = [t for t in transfer_analysis[free_transfers:] 
                             if t["net_gain"] > 0 and t["price_feasible"]]
            
            if potential_hits:
                best_hit = potential_hits[0]
                total_hit_gain = sum(t["net_gain"] for t in potential_hits)
                
                hit_advice = {
                    "should_take_hit": best_hit["net_gain"] > 1.0,
                    "best_hit_transfer": best_hit,
                    "total_hit_gain": round(total_hit_gain, 2),
                    "explanation": ""
                }
                
                if best_hit["net_gain"] > 2.5:
                    hit_advice["explanation"] = f"✅ STRONGLY RECOMMEND: Take a -4 hit for {best_hit['in']['name']}. Net gain of +{best_hit['net_gain']:.1f} pts is excellent!"
                elif best_hit["net_gain"] > 1.5:
                    hit_advice["explanation"] = f"✅ WORTH IT: Consider a hit for {best_hit['in']['name']} (+{best_hit['net_gain']:.1f} net). Good upgrade!"
                elif best_hit["net_gain"] > 0:
                    hit_advice["explanation"] = f"⚠️ MARGINAL: Hit for {best_hit['in']['name']} only gains +{best_hit['net_gain']:.1f} net. Proceed with caution."
            else:
                # Check if free transfers are good
                if free_gains > 2:
                    hit_advice = {
                        "should_take_hit": False,
                        "best_hit_transfer": None,
                        "total_hit_gain": 0,
                        "explanation": f"✅ Use your {free_transfers} free transfer(s) for +{free_gains:.1f} pts gain. No hits needed!"
                    }
                else:
                    hit_advice = {
                        "should_take_hit": False,
                        "best_hit_transfer": None,
                        "total_hit_gain": 0,
                        "explanation": "💡 Your team looks solid. Consider rolling the transfer if gains are small."
                    }
            
            # Generate Best XI from detected players
            matched_players = [d for d in detected if d.matched and d.player_id in prediction_agent.predictions]
            
            if len(matched_players) >= 11:
                # Sort by xPts within each position
                by_pos = {"GKP": [], "DEF": [], "MID": [], "FWD": []}
                for d in matched_players:
                    by_pos[d.position].append(d)
                    
                for pos in by_pos:
                    by_pos[pos].sort(key=lambda x: x.expected_points, reverse=True)
                
                # Build best XI: 1 GKP, 3+ DEF, 2+ MID, 1+ FWD = 7 minimum, fill 4 more
                xi_players = []
                if by_pos["GKP"]:
                    xi_players.append(by_pos["GKP"][0])
                xi_players.extend(by_pos["DEF"][:3])  # Min 3 DEF
                xi_players.extend(by_pos["MID"][:2])  # Min 2 MID
                xi_players.extend(by_pos["FWD"][:1])  # Min 1 FWD
                
                # Fill remaining slots with highest xPts
                remaining = (by_pos["DEF"][3:] + by_pos["MID"][2:] + by_pos["FWD"][1:])
                remaining.sort(key=lambda x: x.expected_points, reverse=True)
                
                for p in remaining:
                    if len(xi_players) >= 11:
                        break
                    xi_players.append(p)
                
                xi_players = xi_players[:11]
                xi_players.sort(key=lambda x: ["GKP", "DEF", "MID", "FWD"].index(x.position))
                
                # Captain = highest xPts
                captain = max(xi_players, key=lambda x: x.expected_points)
                vice = max([p for p in xi_players if p != captain], key=lambda x: x.expected_points) if len(xi_players) > 1 else None
                
                # Formation
                counts = {"DEF": 0, "MID": 0, "FWD": 0}
                for p in xi_players:
                    if p.position in counts:
                        counts[p.position] += 1
                formation = f"{counts['DEF']}-{counts['MID']}-{counts['FWD']}"
                
                total_xi_xpts = sum(p.expected_points for p in xi_players) + captain.expected_points  # Captain doubles
                
                best_xi = {
                    "formation": formation,
                    "total_xpts": round(total_xi_xpts, 2),
                    "captain": captain.matched_name,
                    "vice_captain": vice.matched_name if vice else None,
                    "players": [
                        {
                            "id": p.player_id,
                            "name": p.matched_name,
                            "position": p.position,
                            "team": p.team,
                            "price": p.price,
                            "xPts": round(p.expected_points, 2),
                            "is_captain": p == captain,
                            "is_vice": p == vice
                        }
                        for p in xi_players
                    ]
                }
        
        # Chip suggestions
        chip_suggestions = []
        
        if len(detected_ids) >= 11:
            if 'chips' not in agents:
                agents['chips'] = ChipAdvisor(agents['data'])
                agents['chips'].analyze_gameweeks(4)
                
            xi_ids = [p["id"] for p in best_xi["players"]] if best_xi else []
            chip_suggestions = agents['chips'].evaluate_chips_for_squad(detected_ids, xi_ids, prediction_agent)
        
        return jsonify({
            "gw": agents['data'].next_gw,
            "detected_count": len(detected),
            "matched_count": len(detected_ids),
            "detected_players": detected_list,
            "free_transfers": free_transfers,
            "bank": round(bank, 1),
            "team_value": round(total_team_value, 1),
            "transfers": transfers,
            "hit_advice": hit_advice,
            "best_xi": best_xi,
            "chip_suggestions": chip_suggestions
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/historical/<player_name>')
def api_historical(player_name: str):
    """Get historical stats for a player."""
    # Initialize historical agent if needed (lazy load for performance)
    if 'historical' not in agents:
        print("📚 Loading historical data (first request)...")
        agents['historical'] = HistoricalDataAgent()
        agents['historical'].load_all_historical_data()
    
    historical = agents['historical']
    stats = historical.calculate_player_historical_stats(player_name)
    
    if not stats:
        return jsonify({"error": f"No historical data found for {player_name}"}), 404
    
    return jsonify({
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
        "consistency_score": stats.consistency_score,
        "interpretation": {
            "xg_description": f"Scores {stats.xg_overperformance:+.1f} more goals than xG suggests" if stats.xg_overperformance != 0 else "Performs as expected",
            "consistency_description": "Very consistent" if stats.consistency_score > 7 else "Moderately consistent" if stats.consistency_score > 4 else "Volatile returns"
        }
    })


@app.route('/api/overperformers')
@cache.cached(query_string=True)
def api_overperformers():
    """Get top xG overperformers."""
    if 'historical' not in agents:
        print("📚 Loading historical data (first request)...")
        agents['historical'] = HistoricalDataAgent()
        agents['historical'].load_all_historical_data()
    
    historical = agents['historical']
    overperformers = historical.get_top_overperformers(20)
    
    return jsonify({
        "description": "Players who consistently score more goals than their xG suggests",
        "top_overperformers": overperformers
    })


@app.route('/api/chips')
@cache.cached(query_string=True)
def api_chips():
    """Get chip strategy recommendations."""
    if 'chips' not in agents:
        agents['chips'] = ChipAdvisor(agents['data'])
        agents['chips'].analyze_gameweeks(8)
    
    return jsonify(agents['chips'].to_dict())


@app.route('/api/ownership')
@cache.cached(query_string=True)
def api_ownership():
    """Get ownership analysis."""
    if 'ownership' not in agents:
        agents['ownership'] = OwnershipAnalyzer(agents['data'], agents.get('predictions'))
        agents['ownership'].analyze_all_players()
    
    return jsonify(agents['ownership'].to_dict())


@app.route('/api/differentials')
@cache.cached(query_string=True)
def api_differentials():
    """Get differential player picks."""
    if 'differentials' not in agents:
        agents['differentials'] = DifferentialFinder(agents['data'], agents['predictions'])
        agents['differentials'].find_differentials()
    
    return jsonify(agents['differentials'].to_dict())


@app.route('/api/ml-predictions')
@cache.cached(query_string=True)
def api_ml_predictions():
    """Get ML-based predictions."""
    if 'ml' not in agents:
        print("🤖 Training ML model (first request, may take ~30s)...")
        agents['ml'] = MLPredictor(agents['data'])
        agents['ml'].train()
    
    # Get predictions with rule-based comparison
    rule_predictions = agents['predictions'].predictions
    ml_preds = agents['ml'].predict_all_players(rule_predictions)
    
    return jsonify(agents['ml'].to_dict(ml_preds))


@app.route('/api/live-rank/<int:fpl_id>')
def api_live_rank(fpl_id):
    """Get live points and rank for an authenticated user."""
    # Ensure initialized (lazy load in case it wasn't)
    if 'live_tracker' not in agents:
        if 'data' not in agents:
            initialize_agents()
        agents['live_tracker'] = LiveTrackerAgent(agents['data'])
        
    result = agents['live_tracker'].get_live_team_points(fpl_id)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)

if __name__ == '__main__':
    print("=" * 50)
    print("🎮 FPL-Agent API Server")
    print("=" * 50)
    
    # Pre-initialize agents at startup
    print("⏳ Loading FPL data (this may take 10-15 seconds)...")
    initialize_agents()
    
    print("")
    print("Starting server...")
    print("")
    print("Endpoints:")
    print("  GET  /api/status         - System status")
    print("  GET  /api/predictions    - Player predictions")
    print("  GET  /api/captain        - Captain picks")
    print("  POST /api/transfers      - Transfer recommendations")
    print("  GET  /api/optimal-team   - Optimal team")
    print("  GET  /api/fixtures       - Fixture analysis")
    print("  GET  /api/player/<id>    - Player details")
    print("")
    
    app.run(debug=False, host='0.0.0.0', port=5050)
