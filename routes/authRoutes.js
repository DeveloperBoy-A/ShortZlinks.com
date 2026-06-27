const express = require('express');
const router = express.Router();

// 1. Controller aur Middleware ko import karein
const authController = require('../controllers/authController');
const { verifyCaptcha } = require('../middlewares/captchaMiddleware');

// 2. POST routes ke beech mein 'verifyCaptcha' attach karein
router.post('/register', verifyCaptcha, authController.register);
router.post('/login', verifyCaptcha, authController.login);

// Baaki auth routes (inme captcha ki zaroorat nahi hai)
router.get('/logout', authController.logout);

// Forgot Password / Reset Password (jo humne SMTP wale part me add kiye the)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
