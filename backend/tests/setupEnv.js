const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { testDbUrl } = require('./testDbUrl');

// Runs before each test file's modules are loaded, so config/prisma.js picks
// up the isolated test schema instead of the real one when it constructs its
// PrismaClient singleton.
process.env.DATABASE_URL = testDbUrl(process.env.DATABASE_URL);
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-do-not-use-in-production';
// Never send real emails or hit Resend during tests.
process.env.RESEND_API_KEY = '';
