const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(isAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);
router.post('/settings/payment-methods', adminController.addPaymentMethod);

router.get('/withdrawals', adminController.getWithdrawals);
router.post('/withdrawals/:id', adminController.updateWithdrawalStatus);

module.exports = router;
