const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

loadEnvFile(resolve(process.cwd(), '../.env'));
loadEnvFile(resolve(process.cwd(), '.env'));

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.POSTGRES_HOST || '127.0.0.1';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DATABASE || 'multi_chatbot';
  const username = process.env.POSTGRES_USERNAME || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || '';

  const credentials = password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}`
    : encodeURIComponent(username);

  return `postgresql://${credentials}@${host}:${port}/${database}?schema=public`;
}

const args = process.argv.slice(2);
const result = spawnSync('prisma', args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: buildDatabaseUrl(),
  },
});

process.exit(result.status ?? 1);

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
