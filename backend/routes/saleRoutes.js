const express = require('express');
const { getSales, getRecentSales, createSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/recent', getRecentSales);
router.route('/').get(getSales).post(createSale);

module.exports = router;
