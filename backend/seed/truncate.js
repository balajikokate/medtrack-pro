require('dotenv').config();
const prisma = require('../config/prisma');

// Wipes all business data but keeps User accounts so login still works.
// Use before a live demo where you want to add everything from scratch on screen.
async function truncate() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.supplier.deleteMany();

  const userCount = await prisma.user.count();
  console.log('All business data cleared.');
  console.log(`Logins preserved: ${userCount} user account(s) untouched.`);
}

truncate()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
