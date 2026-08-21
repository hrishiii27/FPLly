# FPLly frontend

Vite + React + Tailwind. Dev server: **port 3000**, proxies `/api` to `http://127.0.0.1:5050` with a 180s timeout (EasyOCR / first ML train).

```bash
npm install
npm run dev
```

Production build: `npm run build` → `dist/`. Point `VITE_API_URL` at the Flask host (see `../DEPLOY.md`).
