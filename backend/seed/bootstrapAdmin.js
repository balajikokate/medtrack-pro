require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// For a real customer deployment. Unlike seed.js, this does not touch or
// delete any existing data — it only creates the first admin login (if none
// exists yet) so the pharmacy can sign in and start using a clean database.

function generatePassword() {
  return crypto.randomBytes(9).toString('base64url');
}

async function bootstrap() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existingAdmin) {
    console.log(`An admin account already exists (${existingAdmin.email}). Nothing to do.`);
    return;
  }

  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Admin';
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    console.error('Set BOOTSTRAP_ADMIN_EMAIL before running this script.');
    process.exit(1);
  }

  const providedPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const password = providedPassword || generatePassword();

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashed, role: 'admin' },
  });

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({ data: {} });
  }

  console.log('Admin account created.');
  console.log(`  Email:    ${email}`);
  if (!providedPassword) {
    console.log(`  Password: ${password}  (generated — save this now, it will not be shown again)`);
  } else {
    console.log('  Password: (the one you set in BOOTSTRAP_ADMIN_PASSWORD)');
  }
  console.log('Log in and change the password immediately from a real device.');
}

bootstrap()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
