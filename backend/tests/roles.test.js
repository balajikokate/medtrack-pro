const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');
const { resetDb, userWithToken, uniqueEmail } = require('./helpers');

let tokens; // { admin, pharmacist, technician }

beforeAll(async () => {
  await resetDb();
  const admin = await userWithToken(app, request, 'admin');
  const pharmacist = await userWithToken(app, request, 'pharmacist');
  const technician = await userWithToken(app, request, 'technician');
  tokens = { admin: admin.token, pharmacist: pharmacist.token, technician: technician.token };
});

afterAll(async () => {
  await prisma.$disconnect();
});

function authed(method, path, role) {
  return request(app)[method](path).set('Authorization', `Bearer ${tokens[role]}`);
}

describe('Settings — admin only can write', () => {
  it('admin can update settings', async () => {
    const res = await authed('put', '/api/settings', 'admin').send({ facilityName: 'Test Pharmacy' });
    expect(res.status).toBe(200);
  });

  it('pharmacist cannot update settings', async () => {
    const res = await authed('put', '/api/settings', 'pharmacist').send({ facilityName: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('technician cannot update settings', async () => {
    const res = await authed('put', '/api/settings', 'technician').send({ facilityName: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('every role can read settings', async () => {
    for (const role of ['admin', 'pharmacist', 'technician']) {
      const res = await authed('get', '/api/settings', role);
      expect(res.status).toBe(200);
    }
  });
});

describe('Staff — create/delete are admin-only, edit allows pharmacist', () => {
  let staffId;

  it('technician cannot create a staff member', async () => {
    const res = await authed('post', '/api/staff', 'technician').send({ name: 'X', role: 'Intern' });
    expect(res.status).toBe(403);
  });

  it('pharmacist cannot create a staff member', async () => {
    const res = await authed('post', '/api/staff', 'pharmacist').send({ name: 'X', role: 'Intern' });
    expect(res.status).toBe(403);
  });

  it('admin can create a staff member', async () => {
    const res = await authed('post', '/api/staff', 'admin').send({ name: 'Jordan Tech', role: 'Intern' });
    expect(res.status).toBe(201);
    staffId = res.body.id;
  });

  it('pharmacist can edit an existing staff member (e.g. toggle duty)', async () => {
    const res = await authed('put', `/api/staff/${staffId}`, 'pharmacist').send({ onDuty: false });
    expect(res.status).toBe(200);
  });

  it('technician cannot edit a staff member', async () => {
    const res = await authed('put', `/api/staff/${staffId}`, 'technician').send({ onDuty: true });
    expect(res.status).toBe(403);
  });

  it('pharmacist cannot delete a staff member', async () => {
    const res = await authed('delete', `/api/staff/${staffId}`, 'pharmacist');
    expect(res.status).toBe(403);
  });

  it('admin can delete a staff member', async () => {
    const res = await authed('delete', `/api/staff/${staffId}`, 'admin');
    expect(res.status).toBe(200);
  });

  it('every role can list staff', async () => {
    for (const role of ['admin', 'pharmacist', 'technician']) {
      const res = await authed('get', '/api/staff', role);
      expect(res.status).toBe(200);
    }
  });
});

describe('Products — pharmacist can manage, only admin can delete', () => {
  let productId;

  it('technician cannot create a product', async () => {
    const res = await authed('post', '/api/products', 'technician').send({ name: 'Test Med', category: 'Test' });
    expect(res.status).toBe(403);
  });

  it('pharmacist can create a product', async () => {
    const res = await authed('post', '/api/products', 'pharmacist').send({ name: 'Test Med', category: 'Test' });
    expect(res.status).toBe(201);
    productId = res.body.id;
  });

  it('technician cannot edit a product', async () => {
    const res = await authed('put', `/api/products/${productId}`, 'technician').send({ price: 10 });
    expect(res.status).toBe(403);
  });

  it('pharmacist can edit a product', async () => {
    const res = await authed('put', `/api/products/${productId}`, 'pharmacist').send({ price: 10 });
    expect(res.status).toBe(200);
  });

  it('pharmacist cannot delete a product', async () => {
    const res = await authed('delete', `/api/products/${productId}`, 'pharmacist');
    expect(res.status).toBe(403);
  });

  it('admin can delete a product', async () => {
    const res = await authed('delete', `/api/products/${productId}`, 'admin');
    expect(res.status).toBe(200);
  });

  it('every role can view products', async () => {
    for (const role of ['admin', 'pharmacist', 'technician']) {
      const res = await authed('get', '/api/products', role);
      expect(res.status).toBe(200);
    }
  });
});

describe('Suppliers — admin/pharmacist can manage, only admin can delete', () => {
  let supplierId;

  it('technician cannot create a supplier', async () => {
    const res = await authed('post', '/api/suppliers', 'technician').send({
      vendorId: `VND-${Date.now()}`,
      name: 'Test Supplier',
      categories: ['General'],
    });
    expect(res.status).toBe(403);
  });

  it('pharmacist can create a supplier', async () => {
    const res = await authed('post', '/api/suppliers', 'pharmacist').send({
      vendorId: `VND-${Date.now()}`,
      name: 'Test Supplier',
      categories: ['General'],
    });
    expect(res.status).toBe(201);
    supplierId = res.body.id;
  });

  it('technician cannot delete a supplier', async () => {
    const res = await authed('delete', `/api/suppliers/${supplierId}`, 'technician');
    expect(res.status).toBe(403);
  });

  it('pharmacist cannot delete a supplier (admin-only)', async () => {
    const res = await authed('delete', `/api/suppliers/${supplierId}`, 'pharmacist');
    expect(res.status).toBe(403);
  });

  it('admin can delete a supplier', async () => {
    const res = await authed('delete', `/api/suppliers/${supplierId}`, 'admin');
    expect(res.status).toBe(200);
  });
});

describe('Prescriptions — anyone can log one, only admin/pharmacist can verify', () => {
  let prescriptionId;

  it('technician can create (log) a prescription', async () => {
    const res = await authed('post', '/api/prescriptions', 'technician').send({
      patientName: 'Test Patient',
      doctorName: 'Dr. Test',
      medication: 'Test Med',
      quantity: 10,
      dateIssued: new Date().toISOString(),
    });
    expect(res.status).toBe(201);
    prescriptionId = res.body.id;
  });

  it('technician cannot verify a prescription', async () => {
    const res = await authed('put', `/api/prescriptions/${prescriptionId}/verify`, 'technician');
    expect(res.status).toBe(403);
  });

  it('pharmacist can verify a prescription', async () => {
    const res = await authed('put', `/api/prescriptions/${prescriptionId}/verify`, 'pharmacist');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Verified');
  });
});

describe('Sales / Dashboard / Analytics — open to every logged-in role', () => {
  it('technician can view sales, dashboard, and analytics', async () => {
    for (const path of ['/api/sales', '/api/dashboard', '/api/analytics']) {
      const res = await authed('get', path, 'technician');
      expect(res.status).toBe(200);
    }
  });
});
