# 🏆 FPLly - AI-Powered Fantasy Premier League Assistant

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/react-18+-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/flask-3.0+-black.svg" alt="Flask">
  <img src="https://img.shields.io/badge/tailwindcss-4.0-38bdf8.svg" alt="TailwindCSS">
</p>

FPLly is an intelligent Fantasy Premier League assistant that uses **machine learning**, **computer vision**, and **advanced analytics** to help you make better FPL decisions.

---

## ✨ Key Features

### 🧠 Advanced AI & ML
- **Ensemble Prediction Model**: Combines Random Forest, XGBoost, and Gradient Boosting for highly accurate points prediction (R² > 0.97).
- **Points Prediction**: Forecasts points for all players for upcoming gameweeks.
- **Explainable AI**: Breaks down predictions into xG, xA, Clean Sheet prob, and Form factors.

### 🎨 Modern UI/UX (New!)
- **Interactive Pitch View**: Visualize your optimal team on a pitch with detailed player cards (FDR, xPts).
- **Dashboard**: Central hub with next deadline countdown, AI confidence scores, and top insights.
- **Sidebar Navigation**: Sleek, collapsible navigation grouped by function (Scout, Strategy, Analysis).
- **Dark/Light Mode**: Fully responsive theme support.
- **Animations**: Smooth page transitions and interactive elements using Framer Motion.

### 🛠 Tools & Strategy
- **Chip Strategy Advisor**: Data-driven recommendations for Wildcard, Free Hit, Bench Boost, and Triple Captain with "PLAY NOW" or "HOLD" verdicts.
- **Optimal Squad Generator**: Generates the mathematically best Free Hit squad for any gameweek.
- **Transfer Scout**: Suggests optimal transfers based on ROI and long-term value.
- **Differential Finder**: Identifies high-potential players with low ownership (<10%).

### 📸 Team Scanner
- **Screenshot Analysis** - Upload your team screenshot for instant analysis
- **EasyOCR Integration** - State-of-the-art text recognition
- **Smart Transfers** - Personalized recommendations based on your actual team
- **Hit Advisor** - Know exactly when taking a -4 is worth it
- **Best XI Generator** - Optimal starting lineup from your squad

### 💬 Scout Chat (NEW!)
- **AI Assistant** - Floating chat widget to ask FPL questions
- **Natural Language** - Ask "Who should I captain?" or "Best differentials?"
- **Real-time Data** - Responses powered by live FPL data and predictions

### 🏆 Mini-League Analyzer (NEW!)
- **League Insights** - Analyze top 10 managers in any league
- **Effective Ownership** - See what your rivals are picking
- **Differential Finder** - Identify players to target vs your league

### 📈 Historical Data
- **5 Seasons of Data** - Training on 128,000+ gameweek records
- **xG Overperformers** - Players consistently beating their expected metrics
- **Form Analysis** - Recent performance trends and consistency scores

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/FPLly.git
cd FPLly

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running the App

**Terminal 1 - Backend:**
```bash
python3 server.py
```
Backend runs at: http://localhost:5050

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:3000

---

## 📁 Project Structure

```
FPLly/
├── server.py                 # Flask API server
├── requirements.txt          # Python dependencies
├── agents/                   # 15 AI Agent modules
│   ├── data_ingestion.py     # FPL API data fetcher
│   ├── points_predictor.py   # Core prediction engine
│   ├── player_form.py        # Form analysis
│   ├── fixture_analysis.py   # Fixture difficulty scoring
│   ├── minutes_risk.py       # Playing time predictor
│   ├── squad_optimizer.py    # Team optimization
│   ├── chip_advisor.py       # Chip timing recommendations
│   ├── ownership_analyzer.py # EO & template analysis
│   ├── differential_finder.py# Low-owned gems
│   ├── ml_predictor.py       # Ensemble ML model
│   ├── historical_data.py    # Historical data loader
│   ├── team_vision.py        # Screenshot OCR (EasyOCR)
│   ├── scout_chat.py         # AI Chat Assistant (NEW)
│   └── league_analyzer.py    # Mini-League Analysis (NEW)
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main app with sidebar routing
    │   └── components/       # 13 React components
    │       ├── Sidebar.jsx       # Navigation
    │       ├── ScoutChat.jsx     # Floating chat widget (NEW)
    │       ├── LeagueTab.jsx     # League analyzer (NEW)
    │       ├── PredictionsTab.jsx
    │       ├── CaptainTab.jsx
    │       ├── OptimalTeamTab.jsx # Pitch view
    │       ├── FixturesTab.jsx
    │       ├── MyTeamTab.jsx
    │       ├── HistoricalTab.jsx
    │       ├── ChipsTab.jsx
    │       ├── OwnershipTab.jsx
    │       ├── DifferentialsTab.jsx
    │       └── MLTab.jsx
    └── vite.config.js        # Vite + Tailwind config
```

---

## 🤖 Machine Learning

### Model Architecture
- **Algorithm:** Gradient Boosting Regressor (sklearn)
- **Training Data:** 5 seasons (2019-2024) from vaastav/Fantasy-Premier-League
- **Samples:** 56,000+ training records
- **Features:** 15 carefully selected features

### Features Used
| Feature | Description |
|---------|-------------|
| minutes | Per-game minutes played |
| goals_scored | Goals per game |
| assists | Assists per game |
| clean_sheets | Clean sheets per game |
| bonus | Bonus points per game |
| bps | Bonus Point System score |
| influence | FPL Influence metric |
| creativity | FPL Creativity metric |
| threat | FPL Threat metric |
| ict_index | Combined ICT Index |
| expected_goals | xG per game |
| expected_assists | xA per game |
| expected_goal_involvements | xGI per game |
| value | Player price |

### Model Performance
- **MAE:** 0.15 (Mean Absolute Error)
- **R² Score:** 0.976 (97.6% variance explained)

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | System status |
| `/api/predictions` | GET | All player predictions |
| `/api/captain` | GET | Captain recommendations |
| `/api/optimal-team` | GET | Best £100m squad |
| `/api/fixtures` | GET | Fixture difficulty ratings |
| `/api/chips` | GET | Chip timing analysis |
| `/api/ownership` | GET | Ownership analysis |
| `/api/differentials` | GET | Low-owned picks |
| `/api/ml-predictions` | GET | ML model predictions |
| `/api/historical/<name>` | GET | Player history |
| `/api/upload-team` | POST | Screenshot analysis |
| `/api/chat` | POST | **Scout Chat AI** (NEW) |
| `/api/league` | POST | **League Analysis** (NEW) |

---

## 📦 Dependencies

### Backend
```
flask>=3.0.0
flask-cors
requests
numpy
pandas
Pillow
fuzzywuzzy
python-Levenshtein
scikit-learn
xgboost
easyocr
certifi
```

### Frontend
```
react 18+
vite
tailwindcss v4
framer-motion
lucide-react
react-markdown
```

---

## 🎨 Screenshots

### Predictions Tab
View all player predictions with filtering by position and price.

### Captain Picks
See top captain options with explanations and xPts.

### Optimal Team
Visual pitch layout of the best possible squad.

### My Team Analysis
Upload your screenshot for personalized transfer advice.

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Ensemble ML Model (RF + XGBoost + GB)
- [x] Interactive Pitch View for Optimal XI
- [x] Sidebar Navigation & Dashboard
- [x] Dark/Light Mode with Framer Motion animations
- [x] Scout Chat - AI Assistant
- [x] Mini-League Analyzer
- [x] Enhanced Chip Advisor with data-backed scoring

### 🔜 Planned Features
- [ ] Understat xG integration for more accurate predictions
- [ ] FBref advanced stats integration
- [ ] Live price change predictions
- [ ] Manager history import
- [ ] Push notifications for deadline reminders
- [ ] Transfer Planner (drag-and-drop multi-GW view)

### Data Sources Under Consideration
- **Understat** - xG, xA, xGBuildup data
- **FBref** - Advanced passing, possession, defensive stats
- **WhoScored** - Match ratings and consistency metrics
- **Sofascore** - Real-time form ratings

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Fantasy Premier League](https://fantasy.premierleague.com/) - Official FPL API
- [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League) - Historical FPL data
- [EasyOCR](https://github.com/JaidedAI/EasyOCR) - Text recognition
- [scikit-learn](https://scikit-learn.org/) - Machine learning

---

<p align="center">
  Made with ❤️ for FPL managers
</p>
