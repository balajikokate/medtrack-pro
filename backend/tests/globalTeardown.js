const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

module.exports = async function globalTeardown() {
  const baseUrl = process.env.DATABASE_URL;
  const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  // Scoped to the named schema only — cannot affect `public`.
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "test" CASCADE;');
  await admin.$disconnect();
};
