const express = require('express');
const router = express.Router();

// Middlewares & Controllers
const { isAuthenticated } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');
const linkController = require('../controllers/linkController');
const withdrawalController = require('../controllers/withdrawalController');

// 🛑 Protect all routes below (User must be logged in)
router.use(isAuthenticated);

// ==========================
// 1. DASHBOARD & REFERRALS
// ==========================
router.get('/dashboard', userController.getDashboard);
router.get('/referrals', userController.getReferrals); // NAYA ADD KIYA HAI

// ==========================
// 2. LINKS MANAGEMENT
// ==========================
router.get('/links', userController.getLinks);
router.post('/links/create', linkController.createLink);

// ==========================
// 3. TOOLS & API
// ==========================
router.get('/tools', userController.getTools);
router.post('/links/mass', userController.massShrink);
router.get('/quick-link', userController.getQuickLink);
router.get('/api', userController.getApiDocs);

// ==========================
// 4. ANNOUNCEMENTS
// ==========================
router.get('/announcements', userController.getAnnouncements);

// ==========================
// 5. WITHDRAWALS (Fixed Duplicates)
// ==========================
router.get('/withdrawals', withdrawalController.getWithdrawals);
router.post('/withdrawals/request', withdrawalController.requestWithdrawal);

// ==========================
// 6. SETTINGS & PROFILE
// ==========================
router.get('/settings', userController.getSettings);
router.post('/settings/update', userController.updateProfile);
router.post('/settings/security', userController.updateSecurity);

module.exports = router;