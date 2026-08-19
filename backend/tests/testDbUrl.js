// Derives an isolated-schema connection string from DATABASE_URL so tests
// never touch the `public` schema where real/demo data lives. Same formula
// used by globalSetup, globalTeardown, and setupEnv — each runs in its own
// process/context, so this can't be computed once and shared.
function testDbUrl(baseUrl) {
  if (!baseUrl) throw new Error('DATABASE_URL is not set — cannot derive a test database URL');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}schema=test`;
}

module.exports = { testDbUrl };
