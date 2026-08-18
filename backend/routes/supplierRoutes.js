const express = require('express');
const {
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
} = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/stats', getStats);
router.get('/purchase-orders/recent-responses', getRecentResponses);
router.post('/purchase-orders', createPurchaseOrder);
router.post('/purchase-orders/:id/reassign', reassignPurchaseOrder);
router.post('/purchase-orders/:id/receive', receiveDelivery);
router.route('/').get(getSuppliers).post(createSupplier);
router.route('/:id').get(getSupplier).put(updateSupplier).delete(deleteSupplier);

module.exports = router;
