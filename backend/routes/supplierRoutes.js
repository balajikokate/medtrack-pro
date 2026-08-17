const express = require('express');
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  getStats,
} = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/stats', getStats);
router.post('/purchase-orders', createPurchaseOrder);
router.route('/').get(getSuppliers).post(createSupplier);
router.route('/:id').get(getSupplier).put(updateSupplier).delete(deleteSupplier);

module.exports = router;
