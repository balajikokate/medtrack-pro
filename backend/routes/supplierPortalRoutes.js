const express = require('express');
const {
  listMyPurchaseOrders,
  listPendingIds,
  approvePurchaseOrder,
  rejectPurchaseOrder,
} = require('../controllers/supplierPortalController');
const { protectSupplier } = require('../middleware/auth');

const router = express.Router();

router.use(protectSupplier);
router.get('/purchase-orders/pending-ids', listPendingIds);
router.get('/purchase-orders', listMyPurchaseOrders);
router.put('/purchase-orders/:id/approve', approvePurchaseOrder);
router.put('/purchase-orders/:id/reject', rejectPurchaseOrder);

module.exports = router;
