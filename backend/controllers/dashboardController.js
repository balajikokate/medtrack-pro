const prisma = require('../config/prisma');
const { withStatus } = require('../utils/productStatus');

async function getOverview(req, res, next) {
  try {
    const products = (await prisma.product.findMany()).map(withStatus);
    const totalStockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const lowStockCount = products.filter((p) => ['Low Stock', 'Critical Low'].includes(p.status)).length;

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const expiringProducts = products.filter(
      (p) => new Date(p.expiryDate) <= in30Days && new Date(p.expiryDate) >= new Date()
    );
    const expiringSoon = expiringProducts.length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaysSales = await prisma.sale.findMany({ where: { createdAt: { gte: startOfToday } } });
    const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.total, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const weekSales = await prisma.sale.findMany({ where: { createdAt: { gte: sevenDaysAgo } } });

    const trend = [0, 0, 0, 0, 0, 0, 0];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekSales.forEach((sale) => {
      const dayIdx = new Date(sale.createdAt).getDay();
      trend[dayIdx] += sale.total;
    });

    const restockList = products
      .filter((p) => ['Low Stock', 'Critical Low'].includes(p.status))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10);

    const expiringList = expiringProducts
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
      .slice(0, 10);

    const recentTransactions = await prisma.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      totalStockValue,
      lowStockCount,
      expiringSoon,
      todaysRevenue,
      trend: { labels: dayLabels, data: trend },
      restockList,
      expiringList,
      recentTransactions,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
