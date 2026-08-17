const prisma = require('../config/prisma');

async function getSales(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const total = await prisma.sale.count();
    const sales = await prisma.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    res.json({ data: sales, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

async function getRecentSales(req, res, next) {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    res.json(sales);
  } catch (err) {
    next(err);
  }
}

async function createSale(req, res, next) {
  try {
    const { items, customerName, prescriptionId, discount = 0, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Sale must include at least one item' });
    }

    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ message: `Product not found: ${item.productId}` });
      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      resolvedItems.push({ productId: product.id, name: product.name, quantity: item.quantity, price: product.price });
      subtotal += product.price * item.quantity;
    }

    const tax = Number((subtotal * 0.08).toFixed(2));
    const total = Number((subtotal + tax - discount).toFixed(2));
    const txnNumber = `TXN-${Date.now().toString().slice(-8)}`;

    const sale = await prisma.sale.create({
      data: {
        txnNumber,
        customerName,
        prescriptionId: prescriptionId || undefined,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod,
        cashierId: req.user.id,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });

    for (const item of resolvedItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSales, getRecentSales, createSale };
