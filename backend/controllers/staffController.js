const prisma = require('../config/prisma');

async function getStaff(req, res, next) {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (status === 'on_duty') where.onDuty = true;
    if (status === 'off_duty') where.onDuty = false;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const total = await prisma.staff.count({ where });
    const staff = await prisma.staff.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ data: staff, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

async function createStaff(req, res, next) {
  try {
    const staff = await prisma.staff.create({ data: req.body });
    res.status(201).json(staff);
  } catch (err) {
    next(err);
  }
}

async function updateStaff(req, res, next) {
  try {
    const staff = await prisma.staff.update({ where: { id: req.params.id }, data: req.body });
    res.json(staff);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Staff member not found' });
    next(err);
  }
}

async function deleteStaff(req, res, next) {
  try {
    await prisma.staff.delete({ where: { id: req.params.id } });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Staff member not found' });
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const totalStaff = await prisma.staff.count();
    const onDuty = await prisma.staff.count({ where: { onDuty: true } });
    const leadPharmacists = await prisma.staff.count({ where: { role: 'Lead Pharmacist' } });
    res.json({ totalStaff, onDuty, leadPharmacists, pendingReviews: 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStaff, createStaff, updateStaff, deleteStaff, getStats };
