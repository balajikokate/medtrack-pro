const express = require('express');
const { register, login, me, verifyPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.post('/verify-password', protect, verifyPassword);

module.exports = router;
