from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class PlayerPriceHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, nullable=False)
    gameweek = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    selected_by_percent = db.Column(db.Float, nullable=False)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
