function getProductStatus(product) {
  if (product.expiryDate && new Date(product.expiryDate).getTime() < Date.now()) return 'Expired';
  if (product.quantity <= product.minLevel * 0.3) return 'Critical Low';
  if (product.quantity <= product.minLevel) return 'Low Stock';
  return 'In Stock';
}

function withStatus(product) {
  return { ...product, status: getProductStatus(product) };
}

module.exports = { getProductStatus, withStatus };
