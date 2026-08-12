# AGENTS

## Purpose
This repository is a small Node.js backend for the Leafcut marketing site. It serves a static public site, an authenticated dashboard, and a JSON-backed API for inline content editing and lead management.

## Key points for AI agents
- No npm dependencies. The server runs on Node built-ins only.
- Run locally with `node server.js`, `npm start`, or `npm run dev`.
- Environment values are loaded from `.env` by `src/http-helpers.js`.
- `server.js` (local dev) and `api/handler.js` (Vercel) are thin entrypoints; the actual routing, static file serving, and auth-protected dashboard mounting live in `src/app.js` so both hosts share identical behavior.
- Auth is handled by `src/auth.js`. Protected APIs use `requireAuthApi`; the dashboard page uses `requireAuthPage`.
- `src/store.js` is the data access layer and is intentionally the swap point for a future real database. It reads/writes JSON files under `data/` locally, and falls back to Vercel KV (over REST via `fetch`) when `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set — needed because Vercel functions can't persist filesystem writes.
- Static site contents are in `public/`; the admin dashboard HTML is in `views/dashboard.html`.

## Important files
- `server.js` — local dev entrypoint; loads `.env` then hands requests to `src/app.js`
- `api/handler.js` — Vercel serverless entrypoint; same `src/app.js`, different host
- `vercel.json` — routes `/api/*` and `/dashboard` to `api/handler.js`, serves `public/` as static
- `src/app.js` — HTTP router, static asset handling, session loading, and route mounting
- `src/http-helpers.js` — custom request/response helpers, router utilities, cookie/session signing
- `src/auth.js` — authentication middleware for API and dashboard access
- `src/routes/` — API route handlers for content, leads, and session management
- `src/store.js` — JSON persistence abstraction for `data/content.json` and `data/leads.json`
- `data/` — persisted content and lead storage
- `README.md` — project overview, running instructions, and API summary

## Conventions and special behavior
- `data/` files are authoritative storage today; content edits and lead writes must flow through `src/store.js`.
- The app intentionally avoids external packages and runs without `npm install`.
- `SESSION_SECRET` and `ADMIN_PASSWORD` are required for secure deployment; the code logs warnings and falls back to insecure defaults if missing.
- The dashboard route is intentionally not in `public/` so it cannot be fetched as an unauthenticated static file.

## When making changes
- Keep route structure and auth behavior consistent with `README.md`.
- If changing storage behavior, update `src/store.js` and preserve the async interface used by route handlers.
- If changing sessions, review `src/http-helpers.js` and `src/auth.js` together.

## References
- [README.md](README.md)
