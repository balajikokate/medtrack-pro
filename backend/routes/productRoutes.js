const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStock,
  getProductBatches,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const manage = authorize('admin', 'pharmacist');

router.use(protect);
router.get('/low-stock', getLowStock);
router.route('/').get(getProducts).post(manage, createProduct);
router.route('/:id').get(getProduct).put(manage, updateProduct).delete(authorize('admin'), deleteProduct);
router.get('/:id/batches', getProductBatches);

module.exports = router;
