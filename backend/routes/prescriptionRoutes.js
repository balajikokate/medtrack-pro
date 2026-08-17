const express = require('express');
const {
  getPrescriptions,
  createPrescription,
  verifyPrescription,
  updatePrescription,
} = require('../controllers/prescriptionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.route('/').get(getPrescriptions).post(createPrescription);
router.put('/:id/verify', verifyPrescription);
router.put('/:id', updatePrescription);

module.exports = router;
