const Link = require('../models/Link');
const Click = require('../models/Click');
const Setting = require('../models/Setting');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');

// 1. User Dashboard: Create Link
exports.createLink = async (req, res) => {
    try {
        const { originalUrl } = req.body;
        const newLink = await Link.create({
            userId: req.session.user.id,
            originalUrl
        });
        res.redirect('/user/links');
    } catch (error) {
        console.error('Create Link Error:', error);
        res.status(500).send('Error creating link');
    }
};

// 2. Public: Initial Click & Redirect to Step 1
exports.handleInitialClick = async (req, res) => {
    const link = req.linkData; // Attached by clickFrequencyLimiter middleware
    const isDuplicate = req.isDuplicateClick;
    const ip = req.clientIp;
    const geo = geoip.lookup(ip);
    const country = geo ? geo.country : 'Unknown';

    const settings = await Setting.findOne();
    const totalSteps = settings.adSteps;

    // Create a JWT to track this specific click session statelessly
    const payload = {
        linkId: link._id,
        originalUrl: link.originalUrl,
        isValid: !isDuplicate, 
        ip,
        country,
        userAgent: req.headers['user-agent'],
        totalSteps,
        currentStep: 1
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.redirect(`/l/step/1?t=${token}`);
};

// 3. Public: Render Intermediate Ad Step Page (UPDATED FOR RANDOM THEMES)
exports.renderAdStep = (req, res) => {
    const stepNum = parseInt(req.params.step);
    const token = req.query.t;

    if (!token) return res.status(403).send('Invalid Flow');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.currentStep !== stepNum || stepNum > decoded.totalSteps) {
            return res.status(403).send('Link tampering detected');
        }

        // Random Theme Selection Logic (1, 2, or 3)
        const themes = ['step-theme-1', 'step-theme-2', 'step-theme-3'];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];

        res.render(`redirection/${randomTheme}`, { 
            step: stepNum, 
            totalSteps: decoded.totalSteps, 
            token 
        });
    } catch (error) {
        res.status(403).send('Session expired. Please click the original link again.');
    }
};


// 4. Public API: Process countdown completion via AJAX POST
exports.processStep = async (req, res) => {
    const token = req.body.t;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { linkId, originalUrl, isValid, ip, country, userAgent, totalSteps, currentStep } = decoded;

        if (currentStep < totalSteps) {
            // Move to next step
            decoded.currentStep += 1;
            const newToken = jwt.sign(decoded, process.env.JWT_SECRET, { expiresIn: '15m' });
            return res.json({ nextUrl: `/l/step/${decoded.currentStep}?t=${newToken}` });
        } else {
            // Final Step Reached: Process Earnings Math
            if (isValid) {
                const settings = await Setting.findOne();
                const link = await Link.findById(linkId);
                
                // Calculate Revenue Split
                const clickValue = settings.baseCpm / 1000;
                const adminCut = clickValue * (settings.adminCommissionPercent / 100);
                const userCut = clickValue - adminCut;

                // Record Click
                await Click.create({
                    linkId,
                    userId: link.userId,
                    ipAddress: ip,
                    country,
                    userAgent,
                    isValid: true,
                    earningsGenerated: userCut,
                    adminCommission: adminCut
                });

                // Update Link Stats
                link.totalClicks += 1;
                link.validEarnings += userCut;
                await link.save();

                // Update User Wallet
await User.findByIdAndUpdate(link.userId, {
    $inc: { walletBalance: userCut, lifetimeEarnings: userCut }
});

// NEW: Referral Bonus Logic
const linkOwner = await User.findById(link.userId);
if (linkOwner.referredBy) {
    const referralBonus = userCut * (process.env.REFERRAL_PERCENT / 100);
    await User.findByIdAndUpdate(linkOwner.referredBy, {
        $inc: { walletBalance: referralBonus, referralEarnings: referralBonus }
    });
            } else {
                // Duplicate/Invalid click: Still record it for analytics but 0 earnings
                const link = await Link.findById(linkId);
                await Click.create({
                    linkId,
                    userId: link.userId,
                    ipAddress: ip,
                    country,
                    userAgent,
                    isValid: false,
                    earningsGenerated: 0,
                    adminCommission: 0
                });
                link.totalClicks += 1;
                await link.save();
            }

            // Generate Final Token to unlock destination
            const finalToken = jwt.sign({ originalUrl }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.json({ nextUrl: `/l/final?t=${finalToken}` });
        }
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired session' });
    }
};

// 5. Public: Render Final Redirection Page
exports.renderFinal = (req, res) => {
    const token = req.query.t;
    if (!token) return res.status(403).send('Invalid Access');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.render('redirection/final', { destination: decoded.originalUrl });
    } catch (error) {
        res.status(403).send('Link Expired');
    }
};
  
