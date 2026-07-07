const Link = require('../models/Link');
const Click = require('../models/Click');
const Setting = require('../models/Setting');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');

// ==========================================
// 💸 EARNING ENGINE SETTINGS (ADMIN CONTROL)
// ==========================================
const PUBLISHER_SHARE = 0.80; // 80% Publisher ko milega, 20% Admin ka profit
const DEFAULT_CPM = 1.50;     // Agar country list me nahi hai toh ye CPM milega

// Har country ka total CPM (Jo Ad network aapko deta hai)
const COUNTRY_RATES = {
    'US': 12.00, // United States
    'GB': 10.00, // UK
    'CA': 8.00,  // Canada
    'AU': 8.00,  // Australia
    'DE': 7.00,  // Germany
    'FR': 7.00,  // France
    'AE': 6.00,  // UAE
    'IN': 5.00,  // India
    'BD': 3.00,  // Bangladesh
    'PK': 2.50,  // Pakistan
    'NP': 2.00,  // Nepal
    'NG': 2.00   // Nigeria
};

// 1. User Dashboard: Create Link
exports.createLink = async (req, res) => {
    try {
        const { originalUrl, domain } = req.body; // Extract domain

        // Fetch default domain if user didn't select one
        const settings = await Setting.findOne();
        const selectedDomain = domain || settings.defaultDomain;

        await Link.create({
            userId: req.session.user.id,
            originalUrl,
            domain: selectedDomain // Save selected domain
        });
        res.redirect('/user/dashboard?success=link_created');
    } catch (error) {
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
// 4. Public API: Process countdown completion
exports.processStep = async (req, res) => {
    const token = req.body.t;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { linkId, originalUrl, isValid, ip, country, userAgent, totalSteps, currentStep } = decoded;

        if (currentStep < totalSteps) {
            decoded.currentStep += 1;
            const newToken = jwt.sign(decoded, process.env.JWT_SECRET, { expiresIn: '15m' });
            return res.json({ nextUrl: `/l/step/${decoded.currentStep}?t=${newToken}` });
        } else {
            // Final Step Reached
            if (isValid) {
                const link = await Link.findById(linkId);
                const settings = await Setting.findOne(); // DB se live settings fetch karein

                // --- DYNAMIC ENGINE: DB SE VALUES UTHAYEIN ---
                // Agar DB mein countryRate hai toh wo, nahi toh global Default
                const countryRatesObj = settings.countryRates instanceof Map ? Object.fromEntries(settings.countryRates) : settings.countryRates;
                const actualCpm = (countryRatesObj && countryRatesObj[country]) ? countryRatesObj[country] : settings.baseCpm;

                // Admin Panel se percentage uthayein (e.g., 20)
                const adminPercent = settings.adminCommissionPercent || 20;
                
                const adminProfit = (actualCpm * adminPercent) / 100;
                const publisherCpm = actualCpm - adminProfit;

                const userCut = publisherCpm / 1000;
                const adminCut = adminProfit / 1000;

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

                // Update Link & User
                link.totalClicks += 1;
                link.validEarnings += userCut;
                await link.save();

                await User.findByIdAndUpdate(link.userId, {
                    $inc: { walletBalance: userCut, lifetimeEarnings: userCut }
                });

                // Referral Bonus Logic
                const linkOwner = await User.findById(link.userId);
                if (linkOwner.referredBy) {
                    const referralBonus = userCut * (process.env.REFERRAL_PERCENT / 100);
                    await User.findByIdAndUpdate(linkOwner.referredBy, {
                        $inc: { walletBalance: referralBonus, referralEarnings: referralBonus }
                    });
                }
            } else {
                // Invalid Click Logic
                const link = await Link.findById(linkId);
                await Click.create({ linkId, userId: link.userId, ipAddress: ip, country, userAgent, isValid: false, earningsGenerated: 0, adminCommission: 0 });
                link.totalClicks += 1;
                await link.save();
            }

            const finalToken = jwt.sign({ originalUrl }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.json({ nextUrl: `/l/final?t=${finalToken}` });
        }
    } catch (error) {
        console.error("Step Processing Error:", error);
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
