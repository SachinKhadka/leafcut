const http = require('http');
const path = require('path');
const { loadEnvFile } = require('./src/http-helpers');

loadEnvFile(path.join(__dirname, '.env'));

// Loaded after loadEnvFile so process.env is populated before src/app.js reads it.
const handleRequest = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Leafcut backend running at http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard (login required)`);
});
