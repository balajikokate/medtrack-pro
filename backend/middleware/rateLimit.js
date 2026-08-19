const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
  // Functional tests log in dozens of times per run across many roles/flows —
  // skip enforcement under NODE_ENV=test so tests don't trip the same limiter
  // that's protecting real login traffic. The limiter's own behavior is
  // covered separately in tests/rateLimit.test.js, which flips NODE_ENV off.
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { loginLimiter };
