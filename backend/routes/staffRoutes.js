const express = require('express');
const {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getStats,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/stats', getStats);
router.get('/', getStaff);
router.post('/', authorize('admin'), createStaff);
router.route('/:id').put(authorize('admin', 'pharmacist'), updateStaff).delete(authorize('admin'), deleteStaff);

module.exports = router;
