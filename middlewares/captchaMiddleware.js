const fetch = require('node-fetch');

exports.verifyCaptcha = async (req, res, next) => {
    // Dev environment bypass
    if (process.env.NODE_ENV !== 'production') return next();

    const token = req.body['cf-turnstile-response'] || req.body['g-recaptcha-response'];
    
    if (!token) {
        return res.status(400).send('Captcha validation failed. Please solve the captcha.');
    }

    try {
        // Example using Cloudflare Turnstile (Fastest & best for Shorteners)
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            next();
        } else {
            res.status(400).send('Captcha verification failed. Please try again.');
        }
    } catch (error) {
        console.error('Captcha Error:', error);
        res.status(500).send('Security check error.');
    }
};
