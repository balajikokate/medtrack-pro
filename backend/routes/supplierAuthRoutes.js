const express = require('express');
const { supplierLogin, supplierMe } = require('../controllers/supplierAuthController');
const { protectSupplier } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginLimiter, supplierLogin);
router.get('/me', protectSupplier, supplierMe);

module.exports = router;
