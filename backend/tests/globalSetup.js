const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { testDbUrl } = require('./testDbUrl');

module.exports = async function globalSetup() {
  const baseUrl = process.env.DATABASE_URL;
  const testUrl = testDbUrl(baseUrl);

  // Create the isolated schema up front (idempotent) using the base connection,
  // which has CREATE privileges. Everything after this only ever talks to `test`.
  const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  await admin.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "test";');
  await admin.$disconnect();

  // Sync the Prisma schema's tables into that schema. This only creates/alters
  // tables inside `test` — it does not touch `public`.
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
};
