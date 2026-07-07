const express = require('express');
const router = express.Router();

// 1. Controller import karein
const authController = require('../controllers/authController');

// 2. Captcha verification hata di gayi hai
router.post('/register', authController.register);
router.post('/login', authController.login);

// Baaki auth routes (inme captcha ki zaroorat nahi hai)
router.get('/logout', authController.logout);

// Forgot Password / Reset Password (jo humne SMTP wale part me add kiye the)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
