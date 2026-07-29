const express = require('express');
const router = express.Router();
const apiController = require("../controllers/apiController");
const pageController = require("../controllers/pageController");
const Report = require("../models/Report");
const User = require("../models/User");
const Link = require("../models/Link");
const Withdrawal = require("../models/Withdrawal");

router.get('/', async (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    }

    // Real, live numbers for the "Numbers Speak Everything" homepage stats section.
    // Wrapped in try/catch + sane fallbacks so a DB hiccup never breaks the homepage.
    let stats = { totalClicks: 0, totalUrls: 0, registeredUsers: 0, totalWithdrawals: 0 };
    try {
        const [clicksAgg, totalUrls, registeredUsers, withdrawalsAgg] = await Promise.all([
            Link.aggregate([{ $group: { _id: null, sum: { $sum: '$totalClicks' } } }]),
            Link.countDocuments(),
            User.countDocuments(),
            Withdrawal.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, sum: { $sum: '$amount' } } }
            ])
        ]);
        stats.totalClicks = (clicksAgg[0] && clicksAgg[0].sum) || 0;
        stats.totalUrls = totalUrls || 0;
        stats.registeredUsers = registeredUsers || 0;
        stats.totalWithdrawals = (withdrawalsAgg[0] && withdrawalsAgg[0].sum) || 0;
    } catch (err) {
        console.error('Homepage stats error:', err);
    }

    res.render('index', { title: 'Welcome to ' + res.locals.siteName, stats });
});

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { title: 'Login or Register', ref: req.query.ref || '' });
});

// Apni indexRoutes.js file mein ye routes add kar lein
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password' });
});

router.get('/auth/reset-password/:token', (req, res) => {
    res.render('reset-password', { title: 'Set New Password', token: req.params.token });
});

router.get('/dmca', (req, res) => res.render('dmca'));

// Handles the "Report Abuse / DMCA" form submission (views/dmca.ejs)
router.post('/report-abuse', async (req, res) => {
    try {
        const { reportedUrl, email, reason, message } = req.body;
        if (!reportedUrl || !email || !reason || !message) {
            return res.status(400).send('All fields are required.');
        }
        await Report.create({ reportedUrl, email, reason, message });
        res.send('Thank you. Your report has been submitted and will be reviewed within 24 hours.');
    } catch (error) {
        console.error('Report Abuse Error:', error);
        res.status(500).send('Error submitting report.');
    }
});

router.get('/api', apiController.createLinkViaApi);

// Footer pages (previously linked but had no backend route -> 404s)
router.get('/payment-proofs', pageController.getPaymentProofs);
router.get('/privacy', pageController.getPrivacyPolicy);
router.get('/terms', pageController.getTerms);
router.get('/contact', pageController.getContact);
router.post('/subscribe', pageController.subscribeNewsletter);

module.exports = router;