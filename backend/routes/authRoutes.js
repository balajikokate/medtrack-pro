const express = require('express');
const { register, login, me, verifyPassword, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', protect, authorize('admin'), register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, me);
router.post('/verify-password', protect, verifyPassword);
router.put('/change-password', protect, changePassword);

module.exports = router;
