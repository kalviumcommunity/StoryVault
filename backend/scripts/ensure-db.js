const net = require('net');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/storyvault?schema=public';
const match = dbUrl.match(/@([^:/]+)(?::(\d+))?/);
const dbHost = match ? match[1] : '127.0.0.1';
const dbPort = match && match[2] ? parseInt(match[2], 10) : 5433;

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureDb() {
  const isUp = await checkPort(dbHost, dbPort);
  if (isUp) {
    console.log(`[StoryVault DB] PostgreSQL is already running on ${dbHost}:${dbPort}`);
    return;
  }

  console.log(`[StoryVault DB] PostgreSQL not detected on ${dbHost}:${dbPort}. Attempting to start local instance...`);

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const pgData = path.join(localAppData, 'storyvault_pgdata');
    const pgCtl = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe';

    if (fs.existsSync(pgData) && fs.existsSync(pgCtl)) {
      try {
        console.log(`[StoryVault DB] Starting PostgreSQL with pg_ctl from ${pgData}...`);
        execSync(`"${pgCtl}" start -D "${pgData}" -w`, { stdio: 'inherit', timeout: 30000 });
      } catch (err) {
        console.warn(`[StoryVault DB] pg_ctl start returned: ${err.message}`);
      }
    }
  }

  // Poll for connection
  for (let i = 0; i < 15; i++) {
    const ready = await checkPort(dbHost, dbPort);
    if (ready) {
      console.log(`[StoryVault DB] PostgreSQL is now active and ready on ${dbHost}:${dbPort}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.warn(`[StoryVault DB] Warning: Unable to confirm PostgreSQL on ${dbHost}:${dbPort}. Continuing startup...`);
}

ensureDb().catch((err) => {
  console.warn(`[StoryVault DB] Warning during DB check:`, err.message);
});
