const prisma = require('../config/prisma');
const { withStatus, getProductStatus } = require('../utils/productStatus');

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
    const { supplierId, expiryDate, ...rest } = req.body;
    const product = await prisma.product.create({
      data: { ...rest, expiryDate: new Date(expiryDate), supplierId: supplierId || undefined },
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.status(201).json(withStatus(product));
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { supplierId, expiryDate, ...rest } = req.body;
    const data = { ...rest };
    if (expiryDate) data.expiryDate = new Date(expiryDate);
    if (supplierId !== undefined) data.supplierId = supplierId || null;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.json(withStatus(product));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Product not found' });
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
};
