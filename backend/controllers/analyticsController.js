const prisma = require('../config/prisma');

async function getAnalytics(req, res, next) {
  try {
    const sales = await prisma.sale.findMany({ include: { items: true } });
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const scriptsFilled = sales.filter((s) => s.prescriptionId).length;
    const avgTransaction = sales.length ? totalRevenue / sales.length : 0;

    const monthlyRevenue = Array(12).fill(0);
    sales.forEach((s) => {
      monthlyRevenue[new Date(s.createdAt).getMonth()] += s.total;
    });

    const products = await prisma.product.findMany();
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const categoryTotals = {};
    const medStats = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const product = productMap[item.productId];
        const cat = product ? product.category : 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.price * item.quantity;

        if (!medStats[item.name]) medStats[item.name] = { unitsSold: 0, revenue: 0 };
        medStats[item.name].unitsSold += item.quantity;
        medStats[item.name].revenue += item.price * item.quantity;
      }
    }

    const topMedications = Object.entries(medStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
    const stockTurnover = totalUnits ? Number((sales.length / totalUnits).toFixed(2)) : 0;

    res.json({
      totalRevenue,
      scriptsFilled,
      avgTransaction: Number(avgTransaction.toFixed(2)),
      stockTurnover,
      monthlyRevenue,
      categoryBreakdown: categoryTotals,
      topMedications,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnalytics };
