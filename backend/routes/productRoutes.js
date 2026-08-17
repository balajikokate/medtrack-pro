const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStock,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/low-stock', getLowStock);
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);

module.exports = router;
