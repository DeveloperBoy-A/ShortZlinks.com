const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(isAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);
// NOTE: settings.ejs ka CPM form is route pe post karta hai (pehle yeh route missing tha => 404 aata tha)
router.post('/settings/update-cpm', adminController.updateSettings);
router.post('/settings/payment-methods', adminController.addPaymentMethod);
router.post('/settings/payment-methods/:id/toggle', adminController.togglePaymentMethod);
router.post('/settings/payment-methods/:id/delete', adminController.deletePaymentMethod);

router.get('/withdrawals', adminController.getWithdrawals);
router.post('/withdrawals/:id', adminController.updateWithdrawalStatus);
// User Management Routes
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);

router.post('/settings/domain', adminController.addDomain);

// DMCA & Platform Links (linked from sidebar, previously had no route)
router.get('/dmca', adminController.getDmcaReports);
router.get('/links', adminController.getAllLinks);

module.exports = router;