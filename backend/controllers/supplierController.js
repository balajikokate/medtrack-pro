const prisma = require('../config/prisma');

async function getSuppliers(req, res, next) {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
}

async function getSupplier(req, res, next) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const orders = await prisma.purchaseOrder.findMany({
      where: { supplierId: supplier.id },
      orderBy: { date: 'desc' },
    });
    res.json({ ...supplier, orders });
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(supplier);
  } catch (err) {
    next(err);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json(supplier);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Supplier not found' });
    next(err);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Supplier not found' });
    next(err);
  }
}

async function createPurchaseOrder(req, res, next) {
  try {
    const { supplierId, items, amount } = req.body;
    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const order = await prisma.purchaseOrder.create({
      data: { poNumber, supplierId, items, amount },
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const activeSuppliers = await prisma.supplier.count({ where: { status: 'Active' } });
    const pendingOrders = await prisma.purchaseOrder.count({
      where: { status: { in: ['Pending', 'In Transit'] } },
    });
    const suppliers = await prisma.supplier.findMany();
    const avgLeadTime = suppliers.length
      ? (suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length).toFixed(1)
      : 0;
    res.json({ activeSuppliers, pendingOrders, avgLeadTime: Number(avgLeadTime) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  getStats,
};
