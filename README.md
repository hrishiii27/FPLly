# FPLly — Fantasy Premier League assistant

FPLly is a Flask API plus a React (Vite) UI that helps with FPL decisions using **live official FPL data**, a **lagged ensemble model** trained on historical seasons, and optional **screenshot / name-list squad analysis**.

---

## What it does

- **Points forecasts** — rule-based xG/xA/xCS/form blended with an ML ensemble (~60% rules / 40% ML). Blank GWs stay at 0; double GWs are scaled on the ML side.
- **Captain, Optimal XI, transfers** — uses those forecasts, club limits, and a full 15-player budget reservation so premium forwards are not dropped because defenders filled the squad first.
- **Ownership & differentials** — template vs low-owned picks; injured / minutes-managed players are filtered.
- **Chip advisor** — Wildcard, Free Hit, Bench Boost, Triple Captain scored against upcoming fixtures.
- **Vision analysis** — upload an FPL pitch screenshot (EasyOCR) or paste 15 names. Returns matched squad, Best XI, transfer hits, and chip notes. If OCR misses names, paste them in the same tab.
- **Scout chat & mini-leagues** — natural-language Q&A and league-level effective ownership.

Live bootstrap/fixtures come from the [official FPL API](https://fantasy.premierleague.com/). Historical training rows come from [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League).

---

## Quick start

**Needs:** Python 3.10+, Node 18+, pip.

```bash
git clone <your-fork-url>
cd FPLly

pip install -r requirements.txt
cd frontend && npm install && cd ..
```

**Terminal 1 — API (port 5050):**

```bash
python3 server.py
```

Flask runs with `debug=False`. **Restart this process after any Python change.**

**Terminal 2 — UI (port 3000):**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Vite proxies `/api` to `127.0.0.1:5050` (3 minute timeout so first EasyOCR / ML train can finish).

First ML train downloads five seasons of `merged_gw.csv` plus fixtures into `data/historical_cache/` (~1–2 minutes), then writes `data/ml_ensemble.joblib`. Later starts reuse the cache.

---

## Machine learning (honest metrics)

Older copy in this repo claimed **R² ≈ 0.97 / MAE ≈ 0.15**. That came from training on **same-gameweek box-score stats** (goals, bonus, ICT, etc.) which nearly reconstruct the FPL points formula. That is leakage, not a usable forecast.

The current model (`MODEL_VERSION = v2-fdr-lagged` in `agents/ml_predictor.py`):

| Item | Detail |
|------|--------|
| Seasons | 2021-22 through 2025-26 |
| Features | Pre-kickoff only: rolling minutes/points, lag-1 points, home flag, position, value, **fixture FDR** |
| Blocked | Same-GW goals, assists, CS, bonus, ICT, xG, minutes, etc. |
| Models | Random Forest + Gradient Boosting + XGBoost, inverse-MAE ensemble |
| Holdout | Chronological (latest season) |

Expect **MAE around ~2 points per player-GW** and a **modest R²** (order of ~0.1). That is normal for next-GW FPL scoring. The UI **ML** tab shows the real holdout numbers after train.

Live predictions still use the **rules engine** as the backbone, then blend in the ML score.

---

## Vision analysis

1. Crop the official FPL **pitch / my team** screenshot (PNG/JPG).
2. Set free transfers (and bank if you know ITB).
3. Analyze. First EasyOCR load can take a minute.
4. If fewer than 11 players match, paste missing **web names** (Salah, Haaland, …) in the same tab and analyze again.

`POST /api/upload-team` accepts `image`, and/or form fields `names`, `free_transfers`, `bank`. Transfers and Best XI need **at least 11 matched players**.

---

## Project layout

```
FPLly/
├── server.py                 # Flask API (PORT env or 5050)
├── requirements.txt
├── agents/
│   ├── data_ingestion.py     # Official FPL bootstrap + fixtures
│   ├── points_predictor.py   # Rule-based xPts + ML blend
│   ├── ml_predictor.py       # Lagged ensemble
│   ├── historical_data.py    # vaastav seasons + FDR join
│   ├── squad_optimizer.py    # XI / transfers / £100m squad
│   ├── team_vision.py        # EasyOCR + fuzzy name match
│   └── …                    # form, minutes, chips, ownership, chat, leagues
├── data/                     # caches (gitignored if present)
└── frontend/                 # Vite + React + Tailwind
    └── src/App.jsx
```

---

## API (main routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/status` | Agents loaded, current/next GW |
| GET | `/api/predictions` | Player xPts (`?limit=`, `?position=`) |
| GET | `/api/captain` | Captain shortlist with TSB / confidence |
| GET | `/api/optimal-team` | Best legal squad |
| POST | `/api/transfers` | Transfer recs for a squad id list |
| GET | `/api/fixtures` | FDR runs |
| GET | `/api/chips` | Chip timing |
| GET | `/api/ownership` | Ownership / template |
| GET | `/api/differentials` | Low-owned options |
| GET | `/api/ml-predictions` | ML overlay + holdout metrics |
| GET | `/api/historical/<name>` | Career totals vs xG |
| POST | `/api/upload-team` | Screenshot or pasted names |
| POST | `/api/chat` | Scout chat |
| POST | `/api/league` | Mini-league snapshot |

---

## Backend packages

See `requirements.txt`. Notable: Flask, pandas, scikit-learn, xgboost, joblib, EasyOCR, fuzzywuzzy, Pillow.

---

## Deploy

See [DEPLOY.md](DEPLOY.md). Production uses `PORT` from the host. Restart the Python process after code changes (`debug=False`).

---

## License & credits

MIT. Data: Fantasy Premier League API; historical CSVs from vaastav; OCR via EasyOCR.
