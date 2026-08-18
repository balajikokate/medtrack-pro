const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sendPOCreatedEmail, sendPOReassignedEmail } = require('../utils/email');
const { syncProductAggregate } = require('../utils/batchSync');

function sanitize(supplier) {
  if (!supplier) return supplier;
  const { password, ...rest } = supplier;
  return { ...rest, hasPortalAccess: !!password };
}

async function getSuppliers(req, res, next) {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers.map(sanitize));
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
    const ordersWithFlags = orders.map((o) => ({
      ...o,
      reassignmentAvailable: o.status === 'Pending' && o.reminderCount >= 2,
    }));
    res.json({ ...sanitize(supplier), orders: ordersWithFlags });
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(sanitize(supplier));
  } catch (err) {
    next(err);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(sanitize(supplier));
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
    const { supplierId, lineItems, neededByDate } = req.body;
    if (!supplierId || !neededByDate) {
      return res.status(400).json({ message: 'supplierId and neededByDate are required' });
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ message: 'At least one medicine line item is required' });
    }
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // Look up each product server-side — never trust client-supplied price/name,
    // and this is what lets an approval later credit the exact right inventory row.
    const productIds = lineItems.map((li) => li.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const lines = [];
    let amount = 0;
    for (const li of lineItems) {
      const product = productMap.get(li.productId);
      const quantity = Math.max(1, Number(li.quantity) || 0);
      if (!product) return res.status(400).json({ message: `Product ${li.productId} not found` });
      lines.push({ productId: product.id, name: product.name, quantity, price: product.price });
      amount += product.price * quantity;
    }

    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const order = await prisma.purchaseOrder.create({
      data: { poNumber, supplierId, items: { lines }, amount, neededByDate: new Date(neededByDate) },
    });

    sendPOCreatedEmail(supplier, order).catch((err) => console.error('[email] PO created email failed:', err));

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function reassignPurchaseOrder(req, res, next) {
  try {
    const { newSupplierId } = req.body;
    if (!newSupplierId) return res.status(400).json({ message: 'newSupplierId is required' });

    const original = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ message: 'Purchase order not found' });
    if (original.status !== 'Pending') {
      return res.status(400).json({ message: `Cannot reassign a ${original.status.toLowerCase()} order` });
    }
    if (original.reminderCount < 2) {
      return res.status(400).json({
        message: 'This order is not yet eligible for reassignment — the supplier has not been reminded twice.',
      });
    }
    const newSupplier = await prisma.supplier.findUnique({ where: { id: newSupplierId } });
    if (!newSupplier) return res.status(404).json({ message: 'New supplier not found' });

    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const [, newOrder] = await prisma.$transaction(
      [
        prisma.purchaseOrder.update({ where: { id: original.id }, data: { status: 'Reassigned' } }),
        prisma.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: newSupplierId,
            amount: original.amount,
            items: original.items,
            neededByDate: original.neededByDate,
            reassignedFromId: original.id,
          },
        }),
      ],
      { timeout: 15000, maxWait: 10000 }
    );

    sendPOReassignedEmail(newSupplier, newOrder).catch((err) =>
      console.error('[email] PO reassigned email failed:', err)
    );

    res.status(201).json(newOrder);
  } catch (err) {
    next(err);
  }
}

async function receiveDelivery(req, res, next) {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    if (po.status !== 'Approved') {
      return res.status(400).json({ message: `Cannot receive a ${po.status.toLowerCase()} order` });
    }

    const lines = Array.isArray(po.items?.lines) ? po.items.lines : [];

    const order = await prisma.$transaction(
      async (tx) => {
        for (const line of lines) {
          if (!line.fulfilledQuantity || line.fulfilledQuantity <= 0) continue;
          // Only now — when the goods are actually confirmed on your shelf — does a
          // real batch get created and the medicine's stock go up.
          try {
            await tx.productBatch.create({
              data: {
                productId: line.productId,
                batchNo: `${po.poNumber}-${line.productId.slice(-4).toUpperCase()}`,
                quantity: line.fulfilledQuantity,
                expiryDate: new Date(line.batchExpiryDate),
                source: 'purchase-order',
              },
            });
            await syncProductAggregate(tx, line.productId);
          } catch {
            // product no longer exists — skip silently, don't fail the whole receipt
          }
        }
        return tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'Delivered', deliveredAt: new Date() },
        });
      },
      { timeout: 20000, maxWait: 10000 }
    );

    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function getRecentResponses(req, res, next) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const orders = await prisma.purchaseOrder.findMany({
      where: { status: { in: ['Approved', 'Rejected'] }, respondedAt: { gte: sevenDaysAgo } },
      include: { supplier: { select: { name: true } } },
      orderBy: { respondedAt: 'desc' },
      take: 10,
    });
    res.json(orders);
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
  reassignPurchaseOrder,
  receiveDelivery,
  getRecentResponses,
  getStats,
};
