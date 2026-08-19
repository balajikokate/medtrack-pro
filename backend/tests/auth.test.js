const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');
const { resetDb, createUser, loginAs, userWithToken, uniqueEmail, PASSWORD } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  beforeEach(resetDb);

  it('rejects an unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nobody', email: uniqueEmail('nobody'), password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(401);
  });

  it('rejects a request from a logged-in technician', async () => {
    const { token } = await userWithToken(app, request, 'technician');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sneaky', email: uniqueEmail('sneaky'), password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('rejects a request from a logged-in pharmacist', async () => {
    const { token } = await userWithToken(app, request, 'pharmacist');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sneaky', email: uniqueEmail('sneaky'), password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('lets an admin create a new user', async () => {
    const { token } = await userWithToken(app, request, 'admin');
    const email = uniqueEmail('newtech');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Tech', email, password: PASSWORD, role: 'technician' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, role: 'technician' });
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects a role outside the known set, even for an admin', async () => {
    const { token } = await userWithToken(app, request, 'admin');
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Role', email: uniqueEmail('badrole'), password: PASSWORD, role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    const { token } = await userWithToken(app, request, 'admin');
    const email = uniqueEmail('dupe');
    await createUser('technician', { email });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate', email, password: PASSWORD, role: 'technician' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(resetDb);

  it('rejects an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.medtrack.local', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects the wrong password', async () => {
    const { user } = await createUser('admin');
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs in with the correct password and returns a usable token', async () => {
    const { user } = await createUser('pharmacist');
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: user.email, role: 'pharmacist' });
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(resetDb);

  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user without the password hash', async () => {
    const { user, token } = await userWithToken(app, request, 'technician');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: user.email, role: 'technician' });
    expect(res.body.password).toBeUndefined();
  });
});

describe('PUT /api/auth/change-password', () => {
  beforeEach(resetDb);

  it('rejects the wrong current password', async () => {
    const { token } = await userWithToken(app, request, 'admin');
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'brandnewpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const { token } = await userWithToken(app, request, 'admin');
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('updates the password and the old one stops working', async () => {
    const { user, token } = await userWithToken(app, request, 'admin');
    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'brandnewpassword' });
    expect(changeRes.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/auth/login').send({ email: user.email, password: 'brandnewpassword' });
    expect(newLogin.status).toBe(200);
  });
});
