const express = require('express');
const { supplierLogin, supplierMe } = require('../controllers/supplierAuthController');
const { protectSupplier } = require('../middleware/auth');

const router = express.Router();

router.post('/login', supplierLogin);
router.get('/me', protectSupplier, supplierMe);

module.exports = router;
