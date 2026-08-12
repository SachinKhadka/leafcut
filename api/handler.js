// Vercel serverless entry point. All the actual routing/auth/content logic lives in
// src/app.js and is shared with server.js (local dev) — this file just adapts it to
// Vercel's Node.js function signature, which is directly compatible with Node's
// (req, res) since it's built on the same http primitives.
const path = require('path');
const { loadEnvFile } = require('../src/http-helpers');

// No-op in production (env vars come from the Vercel dashboard), but lets this
// function also work if invoked outside `vercel dev`'s own .env loading.
loadEnvFile(path.join(__dirname, '..', '.env'));

const handleRequest = require('../src/app');

module.exports = (req, res) => handleRequest(req, res);
