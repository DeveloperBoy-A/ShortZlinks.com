const bcrypt = require('bcryptjs'); // File ke top par add karein
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

// Ye naya function add karein
exports.updateSecurity = async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.session.user.id);

        // Security check: Pehle current password verify karein
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).send('Incorrect current password.');
        }

        // Agar new email dali hai toh update karein
        if (email && email !== user.email) {
            // Check if email already exists in DB
            const emailExists = await User.findOne({ email });
            if (emailExists) return res.status(400).send('Email already in use.');
            user.email = email;
            req.session.user.email = email; // Session bhi update karein
        }

        // Agar new password dala hai toh usko hash karke update karein
        if (newPassword && newPassword.trim() !== '') {
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();
        res.redirect('/user/settings?success=security_updated');
    } catch (error) {
        console.error('Security Update Error:', error);
        res.status(500).send('Error updating security settings');
    }
};
    
