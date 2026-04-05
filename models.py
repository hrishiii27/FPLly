from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fpl_id = db.Column(db.Integer, unique=True, nullable=False)
    team_name = db.Column(db.String(100), nullable=True)
    manager_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    squads = db.relationship('SavedSquad', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "fpl_id": self.fpl_id,
            "team_name": self.team_name,
            "manager_name": self.manager_name,
            "created_at": self.created_at.isoformat()
        }

class SavedSquad(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    gameweek = db.Column(db.Integer, nullable=False)
    squad_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_squad(self):
        return json.loads(self.squad_json)

class PlayerPriceHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, nullable=False)
    gameweek = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    selected_by_percent = db.Column(db.Float, nullable=False)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
