const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

exports.register = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        if (!username || username.trim() === '') {
            return res.status(400).send('Username is required');
        }

        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            if (existingUser.email === email) return res.status(400).send('Email already in use');
            return res.status(400).send('Username already taken');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Auto-assign admin if it matches the env email
        const normalizedEmail = email.trim().toLowerCase();
const role =
    normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase()
        ? 'admin'
        : 'user';

        // Capture referral (?ref=<userId>) if present and valid
        let referredBy = null;
        const refId = req.body.ref;
        if (refId && mongoose.Types.ObjectId.isValid(refId)) {
            const referrer = await User.findById(refId);
            if (referrer) referredBy = referrer._id;
        }

        const newUser = new User({
            username: username.trim(),
            email: normalizedEmail,
isActive: true,
            password: hashedPassword,
            role,
            referredBy
        });

        await newUser.save();
        
        req.session.user = { id: newUser._id, role: newUser.role, email: newUser.email, username: newUser.username };
        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.login = async (req, res) => {
    try {
        const { identifier, email, password } = req.body;

        const loginId = (identifier || email || "").trim();
        const normalizedLogin = loginId.toLowerCase();

        console.log("Login ID:", normalizedLogin);

        const user = await User.findOne({
            $or: [
                { email: normalizedLogin },
                { username: loginId }
            ]
        });

        console.log("User:", user);

        if (!user) {
            return res.status(401).send("User Not Found");
        }

        if (user.isActive === false) {
            return res.status(403).send("Account Disabled");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        console.log("Password Match:", isMatch);

        if (!isMatch) {
            return res.status(401).send("Password Wrong");
        }

        req.session.user = {
            id: user._id,
            role: user.role,
            email: user.email,
            username: user.username
        };

        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.status(500).send("Session Error");
            }

            if (user.role === "admin") {
                return res.redirect("/admin/dashboard");
            }

            return res.redirect("/user/dashboard");
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send("Internal Server Error");
    }
};


exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout Error:', err);
        res.redirect('/login');
    });
};

const crypto = require('crypto');
const { sendEmail } = require('../config/mailer');

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).send('If the email exists, a reset link has been sent.'); // Security practice
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 Minutes valid
        
        await user.save();

        // Send Email
        const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
        const message = `
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to reset it:</p>
            <a href="${resetUrl}" style="padding:10px 20px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:5px;">Reset Password</a>
            <p>This link expires in 15 minutes.</p>
        `;

        await sendEmail(user.email, 'Password Reset', message);
        res.send('Password reset link sent to your email.');

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).send('Error processing request.');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send('Invalid or expired token.');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        await user.save();
        res.redirect('/login?success=password_reset');

    } catch (error) {
        res.status(500).send('Error resetting password');
    }
};
    