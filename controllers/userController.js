const User = require('../models/User');
const Link = require('../models/Link');
const PaymentMethod = require('../models/PaymentMethod');

exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).populate('preferredPaymentMethodId');
        const links = await Link.find({ userId: user._id }).sort('-createdAt').limit(10);
        
        // Count total links
        const totalLinks = await Link.countDocuments({ userId: user._id });

        res.render('user/dashboard', { 
            title: 'User Dashboard', 
            user, 
            links, 
            totalLinks 
        });
    } catch (error) {
        console.error('User Dashboard Error:', error);
        res.status(500).send('Error loading dashboard');
    }
};

exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const paymentMethods = await PaymentMethod.find({ isActive: true });
        res.render('user/settings', { title: 'Profile Settings', user, paymentMethods });
    } catch (error) {
        res.status(500).send('Error loading settings');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            'firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 
            'country', 'phoneNumber', 'preferredPaymentMethodId', 'withdrawalAccountDetails'
        ];
        
        const updates = {};
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        await User.findByIdAndUpdate(req.session.user.id, updates);
        res.redirect('/user/settings?success=1');
    } catch (error) {
        res.status(500).send('Error updating profile');
    }
};
