const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

function signSupplierToken(id) {
  return jwt.sign({ id, type: 'supplier' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitize(supplier) {
  const { password, ...rest } = supplier;
  return rest;
}

async function supplierLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const supplier = await prisma.supplier.findFirst({ where: { contactEmail: email } });
    if (!supplier || !supplier.password || !(await bcrypt.compare(password, supplier.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signSupplierToken(supplier.id), supplier: sanitize(supplier) });
  } catch (err) {
    next(err);
  }
}

async function supplierMe(req, res) {
  res.json(sanitize(req.supplier));
}

module.exports = { supplierLogin, supplierMe };
