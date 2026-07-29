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
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const role = (adminEmail && normalizedEmail === adminEmail) ? 'admin' : 'user';

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

const LoginActivity = require('../models/LoginActivity');
const { verifyToken } = require('../utils/totp');

// Completes login by writing the session + an activity record, then redirects
function finalizeLogin(req, res, user, rememberMe) {
    req.session.user = {
        id: user._id,
        role: user.role,
        email: user.email,
        username: user.username
    };

    if (rememberMe) {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    }

    LoginActivity.create({
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
    }).catch((err) => console.error('LoginActivity log failed:', err));

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
}

exports.login = async (req, res) => {
    try {
        const { identifier, email, password, rememberMe } = req.body;

        const loginId = (identifier || email || "").trim();
        const normalizedLogin = loginId.toLowerCase();

        const user = await User.findOne({
            $or: [
                { email: normalizedLogin },
                { username: loginId }
            ]
        });

        if (!user) {
            return res.status(401).send("User Not Found");
        }

        if (user.isActive === false) {
            return res.status(403).send("Account Disabled");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            await LoginActivity.create({
                userId: user._id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                status: 'failed_password'
            }).catch(() => {});
            return res.status(401).send("Password Wrong");
        }

        // If 2FA is enabled on this account, don't log the user in yet —
        // stash a pending id in the session and send them to the OTP challenge.
        if (user.twoFactorEnabled) {
            req.session.pending2FA = { id: user._id.toString(), rememberMe: !!rememberMe };
            return req.session.save((err) => {
                if (err) {
                    console.error("Session Save Error:", err);
                    return res.status(500).send("Session Error");
                }
                res.redirect('/auth/2fa-challenge');
            });
        }

        finalizeLogin(req, res, user, !!rememberMe);

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Renders the "enter your authenticator code" page (shown after a correct
// email/password when the account has 2FA turned on).
exports.render2FAChallenge = (req, res) => {
    if (!req.session.pending2FA) return res.redirect('/login');
    res.render('2fa-challenge', { title: 'Two-Factor Verification' });
};

// Verifies the OTP code and, if correct, completes the login.
exports.verify2FAChallenge = async (req, res) => {
    try {
        if (!req.session.pending2FA) return res.redirect('/login');

        const user = await User.findById(req.session.pending2FA.id);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            req.session.pending2FA = null;
            return res.redirect('/login');
        }

        const { token } = req.body;
        const isValid = verifyToken(user.twoFactorSecret, token);

        if (!isValid) {
            await LoginActivity.create({
                userId: user._id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                status: 'failed_2fa'
            }).catch(() => {});
            return res.status(401).render('2fa-challenge', {
                title: 'Two-Factor Verification',
                error: 'Invalid or expired code. Please try again.'
            });
        }

        const rememberMe = !!req.session.pending2FA.rememberMe;
        req.session.pending2FA = null;
        finalizeLogin(req, res, user, rememberMe);

    } catch (error) {
        console.error('2FA Challenge Error:', error);
        res.status(500).send('Internal Server Error');
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

// ==========================================
// GOOGLE OAUTH LOGIN
// Manual Authorization Code flow (no extra npm package needed — uses the
// node-fetch dependency already present in this project).
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars to be set on
// Render. If they aren't set, the button gracefully sends the user back
// with a clear message instead of crashing.
// ==========================================
const fetch = require('node-fetch');

exports.googleLogin = (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.redirect('/login?error=google_not_configured');
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.googleOAuthState = state;

    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/auth/google/callback`;

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account'
    });

    req.session.save(() => {
        res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    });
};

exports.googleCallback = async (req, res) => {
    try {
        const { code, state, error: googleError } = req.query;

        if (googleError) {
            return res.redirect('/login?error=google_cancelled');
        }

        if (!code || !state || state !== req.session.googleOAuthState) {
            return res.redirect('/login?error=google_failed');
        }
        req.session.googleOAuthState = null;

        const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/auth/google/callback`;

        // Exchange the authorization code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('Google token exchange failed:', tokenData);
            return res.redirect('/login?error=google_failed');
        }

        // Fetch the user's Google profile
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await profileRes.json();

        if (!profile.email) {
            return res.redirect('/login?error=google_failed');
        }

        // Find or create the user
        let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email: profile.email.toLowerCase() }] });

        if (!user) {
            const baseUsername = (profile.email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '');
            let username = baseUsername;
            let suffix = 0;
            while (await User.findOne({ username })) {
                suffix += 1;
                username = `${baseUsername}${suffix}`;
            }

            const randomPassword = crypto.randomBytes(24).toString('hex');
            user = await User.create({
                username,
                email: profile.email.toLowerCase(),
                password: await bcrypt.hash(randomPassword, 10),
                googleId: profile.sub
            });
        } else if (!user.googleId) {
            user.googleId = profile.sub;
            await user.save();
        }

        if (user.isActive === false) {
            return res.status(403).send('Account Disabled');
        }

        finalizeLogin(req, res, user, false);

    } catch (error) {
        console.error('Google Callback Error:', error);
        res.redirect('/login?error=google_failed');
    }
};
    