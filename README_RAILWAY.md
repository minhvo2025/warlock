# Outra Multiplayer Deployment (Railway)

This project is split into:

- Frontend service (repo root)
- Multiplayer backend service (`server/`)

## 1) Deploy backend service (Socket.IO)

Create a new Railway service from this same repository and set:

- **Root Directory**: `server`
- **Start Command**: `npm start` (already in `server/package.json`)

Backend env vars:

- `PORT` is optional on Railway (Railway sets it automatically)
- Server already binds `0.0.0.0` and uses `process.env.PORT`

Expected health check:

- `GET /` returns: `Outra multiplayer server is running.`

## 2) Deploy frontend service

Create another Railway service from this repository root.
This repo includes a root `Dockerfile` that serves the frontend through Caddy.

Required frontend env var:

- `OUTRA_MULTIPLAYER_SERVER_URL`
  - Example: `https://your-outra-server.up.railway.app`

This value is exposed at runtime through `/runtime-config.js` and used by `js/multiplayer.js`.

## 3) Local workflow (unchanged)

- Backend local: `cd server && npm install && npm start`
- Frontend local: serve repo root as before
- Local browser on `localhost` still defaults to `http://localhost:3001`

## 4) Verification checklist

1. Open frontend URL in browser.
2. Open DevTools console.
3. Confirm multiplayer log says it is connecting to your Railway backend URL (not localhost).
4. Confirm connect/disconnect logs appear with socket id.
5. Test room create/join from two browser windows.
