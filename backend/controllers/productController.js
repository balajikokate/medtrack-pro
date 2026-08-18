const prisma = require('../config/prisma');
const { withStatus, getProductStatus } = require('../utils/productStatus');
const { syncProductAggregate } = require('../utils/batchSync');

async function getProducts(req, res, next) {
  try {
    const { search, category, status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ndc: { contains: search, mode: 'insensitive' } },
        { batchNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    let products = (
      await prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { supplier: { select: { id: true, name: true } } },
      })
    ).map(withStatus);

    if (status) {
      products = products.filter((p) => p.status.toLowerCase().replace(' ', '_') === status);
    }

    const total = products.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = products.slice(start, start + Number(limit));

    res.json({ data: paginated, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(withStatus(product));
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { supplierId, expiryDate, quantity, batchNo, ...rest } = req.body;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...rest, supplierId: supplierId || undefined },
      });
      const qty = Number(quantity) || 0;
      if (qty > 0 && expiryDate) {
        await tx.productBatch.create({
          data: {
            productId: created.id,
            batchNo: batchNo || `INIT-${created.id.slice(-6).toUpperCase()}`,
            quantity: qty,
            expiryDate: new Date(expiryDate),
            source: 'manual',
          },
        });
      }
      await syncProductAggregate(tx, created.id);
      return tx.product.findUnique({
        where: { id: created.id },
        include: { supplier: { select: { id: true, name: true } } },
      });
    }, { timeout: 15000, maxWait: 10000 });

    res.status(201).json(withStatus(product));
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { supplierId, expiryDate, quantity, batchNo, ...rest } = req.body;
    const stockFieldsTouched = expiryDate !== undefined || quantity !== undefined || batchNo !== undefined;

    const product = await prisma.$transaction(async (tx) => {
      const data = { ...rest };
      if (supplierId !== undefined) data.supplierId = supplierId || null;
      await tx.product.update({ where: { id: req.params.id }, data });

      if (stockFieldsTouched) {
        // A manual edit to quantity/expiry/batch is a correction, not a new delivery —
        // it replaces whatever batches exist with a single snapshot batch. Real
        // multi-batch tracking accrues from approved purchase orders, not manual edits.
        await tx.productBatch.deleteMany({ where: { productId: req.params.id } });
        const qty = Number(quantity) || 0;
        if (qty > 0 && expiryDate) {
          await tx.productBatch.create({
            data: {
              productId: req.params.id,
              batchNo: batchNo || `MAN-${req.params.id.slice(-6).toUpperCase()}`,
              quantity: qty,
              expiryDate: new Date(expiryDate),
              source: 'manual',
            },
          });
        }
        await syncProductAggregate(tx, req.params.id);
      }

      return tx.product.findUnique({
        where: { id: req.params.id },
        include: { supplier: { select: { id: true, name: true } } },
      });
    }, { timeout: 15000, maxWait: 10000 });

    res.json(withStatus(product));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Product not found' });
    next(err);
  }
}

async function getProductBatches(req, res, next) {
  try {
    const batches = await prisma.productBatch.findMany({
      where: { productId: req.params.id },
      orderBy: { expiryDate: 'asc' },
    });
    res.json(batches);
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Product not found' });
    next(err);
  }
}

async function getLowStock(req, res, next) {
  try {
    const products = (await prisma.product.findMany()).map(withStatus);
    res.json(products.filter((p) => ['Low Stock', 'Critical Low'].includes(p.status)));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStock,
  getProductBatches,
};
