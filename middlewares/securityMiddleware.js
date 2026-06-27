const fetch = require('node-fetch');
const Click = require('../models/Click');

// 1. VPN / Datacenter IP Blocker
exports.vpnProxyBlocker = async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Skip checking localhost during dev
    if (ip === '::1' || ip === '127.0.0.1') return next();

    try {
        // Using Proxycheck.io API (Can be swapped with any API)
        const apiKey = process.env.PROXYCHECK_API_KEY;
        const response = await fetch(`http://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1`);
        const data = await response.json();

        if (data[ip] && data[ip].proxy === 'yes') {
            return res.status(403).send(`
                <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h1>Access Denied</h1>
                    <p>VPNs, Proxies, and Datacenter IPs are strictly prohibited to ensure advertiser quality.</p>
                </div>
            `);
        }
        next();
    } catch (error) {
        // Fail open if API is down to prevent blocking legitimate traffic
        console.error('VPN API Error:', error);
        next();
    }
};

// 2. Click Frequency Limiter (1 valid click per IP per 24 hours per link)
exports.clickFrequencyLimiter = async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const { alias } = req.params;

    // Attach IP to request for downstream controllers
    req.clientIp = ip;
    
    try {
        const Link = require('../models/Link');
        const link = await Link.findOne({ alias });
        
        if (!link) {
            return res.status(404).render('404');
        }

        // Check for clicks from this IP on this Link in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const recentClick = await Click.findOne({
            ipAddress: ip,
            linkId: link._id,
            createdAt: { $gte: twentyFourHoursAgo }
        });

        // Pass flags down. If invalid, the flow continues but earnings = 0.
        req.linkData = link;
        req.isDuplicateClick = !!recentClick; 
        next();

    } catch (error) {
        console.error('Click Limiter Error:', error);
        res.status(500).send('Internal Server Error');
    }
};
