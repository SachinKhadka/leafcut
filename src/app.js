// The actual request-handling logic, factored out of server.js so it can be reused
// both by the local `node server.js` process and by the Vercel serverless function
// in api/handler.js — same router, same auth, same everything, no drift between
// "how it runs locally" and "how it runs deployed".
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const {
  readSession, compilePath, sendFile
} = require('./http-helpers');

const { requireAuthPage } = require('./auth');
const contentRouter = require('./routes/content');
const leadsRouter = require('./routes/leads');
const sessionRouter = require('./routes/session');

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set — using an insecure default. Set this in your environment before deploying.');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD not set — login defaults to "leafcut". Set this in your environment before deploying.');
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const VIEWS_DIR = path.join(__dirname, '..', 'views');

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
  // On Vercel, the platform may have already buffered and parsed the body onto
  // req.body before our handler runs. Only fall back to reading the raw stream
  // ourselves when that hasn't happened (e.g. the plain Node http server locally).
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve({}); }
  }
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

function send404(res) {
  const notFoundPath = path.join(PUBLIC_DIR, '404.html');
  fs.stat(notFoundPath, (err, stat) => {
    if (!err && stat.isFile()) return sendFile(res, notFoundPath, 404);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
  });
}

function serveStatic(req, res, pathname) {
  const relPath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(PUBLIC_DIR, relPath));
  if (!resolved.startsWith(PUBLIC_DIR)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.stat(resolved, (err, stat) => {
    if (!err && stat.isFile()) return sendFile(res, resolved);
    // Clean URLs, mirroring Vercel's `cleanUrls: true` in production:
    // /login resolves to /login.html when nothing exists at the exact path.
    if (!path.extname(relPath)) {
      const withHtml = resolved + '.html';
      return fs.stat(withHtml, (err2, stat2) => {
        if (!err2 && stat2.isFile()) return sendFile(res, withHtml);
        send404(res);
      });
    }
    send404(res);
  });
}

module.exports = async function handleRequest(req, res) {
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
};
