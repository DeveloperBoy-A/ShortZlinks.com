const express = require('express');
const router = express.Router();
const linkController = require('../controllers/linkController');
const { vpnProxyBlocker, clickFrequencyLimiter } = require('../middlewares/securityMiddleware');

// Step Pages & Final Destination API
router.get('/step/:step', linkController.renderAdStep);
router.post('/step/process', linkController.processStep); // AJAX endpoint for countdown completion
router.get('/final', linkController.renderFinal);

// Initial Link Click (Catches the short alias)
router.get('/:alias', vpnProxyBlocker, clickFrequencyLimiter, linkController.handleInitialClick);

module.exports = router;
