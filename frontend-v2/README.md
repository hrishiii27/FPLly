# FPLly UI v2 (review)

Night-match editorial UI in this folder. The original app in `../frontend` is unchanged.

**Needs:** Node 18+, Flask API on port 5050.

```bash
cd frontend-v2
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Vite proxies `/api` to `127.0.0.1:5050` (3 minute timeout).

Run the existing UI at the same time on port 3000:

```bash
cd ../frontend && npm run dev
```
