const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// Order matters — children before parents, to satisfy foreign keys.
async function resetDb() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.productBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
}

let counter = 0;
function uniqueEmail(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.medtrack.local`;
}

const PASSWORD = 'testpass123';

async function createUser(role, overrides = {}) {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      name: overrides.name || `Test ${role}`,
      email: overrides.email || uniqueEmail(role),
      password: hashed,
      role,
    },
  });
  return { user, password: PASSWORD };
}

async function loginAs(app, request, email, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

// Creates a user with the given role and returns a ready-to-use bearer token.
async function userWithToken(app, request, role, overrides = {}) {
  const { user, password } = await createUser(role, overrides);
  const token = await loginAs(app, request, user.email, password);
  return { user, token };
}

module.exports = { resetDb, createUser, loginAs, userWithToken, uniqueEmail, PASSWORD };
