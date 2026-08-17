const express = require('express');
const {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getStats,
} = require('../controllers/staffController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/stats', getStats);
router.route('/').get(getStaff).post(createStaff);
router.route('/:id').put(updateStaff).delete(deleteStaff);

module.exports = router;
