// Data store with two backends, chosen automatically at call time — this module is
// the drop-in seam route handlers never need to know about:
//   - Local JSON files under data/ (the default — what `node server.js` uses).
//   - Vercel KV (Upstash Redis's REST API), used when KV_REST_API_URL /
//     KV_REST_API_TOKEN are set. Vercel serverless functions have a read-only
//     filesystem in production, so the JSON-file backend can't persist writes
//     there; connecting a KV store from the Vercel dashboard injects those two
//     env vars automatically and this module picks them up with no code changes.
// Talks to KV over plain fetch (built into Node 18+) — no new npm dependency.
const fs = require('fs/promises');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', 'data', 'content.json');
const LEADS_PATH = path.join(__dirname, '..', 'data', 'leads.json');

const EMPTY_CONTENT = { site: {}, portfolio: [], services: [], team: [], logos: [] };

function kvConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvGet(key) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`KV get ${key} failed: ${res.status}`);
  const { result } = await res.json();
  return result === null || result === undefined ? null : JSON.parse(result);
}

async function kvSet(key, value) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error(`KV set ${key} failed: ${res.status}`);
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(filePath, data) {
  // Write to a temp file then rename, so a crash mid-write can't corrupt the file.
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmpPath, filePath);
}

async function getContent() {
  if (kvConfigured()) {
    const content = await kvGet('leafcut:content');
    return { ...EMPTY_CONTENT, ...(content || {}) };
  }
  const content = await readJson(CONTENT_PATH, EMPTY_CONTENT);
  return { ...EMPTY_CONTENT, ...content };
}
async function saveContent(content) {
  if (kvConfigured()) {
    await kvSet('leafcut:content', content);
    return content;
  }
  await writeJson(CONTENT_PATH, content);
  return content;
}

async function getLeads() {
  if (kvConfigured()) {
    const leads = await kvGet('leafcut:leads');
    return leads || [];
  }
  return readJson(LEADS_PATH, []);
}
async function saveLeads(leads) {
  if (kvConfigured()) {
    await kvSet('leafcut:leads', leads);
    return leads;
  }
  await writeJson(LEADS_PATH, leads);
  return leads;
}

// Route handlers do read → modify → write across two separate store calls,
// which races if two requests overlap (e.g. the dashboard's bulk actions
// firing several PUT/DELETE calls back to back): both read the same
// pre-write state, and whichever save() lands second silently discards the
// first save's change. These two queues serialize same-resource writes
// within this process so each transaction fully completes before the next
// starts — the fix on the client is to also await requests sequentially
// rather than firing them with Promise.all, since a serverless deployment
// may not route concurrent requests to the same process (and thus the same
// queue) at all.
function makeLock() {
  let chain = Promise.resolve();
  return function withLock(fn) {
    const run = chain.then(fn, fn);
    chain = run.then(() => {}, () => {});
    return run;
  };
}
const withContentLock = makeLock();
const withLeadsLock = makeLock();

module.exports = { getContent, saveContent, getLeads, saveLeads, withContentLock, withLeadsLock };
