const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const {
  loadEnvFile, readSession, compilePath, sendFile
} = require('./src/http-helpers');

loadEnvFile(path.join(__dirname, '.env'));

const { requireAuthPage } = require('./src/auth');
const contentRouter = require('./src/routes/content');
const leadsRouter = require('./src/routes/leads');
const sessionRouter = require('./src/routes/session');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set in .env — using an insecure default. Set this before deploying.');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD not set in .env — login defaults to "leafcut". Set this before deploying.');
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const VIEWS_DIR = path.join(__dirname, 'views');

// ===== Assemble the full route table =====
// Each router collected routes as {method, path, handlers}; mount them under a prefix.
const allRoutes = [];
function mount(prefix, router) {
  router.__routes.forEach((r) => {
    const fullPath = prefix + (r.path === '/' ? '' : r.path);
    const { regex, paramNames } = compilePath(fullPath || '/');
    allRoutes.push({ method: r.method, regex, paramNames, handlers: r.handlers });
  });
}
mount('/api/content', contentRouter);
mount('/api/leads', leadsRouter);
mount('/api', sessionRouter);

// The dashboard page itself — protected, and deliberately NOT inside /public so it can
// never be reached as a plain static file.
allRoutes.push({
  method: 'GET',
  ...compilePath('/dashboard'),
  handlers: [requireAuthPage, async (req, res) => sendFile(res, path.join(VIEWS_DIR, 'dashboard.html'))]
});

function matchRoute(method, pathname) {
  for (const route of allRoutes) {
    if (route.method !== method) continue;
    const m = route.regex.exec(pathname);
    if (!m) continue;
    const params = {};
    route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
    return { handlers: route.handlers, params };
  }
  return null;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 2_000_000) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function augmentResponse(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  };
  res.redirect = (url) => {
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.end();
  };
  return res;
}

async function runHandlers(handlers, req, res) {
  let i = 0;
  return new Promise((resolve) => {
    function next(err) {
      if (err) {
        console.error(err);
        if (!res.headersSent && !res.writableEnded) res.status(500).json({ error: 'Server error' });
        return resolve();
      }
      const handler = handlers[i++];
      if (!handler) return resolve();
      Promise.resolve(handler(req, res, next))
        .catch((err2) => next(err2));
    }
    next();
  });
}

function serveStatic(req, res, pathname) {
  let relPath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(PUBLIC_DIR, relPath));
  if (!resolved.startsWith(PUBLIC_DIR)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.stat(resolved, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end('Not found');
    }
    sendFile(res, resolved);
  });
}

const server = http.createServer(async (req, res) => {
  augmentResponse(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  req.query = Object.fromEntries(url.searchParams);
  req.originalUrl = pathname + (url.search || '');
  req.session = readSession(req, SESSION_SECRET);

  if (req.method === 'POST' || req.method === 'PUT') {
    req.body = await readBody(req);
  }

  const match = matchRoute(req.method, pathname);
  if (match) {
    req.params = match.params;
    await runHandlers(match.handlers, req, res);
    return;
  }

  if (req.method === 'GET') {
    if (pathname.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    serveStatic(req, res, pathname);
    return;
  }

  res.status(404).json({ error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Leafcut backend running at http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard (login required)`);
});
