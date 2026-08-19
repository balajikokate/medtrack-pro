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
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const manage = authorize('admin', 'pharmacist');

router.use(protect);
router.get('/stats', getStats);
router.get('/purchase-orders/recent-responses', getRecentResponses);
router.post('/purchase-orders', manage, createPurchaseOrder);
router.post('/purchase-orders/:id/reassign', manage, reassignPurchaseOrder);
router.post('/purchase-orders/:id/receive', manage, receiveDelivery);
router.route('/').get(getSuppliers).post(manage, createSupplier);
router.route('/:id').get(getSupplier).put(manage, updateSupplier).delete(authorize('admin'), deleteSupplier);

module.exports = router;
