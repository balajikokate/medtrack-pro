const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function protect(req, res, next) {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type && decoded.type !== 'user') {
      return res.status(403).json({ message: 'Forbidden: wrong token type' });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    delete user.password;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
}

async function protectSupplier(req, res, next) {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'supplier') {
      return res.status(403).json({ message: 'Forbidden: wrong token type' });
    }
    const supplier = await prisma.supplier.findUnique({ where: { id: decoded.id } });
    if (!supplier) {
      return res.status(401).json({ message: 'Supplier no longer exists' });
    }
    delete supplier.password;
    req.supplier = supplier;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { protect, authorize, protectSupplier };
