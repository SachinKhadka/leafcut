// A tiny, dependency-free HTTP layer standing in for Express — this sandbox has no
// access to the npm registry, so the backend runs on Node's built-ins only (http, fs,
// crypto). No "npm install" step needed: just `node server.js`. The API surface below
// intentionally mirrors just enough of Express (req.params/req.body, res.status().json())
// that swapping to real Express later, if desired, would be a near drop-in change.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function sign(value, secret) {
  const h = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  return value + '.' + h;
}
function unsign(signed, secret) {
  if (!signed) return null;
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const h = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  const a = Buffer.from(h);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function readSession(req, secret) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies['leafcut_session'];
  const unsigned = unsign(raw, secret);
  if (!unsigned) return {};
  try {
    return JSON.parse(Buffer.from(unsigned, 'base64url').toString('utf-8'));
  } catch { return {}; }
}

function setSessionCookie(res, sessionObj, secret) {
  const encoded = Buffer.from(JSON.stringify(sessionObj), 'utf-8').toString('base64url');
  const signed = sign(encoded, secret);
  const maxAge = 24 * 60 * 60; // 1 day, in seconds
  res.setHeader('Set-Cookie', `leafcut_session=${signed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'leafcut_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function createRouter() {
  const routes = [];
  const router = { __routes: routes };
  ['get', 'post', 'put', 'delete'].forEach((m) => {
    router[m] = (p, ...handlers) => routes.push({ method: m.toUpperCase(), path: p, handlers });
  });
  return router;
}

function compilePath(pattern) {
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) { paramNames.push(seg.slice(1)); return '([^/]+)'; }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp('^' + (regexStr || '/') + '/?$'), paramNames };
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.statusCode = 200;
    res.end(data);
  });
}

module.exports = { MIME, loadEnvFile, parseCookies, sign, unsign, readSession, setSessionCookie, clearSessionCookie, createRouter, compilePath, sendFile };
