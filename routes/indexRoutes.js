const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    }
    res.render('index', { title: 'Welcome to ' + res.locals.siteName });
});

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { title: 'Login or Register' });
});

// Apni indexRoutes.js file mein ye routes add kar lein
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password' });
});

router.get('/auth/reset-password/:token', (req, res) => {
    res.render('reset-password', { title: 'Set New Password', token: req.params.token });
});

module.exports = router;
router.get('/api', apiController.shortenViaApi);
