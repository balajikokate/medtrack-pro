const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

function signToken(id, type = 'user') {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitize(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

const VALID_ROLES = ['admin', 'pharmacist', 'technician'];

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'technician' },
    });
    res.status(201).json({ token: signToken(user.id), user: sanitize(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(user.id), user: sanitize(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json(sanitize(req.user));
}

async function verifyPassword(req, res, next) {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = !!password && (await bcrypt.compare(password, user.password));
    // Always 200 here, even when invalid — a wrong authorization password is a normal
    // outcome for this check, not an auth failure. Returning 401 would trip the global
    // axios interceptor and log the cashier out mid-sale.
    res.json({ valid, message: valid ? undefined : 'Incorrect password' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, verifyPassword };
