# Leafcut Backend

Node.js backend for the Leafcut marketing site: serves the public site, powers the
inline WYSIWYG content editor, and stores lead submissions from the quote estimator.

Data is stored in JSON files under `data/` for now. The data-access layer
(`src/store.js`) is written as a thin async wrapper specifically so it can be swapped
for a real database (Postgres, Mongo, etc.) later without touching any route handler.

**Zero npm dependencies, on purpose.** Everything — routing, sessions, static file
serving, .env parsing — is built on Node's built-in modules only (`http`, `fs`,
`crypto`, `path`, `url`). There is nothing to `npm install`; just run it.

## Structure

```
server.js              Local dev entrypoint — HTTP server + .env loading, delegates to src/app.js
api/
  handler.js             Vercel serverless entrypoint — same src/app.js, different host
vercel.json             Vercel routing: /api/* and /dashboard -> api/handler.js, rest is static public/
src/
  app.js                 The actual router dispatch + static file serving (shared by both entrypoints)
  store.js               JSON file read/write locally; Vercel KV over REST when configured
  http-helpers.js        Router, .env parser, signed-cookie session helpers
  auth.js                 requireAuthApi / requireAuthPage middleware
  routes/
    session.js            POST /api/login, POST /api/logout, GET /api/session
    content.js             GET/PUT/POST/DELETE /api/content/*
    leads.js                GET/POST/PUT/DELETE /api/leads/*
data/
  content.json            Site copy + portfolio/services/team collections
  leads.json               Quote-form submissions
public/                  Statically served, no auth required
  index.html               The public marketing site
  login.html                Dashboard login page
views/
  dashboard.html           Leads dashboard — only reachable via authenticated GET /dashboard
```

## Running it

```bash
cp .env.example .env
# edit .env and set ADMIN_PASSWORD and SESSION_SECRET
node server.js
# or: npm start
```

Then open:
- `http://localhost:3000/` — the public site
- `http://localhost:3000/?edit=1` — inline WYSIWYG editor (redirects to login if not authenticated)
- `http://localhost:3000/dashboard` — leads dashboard (redirects to login if not authenticated)

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default `3000`) |
| `ADMIN_PASSWORD` | Password for `/login.html` — gates edit mode and the dashboard |
| `SESSION_SECRET` | Secret used to HMAC-sign the session cookie |

Both `ADMIN_PASSWORD` and `SESSION_SECRET` fall back to insecure defaults if unset
(the server logs a warning) — always set real values before deploying.

## API

All content and lead reads needed to render the public site are unauthenticated;
everything that writes content or reads/writes leads (which contain PII) requires
a logged-in session.

- `GET /api/content` — public. Full site content (site copy + portfolio/services/team).
- `PUT /api/content/site` — auth required. Patch the singleton copy fields (hero, about, testimonial, contact).
- `POST /api/content/:type` — auth required. `:type` is `portfolio` | `services` | `team`. Adds an item.
- `PUT /api/content/:type/:id` — auth required. Patches one item.
- `DELETE /api/content/:type/:id` — auth required.
- `GET /api/leads` — auth required.
- `POST /api/leads` — public. This is what the site's quote form submits to.
- `PUT /api/leads/:id` — auth required.
- `DELETE /api/leads/:id` — auth required.
- `POST /api/login`, `POST /api/logout`, `GET /api/session` — session management.

## What changed from the earlier prototype

The previous version of `index.html` / `dashboard.html` stored everything in
`localStorage`, which only worked for a single browser on a single machine and
wasn't shared between visitors or persisted anywhere real. This version:

- Moves all reads/writes to the API endpoints above, backed by `data/*.json` on the server.
- Adds real authentication (signed session cookie) gating edit mode and the dashboard,
  instead of anyone with the URL being able to edit the live site.
- Extends inline editing to the hero, about, testimonial and contact copy blocks
  (previously only Portfolio/Services/Team were editable).
- Serves the dashboard from a protected route (`/dashboard`) rather than a guessable
  static file, since it displays lead PII.

## Moving to a real database later

Everything reads/writes through `src/store.js` (`getContent`, `saveContent`,
`getLeads`, `saveLeads`). To move off JSON files, reimplement those four functions
against your database of choice — no other file needs to change.

## Deploying to Vercel

Vercel serverless functions have a read-only filesystem in production, so the
JSON-file storage above can't persist writes there — dashboard edits and lead
submissions would silently stop saving. `src/store.js` already has a fallback for
this: when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set, it reads/writes
through Vercel KV's REST API instead of `data/*.json`, over plain `fetch` (no new
dependency).

1. Push this repo to GitHub (already done) and import it into Vercel.
2. In the Vercel project settings, add `ADMIN_PASSWORD` and `SESSION_SECRET` as
   environment variables (same values you'd put in `.env` — don't commit `.env`).
3. In the project's **Storage** tab, create a KV database (Vercel's managed Redis)
   and connect it to this project. Vercel injects `KV_REST_API_URL` /
   `KV_REST_API_TOKEN` automatically — no code changes needed.
4. Deploy. `vercel.json` routes `/api/*` and `/dashboard` to `api/handler.js`
   (the same router as `server.js`, just running as a serverless function) and
   serves everything else statically from `public/`.

Without a KV store connected, the site and dashboard will still work, but any
content edits or lead submissions made in production won't persist between
requests — fine for a demo, not for a live site collecting real leads.
