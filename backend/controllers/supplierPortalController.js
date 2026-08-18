const prisma = require('../config/prisma');
const { sendPOResponseEmail } = require('../utils/email');

async function listMyPurchaseOrders(req, res, next) {
  try {
    const { status, page = 1, limit = 5 } = req.query;
    const supplierId = req.supplier.id;
    const where = { supplierId };
    if (status) where.status = status;

    const total = await prisma.purchaseOrder.count({ where });
    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { date: 'desc' }, // newest first
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const counts = {
      all: await prisma.purchaseOrder.count({ where: { supplierId } }),
      Pending: await prisma.purchaseOrder.count({ where: { supplierId, status: 'Pending' } }),
      Approved: await prisma.purchaseOrder.count({ where: { supplierId, status: 'Approved' } }),
      Delivered: await prisma.purchaseOrder.count({ where: { supplierId, status: 'Delivered' } }),
      Rejected: await prisma.purchaseOrder.count({ where: { supplierId, status: 'Rejected' } }),
      Reassigned: await prisma.purchaseOrder.count({ where: { supplierId, status: 'Reassigned' } }),
    };

    res.json({ data: orders, total, page: Number(page), limit: Number(limit), counts });
  } catch (err) {
    next(err);
  }
}

// Lightweight, always-unpaginated — just the Pending order ids, used to compute the
// "new activity" bell badge independent of whatever page/filter the supplier is viewing.
async function listPendingIds(req, res, next) {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { supplierId: req.supplier.id, status: 'Pending' },
      select: { id: true },
    });
    res.json(orders.map((o) => o.id));
  } catch (err) {
    next(err);
  }
}

async function notifyAdmin(order, status) {
  const settings = await prisma.settings.findFirst();
  if (settings?.adminEmail) {
    sendPOResponseEmail(settings.adminEmail, order.supplier, order, status).catch((err) =>
      console.error('[email] admin PO response notification failed:', err)
    );
  }
}

async function approvePurchaseOrder(req, res, next) {
  try {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, supplierId: req.supplier.id },
    });
    if (!existing) return res.status(404).json({ message: 'Purchase order not found' });
    if (existing.status !== 'Pending') {
      return res.status(400).json({ message: `This order is already ${existing.status.toLowerCase()}` });
    }

    const fulfilledQuantities = req.body.fulfilledQuantities || {};
    const batchExpiryDates = req.body.batchExpiryDates || {};
    const lines = Array.isArray(existing.items?.lines) ? existing.items.lines : [];

    // Supplier can supply less than what was ordered (or 0 for an item they don't have) —
    // default to the full ordered quantity for any line they didn't touch.
    const updatedLines = [];
    for (const line of lines) {
      const raw = fulfilledQuantities[line.productId];
      const fulfilledQuantity = raw === undefined ? line.quantity : Math.max(0, Number(raw) || 0);
      const expiryRaw = batchExpiryDates[line.productId];
      if (fulfilledQuantity > 0 && !expiryRaw) {
        return res
          .status(400)
          .json({ message: `Expiry date is required for the batch of ${line.name} you're supplying` });
      }
      updatedLines.push({ ...line, fulfilledQuantity, batchExpiryDate: expiryRaw || null });
    }

    // Approving only records what the supplier has committed to — it does NOT touch
    // Inventory. Stock is only added once the admin confirms the delivery actually
    // arrived (see receiveDelivery in supplierController.js), since "I'll send it"
    // and "it's physically on the shelf" are two different real-world moments.
    const order = await prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: 'Approved', respondedAt: new Date(), items: { lines: updatedLines } },
      include: { supplier: true },
    });

    notifyAdmin(order, 'Approved');
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function rejectPurchaseOrder(req, res, next) {
  try {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, supplierId: req.supplier.id },
    });
    if (!existing) return res.status(404).json({ message: 'Purchase order not found' });
    if (existing.status !== 'Pending') {
      return res.status(400).json({ message: `This order is already ${existing.status.toLowerCase()}` });
    }
    const order = await prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: 'Rejected', respondedAt: new Date() },
      include: { supplier: true },
    });
    notifyAdmin(order, 'Rejected');
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyPurchaseOrders, listPendingIds, approvePurchaseOrder, rejectPurchaseOrder };
