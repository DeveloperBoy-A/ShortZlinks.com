const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');
const linkController = require('../controllers/linkController');
const withdrawalController = require('../controllers/withdrawalController');

router.use(isAuthenticated);

router.get('/dashboard', userController.getDashboard);

router.get('/announcements', userController.getAnnouncements);
router.get('/quick-link', userController.getQuickLink);
router.get('/api', userController.getApiDocs);


// Updated Links Routes
router.get('/links', userController.getLinks);
router.post('/links/create', linkController.createLink);

// New Tools & Mass Shrink Routes
router.get('/tools', userController.getTools);
router.post('/links/mass', userController.massShrink);

router.get('/settings', userController.getSettings);
router.post('/settings/update', userController.updateProfile);
router.post('/settings/security', userController.updateSecurity);

router.get('/withdrawals', withdrawalController.getWithdrawals);
router.post('/withdrawals/request', withdrawalController.requestWithdrawal);

module.exports = router;
