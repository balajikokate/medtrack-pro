require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function seed() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  const hashed = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Sarah Jenkins',
      email: 'admin@medtrack.pro',
      password: hashed,
      role: 'admin',
    },
  });

  const medEquip = await prisma.supplier.create({
    data: {
      vendorId: 'VND-8492',
      name: 'MedEquip Solutions',
      categories: ['Surgical Instruments', 'PPE'],
      status: 'Active',
      leadTimeDays: 3,
      rating: 4.8,
      contactName: 'Sarah Jenkins',
      contactEmail: 's.jenkins@medequip.com',
      contactPhone: '1-800-555-0199',
      phoneExt: '402',
    },
  });

  const pharmaGlobal = await prisma.supplier.create({
    data: {
      vendorId: 'VND-7331',
      name: 'PharmaGlobal Inc.',
      categories: ['Bulk Pharmaceuticals'],
      status: 'Active',
      leadTimeDays: 5,
      rating: 4.5,
      contactName: 'Tom Reyes',
      contactEmail: 't.reyes@pharmaglobal.com',
      contactPhone: '1-800-555-0142',
      phoneExt: '110',
    },
  });

  await prisma.supplier.create({
    data: {
      vendorId: 'VND-5510',
      name: 'CareSupply Direct',
      categories: ['General Disposables'],
      status: 'Inactive',
      leadTimeDays: 2,
      rating: 3.9,
      contactName: 'Amy Chen',
      contactEmail: 'a.chen@caresupply.com',
      contactPhone: '1-800-555-0188',
      phoneExt: '221',
    },
  });

  await prisma.purchaseOrder.createMany({
    data: [
      { poNumber: 'PO-2023-1102', supplierId: medEquip.id, date: new Date('2023-10-24'), status: 'In Transit', amount: 4250.0 },
      { poNumber: 'PO-2023-1089', supplierId: medEquip.id, date: new Date('2023-10-15'), status: 'Delivered', amount: 1820.5 },
      { poNumber: 'PO-2023-1045', supplierId: medEquip.id, date: new Date('2023-09-28'), status: 'Delivered', amount: 8900.0 },
    ],
  });

  const productData = [
    { name: 'Amoxicillin 500mg', form: 'Capsules', category: 'Antibiotics', ndc: '00093-3109-01', batchNo: 'BAT-48291', expiryDate: daysFromNow(540), quantity: 4500, minLevel: 500, price: 12.5, requiresPrescription: true, supplierId: pharmaGlobal.id },
    { name: 'Ibuprofen 200mg', form: 'Tablets', category: 'Painkillers', ndc: '00071-0222-01', batchNo: 'BAT-77320', expiryDate: daysFromNow(365), quantity: 150, minLevel: 200, price: 8.99, requiresPrescription: false, supplierId: pharmaGlobal.id },
    { name: 'Atorvastatin 20mg', form: 'Tablets', category: 'Cardiovascular', ndc: '00071-0156-23', batchNo: 'BAT-11092', expiryDate: daysFromNow(-45), quantity: 80, minLevel: 100, price: 45.0, requiresPrescription: true, supplierId: pharmaGlobal.id },
    { name: 'Vitamin D3 1000 IU', form: 'Softgels', category: 'Supplements', ndc: '00093-9982-01', batchNo: 'BAT-99441', expiryDate: daysFromNow(600), quantity: 1200, minLevel: 300, price: 6.5, requiresPrescription: false },
    { name: 'Epinephrine Auto-Injector', form: 'Injection', category: 'Emergency', ndc: '00000-0000-00', batchNo: 'BAT-30021', expiryDate: daysFromNow(450), quantity: 2, minLevel: 10, price: 350.0, requiresPrescription: true },
    { name: 'Albuterol Inhaler', form: 'Inhaler', category: 'Respiratory', ndc: '11111-1111-11', batchNo: 'BAT-30022', expiryDate: daysFromNow(450), quantity: 15, minLevel: 25, price: 42.0, requiresPrescription: true },
    { name: 'Insulin Glargine Pen', form: 'Injection', category: 'Endocrine', ndc: '22222-2222-22', batchNo: 'BAT-30023', expiryDate: daysFromNow(450), quantity: 45, minLevel: 40, price: 120.0, requiresPrescription: true },
    { name: 'Lisinopril 10mg', form: 'Tablets', category: 'Cardiovascular', ndc: '00185-0030-01', batchNo: 'BAT-55021', expiryDate: daysFromNow(540), quantity: 980, minLevel: 200, price: 15.0, requiresPrescription: true },
    { name: 'Metformin 500mg', form: 'Tablets', category: 'Antidiabetics', ndc: '00093-7212-01', batchNo: 'BAT-55022', expiryDate: daysFromNow(20), quantity: 720, minLevel: 150, price: 8.0, requiresPrescription: true },
  ];

  const products = [];
  for (const p of productData) {
    products.push(await prisma.product.create({ data: p }));
  }

  await prisma.staff.createMany({
    data: [
      { name: 'Dr. Sarah Jenkins', role: 'Lead Pharmacist', licenseId: 'RPH-99482-TX', email: 's.jenkins@medtrack.pro', phone: '555-019-2834', onDuty: true, userId: admin.id },
      { name: 'Mark Davis', role: 'Staff Pharmacist', licenseId: 'RPH-44219-TX', email: 'm.davis@medtrack.pro', phone: '555-018-3742', onDuty: false },
      { name: 'Elena Rodriguez', role: 'Pharmacy Tech', licenseId: 'PHT-88321-TX', email: 'e.rodriguez@medtrack.pro', phone: '555-012-9983', onDuty: true },
      { name: 'Jonathan Lee', role: 'Intern', licenseId: 'INT-11204-TX', email: 'j.lee@medtrack.pro', phone: '555-017-4432', onDuty: true },
    ],
  });

  await prisma.prescription.createMany({
    data: [
      { rxId: 'RX-9082-A', type: 'digital', patientName: 'Eleanor Vance', doctorName: 'Dr. Montague', medication: 'Amoxicillin 500mg', quantity: 30, dateIssued: new Date('2023-10-27'), status: 'Pending' },
      { rxId: 'RX-7741-B', type: 'physical', patientName: 'Luke Crain', doctorName: 'Dr. Markway', medication: 'Lisinopril 10mg', quantity: 90, dateIssued: new Date('2023-10-26'), status: 'Verified' },
      { rxId: 'RX-1102-C', type: 'digital', patientName: 'Theodora Vance', doctorName: 'Dr. Sanderson', medication: 'Atorvastatin 20mg', quantity: 30, dateIssued: new Date('2022-05-14'), status: 'Expired' },
      { rxId: 'RX-9921-X', type: 'digital', patientName: 'Shirley Jackson', doctorName: 'Dr. Montague', medication: 'Metformin 850mg', quantity: 60, dateIssued: new Date('2023-10-28'), status: 'Pending' },
    ],
  });

  await prisma.sale.create({
    data: {
      txnNumber: 'TXN-49201',
      customerName: 'Walk-in Customer',
      subtotal: 25.0,
      tax: 2.0,
      discount: 0,
      total: 27.0,
      paymentMethod: 'cash',
      status: 'Completed',
      cashierId: admin.id,
      items: { create: [{ productId: products[0].id, name: products[0].name, quantity: 2, price: 12.5 }] },
    },
  });

  await prisma.sale.create({
    data: {
      txnNumber: 'TXN-49200',
      customerName: 'Walk-in Customer',
      subtotal: 12.0,
      tax: 0.96,
      discount: 0,
      total: 12.96,
      paymentMethod: 'card',
      status: 'Completed',
      cashierId: admin.id,
      items: { create: [{ productId: products[7].id, name: products[7].name, quantity: 1, price: 12.0 }] },
    },
  });

  await prisma.sale.create({
    data: {
      txnNumber: 'TXN-49199',
      customerName: 'Walk-in Customer',
      subtotal: 8.99,
      tax: 0.72,
      discount: 0,
      total: 9.71,
      paymentMethod: 'cash',
      status: 'Completed',
      cashierId: admin.id,
      items: { create: [{ productId: products[1].id, name: products[1].name, quantity: 1, price: 8.99 }] },
    },
  });

  await prisma.settings.create({
    data: {
      facilityName: 'City Center Pharmacy',
      taxId: 'XX-XXXX429',
      address: '1204 Medical District Blvd, Suite 200',
      contactNumber: '(555) 867-5309',
      complianceOfficer: 'Dr. Sarah Jenkins',
      lowStockAlerts: true,
      automatedBackups: true,
    },
  });

  console.log('Seed complete.');
  console.log('Login with: admin@medtrack.pro / password123');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
