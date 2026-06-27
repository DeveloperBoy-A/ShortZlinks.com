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

module.exports = router;
router.get('/api', apiController.shortenViaApi);
