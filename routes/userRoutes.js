const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');
const linkController = require('../controllers/linkController');
const withdrawalController = require('../controllers/withdrawalController');

router.use(isAuthenticated);

router.get('/dashboard', userController.getDashboard);

router.get('/links', (req, res) => res.render('user/links', { title: 'Manage Links' })); // Links view logic to be added
router.post('/links/create', linkController.createLink);

router.get('/settings', userController.getSettings);
router.post('/settings/update', userController.updateProfile);
// Existing routes ke niche ye line add karein:
router.post('/settings/security', userController.updateSecurity);


router.get('/withdrawals', withdrawalController.getWithdrawals);
router.post('/withdrawals/request', withdrawalController.requestWithdrawal);

module.exports = router;
