const User = require('../models/User');
const Link = require('../models/Link');
const Setting = require('../models/Setting');
const { nanoid } = require('nanoid');
const express = require("express");
const router = express.Router();



exports.createLinkViaApi = async (req, res) => {
    try {
        // format query parameter add kiya gaya hai
        const { api, url, alias, format } = req.query;

        if (!api) return res.status(400).json({ status: 'error', message: 'API token is required.' });
        if (!url) return res.status(400).json({ status: 'error', message: 'Destination URL is required.' });

        const user = await User.findOne({ apiToken: api });
        if (!user) return res.status(401).json({ status: 'error', message: 'Invalid API token.' });

        let finalAlias = alias || nanoid(6);
        if (alias) {
            const existingLink = await Link.findOne({ alias });
            if (existingLink) {
                // Agar format text hai aur error aaye, toh kuch return nahi karna (as per screenshot specs)
                if(format === 'text') return res.send(''); 
                return res.status(400).json({ status: 'error', message: 'This custom alias is already taken.' });
            }
        }

        const settings = await Setting.findOne();
        const domain = settings ? settings.defaultDomain : `${req.protocol}://${req.get('host')}`;

        const newLink = await Link.create({
            userId: user._id,
            originalUrl: url,
            alias: finalAlias,
            domain: domain
        });

        const shortUrl = `${domain}/${newLink.alias}`;

        // TEXT FORMAT RESPONSE LOGIC
        if (format === 'text') {
            return res.send(shortUrl);
        }

        // DEFAULT JSON RESPONSE LOGIC
        res.json({
            status: 'success',
            shortenedUrl: shortUrl
        });

    } catch (error) {
        console.error('Developer API Error:', error);
        if (req.query.format === 'text') return res.send('');
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};
