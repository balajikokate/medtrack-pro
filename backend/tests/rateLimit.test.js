const express = require('express');
const request = require('supertest');

describe('login rate limiter', () => {
  let app;
  let originalNodeEnv;

  beforeAll(() => {
    // The real loginLimiter skips enforcement under NODE_ENV=test (see
    // middleware/rateLimit.js) so the rest of the suite can log in freely.
    // Flip it off just for this file, against a throwaway app — not the
    // shared login route — so we don't burn the real limiter's window.
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { loginLimiter } = require('../middleware/rateLimit');

    app = express();
    app.use(express.json());
    app.post('/test-login', loginLimiter, (req, res) => res.json({ ok: true }));
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('allows requests under the limit and blocks the one after it', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/test-login').send({});
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).post('/test-login').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/too many/i);
  });
});
