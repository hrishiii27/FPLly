# 🚀 FPLly Deployment Guide

## Architecture Overview
FPLly has **two parts** that need to be deployed:
1. **Backend (Flask)** - Python API server
2. **Frontend (React)** - Vite/React static app

---

## Option 1: Railway (Recommended - Easiest)

### Backend Deployment

1. **Create Railway Account**: https://railway.app

2. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Create `Procfile`** in project root:
   ```
   web: python server.py
   ```

4. **Create `runtime.txt`**:
   ```
   python-3.11.0
   ```

5. **Deploy**:
   ```bash
   cd /Users/hrishikeshvirupakshi/Downloads/FPLly
   railway init
   railway up
   ```

6. **Get your URL**: `https://fplly-production.up.railway.app`

### Frontend Deployment (Vercel)

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Set API URL**: Create `.env.production`:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   ```

4. **Update fetch calls** in frontend to use `import.meta.env.VITE_API_URL`

---

## Option 2: Render (Free Tier Available)

### Backend on Render

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
   - **Environment**: Python 3

### Frontend on Render

1. New → Static Site
2. **Build Command**: `cd frontend && npm install && npm run build`
3. **Publish Directory**: `frontend/dist`

---

## Option 3: Docker (For VPS/Cloud)

### Create `Dockerfile` in project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Build frontend
RUN apt-get update && apt-get install -y nodejs npm
RUN cd frontend && npm install && npm run build

EXPOSE 5050

CMD ["python", "server.py"]
```

### Build & Run:
```bash
docker build -t fplly .
docker run -p 5050:5050 fplly
```

---

## Quick Checklist Before Deploy

- [ ] Set `debug=False` in `server.py` for production
- [ ] Add CORS origin for your frontend URL
- [ ] Test locally with `npm run build` first
- [ ] Ensure all dependencies are in `requirements.txt`

---

## Environment Variables (If Needed)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5050` |
| `FLASK_ENV` | Environment | `production` |

---

## Estimated Costs

| Platform | Free Tier | Paid |
|----------|-----------|------|
| Railway | 500 hours/month | $5/mo |
| Render | Static sites free, backend sleeps | $7/mo |
| Vercel | Frontend free | - |
| Heroku | No free tier | $5/mo |

**Recommendation**: Use **Railway** (backend) + **Vercel** (frontend) for the best free experience!
