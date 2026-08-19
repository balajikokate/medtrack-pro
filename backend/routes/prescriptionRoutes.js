const express = require('express');
const {
  getPrescriptions,
  createPrescription,
  verifyPrescription,
  updatePrescription,
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const clinical = authorize('admin', 'pharmacist');

router.use(protect);
router.route('/').get(getPrescriptions).post(createPrescription);
router.put('/:id/verify', clinical, verifyPrescription);
router.put('/:id', clinical, updatePrescription);

module.exports = router;
