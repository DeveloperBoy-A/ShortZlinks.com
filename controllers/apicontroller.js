const User = require('../models/User');
const Link = require('../models/Link');

exports.shortenViaApi = async (req, res) => {
    try {
        const { api, url } = req.query;

        if (!api || !url) {
            return res.status(400).json({ status: 'error', message: 'API token and URL are required.' });
        }

        // Validate API Token
        const user = await User.findOne({ apiToken: api });
        if (!user) {
            return res.status(401).json({ status: 'error', message: 'Invalid API Token.' });
        }

        // Create Link
        const newLink = await Link.create({
            userId: user._id,
            originalUrl: url
        });

        // Return JSON Response compatible with standard AdLinkFly APIs
        res.json({
            status: 'success',
            shortenedUrl: `${process.env.BASE_URL}/${newLink.alias}`
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};
      
