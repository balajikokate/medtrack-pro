const prisma = require('../config/prisma');

// Recomputes a Product's cached quantity/expiryDate/batchNo from its real batches.
// Call this after any batch is created, adjusted, or depleted — never write those
// three Product fields directly anywhere else.
async function syncProductAggregate(tx, productId) {
  const db = tx || prisma;
  const batches = await db.productBatch.findMany({
    where: { productId, quantity: { gt: 0 } },
    orderBy: { expiryDate: 'asc' },
  });

  const quantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  const soonest = batches[0]; // FEFO: nearest-expiring active batch drives status/urgency

  return db.product.update({
    where: { id: productId },
    data: {
      quantity,
      expiryDate: soonest ? soonest.expiryDate : null,
      batchNo: soonest ? soonest.batchNo : null,
    },
  });
}

// Deducts `quantity` units from a product's batches oldest-expiry-first (FEFO),
// spanning multiple batches if one isn't enough. Throws if total stock is short.
async function deductFEFO(tx, productId, quantity) {
  const batches = await tx.productBatch.findMany({
    where: { productId, quantity: { gt: 0 } },
    orderBy: { expiryDate: 'asc' },
  });

  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    await tx.productBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: take } } });
    remaining -= take;
  }
  if (remaining > 0) {
    throw new Error('Insufficient stock across batches');
  }
  await syncProductAggregate(tx, productId);
}

module.exports = { syncProductAggregate, deductFEFO };
