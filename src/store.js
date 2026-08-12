// JSON-file backed data store. Every function here is async on purpose (even though
// fs access is cheap) so this module is a drop-in seam: swap the bodies for real
// database calls (Postgres/Mongo/etc.) later without touching any route handler.
const fs = require('fs/promises');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', 'data', 'content.json');
const LEADS_PATH = path.join(__dirname, '..', 'data', 'leads.json');

const EMPTY_CONTENT = { site: {}, portfolio: [], services: [], team: [] };

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
  const content = await readJson(CONTENT_PATH, EMPTY_CONTENT);
  return { ...EMPTY_CONTENT, ...content };
}
async function saveContent(content) {
  await writeJson(CONTENT_PATH, content);
  return content;
}

async function getLeads() {
  return readJson(LEADS_PATH, []);
}
async function saveLeads(leads) {
  await writeJson(LEADS_PATH, leads);
  return leads;
}

module.exports = { getContent, saveContent, getLeads, saveLeads };
