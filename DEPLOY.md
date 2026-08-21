# FPLly deployment

Two processes: **Flask API** (`server.py`) and **Vite/React** (`frontend/`). Locally the UI proxies `/api` to port 5050. In production, either serve the built frontend from the same host or set the API origin on the static host.

`server.py` binds `0.0.0.0` and uses **`PORT`** if set (Railway/Render), otherwise **5050**. `debug=False` — you must restart the process after Python changes.

---

## Option 1: Railway (API) + Vercel (UI)

### API

1. Connect the GitHub repo to [Railway](https://railway.app).
2. Root already has `Procfile` (`web: python server.py`) and `runtime.txt` (`python-3.11.0`).
3. Build: `pip install -r requirements.txt`. Start: `python server.py`.
4. EasyOCR and first ML train need disk + time; give the service enough memory (2 GB+ recommended) and a long first-request timeout.
5. Note the public URL, e.g. `https://your-service.up.railway.app`.

### UI

```bash
cd frontend
npm install && npm run build
```

Deploy `frontend/` to Vercel. Create `.env.production`:

```
VITE_API_URL=https://your-service.up.railway.app
```

Wire fetches to `import.meta.env.VITE_API_URL` if you are not using the Vite proxy (production builds do not proxy). Allow that origin in Flask CORS if you restrict CORS later.

---

## Option 2: Render

**Web service (API)**

- Build: `pip install -r requirements.txt`
- Start: `python server.py`
- Python 3.11

**Static site (UI)**

- Build: `cd frontend && npm install && npm run build`
- Publish: `frontend/dist`
- Same `VITE_API_URL` as above.

---

## Option 3: Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN apt-get update && apt-get install -y nodejs npm \
    && cd frontend && npm install && npm run build
EXPOSE 5050
CMD ["python", "server.py"]
```

```bash
docker build -t fplly .
docker run -p 5050:5050 -e PORT=5050 fplly
```

Serving `frontend/dist` from Flask is not wired by default; use nginx or the Vite host, or add static routes if you want a single container.

---

## Checklist

- [ ] `debug=False` (already the default in `server.py`)
- [ ] CORS allows your frontend origin
- [ ] `requirements.txt` installed (includes `joblib`, `easyocr`, `xgboost`)
- [ ] First boot can download historical CSVs and EasyOCR weights
- [ ] Do not commit `data/ml_ensemble.joblib` secrets; caches are rebuildable

---

## Environment

| Variable | Meaning | Default |
|----------|---------|---------|
| `PORT` | Flask listen port | `5050` |
| `FLASK_ENV` | Optional Flask env | — |
