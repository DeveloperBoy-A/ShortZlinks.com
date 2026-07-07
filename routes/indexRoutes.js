const express = require('express');
const router = express.Router();
const apiController = require("../controllers/apiController");
const Report = require("../models/Report");

router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    }
    res.render('index', { title: 'Welcome to ' + res.locals.siteName });
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

module.exports = router;