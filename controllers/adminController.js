const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Setting = require('../models/Setting');
const PaymentMethod = require('../models/PaymentMethod');
const Link = require('../models/Link');

exports.getDashboard = async (req, res) => {
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'Pending' });
    const totalUsers = await User.countDocuments();
    res.render('admin/dashboard', { title: 'Admin God Mode', pendingWithdrawals, totalUsers });
};

exports.getSettings = async (req, res) => {
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});
    const paymentMethods = await PaymentMethod.find();
    res.render('admin/settings', { title: 'Platform Settings', settings, paymentMethods });
};

// UPDATED: CPM Engine aur Percentage Update Logic
exports.updateSettings = async (req, res) => {
    try {
        const { defaultCpm, adminCommissionPercent, adSteps, countryRates } = req.body;
        
        // JSON string ko object mein convert karna
        let parsedRates = {};
        try {
            parsedRates = JSON.parse(countryRates);
        } catch (e) {
            return res.status(400).send('Invalid JSON format for Country Rates');
        }

        await Setting.findOneAndUpdate({}, { 
            defaultCpm, 
            adminCommissionPercent, 
            adSteps, 
            countryRates: parsedRates 
        }, { upsert: true });

        res.redirect('/admin/settings?success=1');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating settings');
    }
};

exports.addPaymentMethod = async (req, res) => {
    const { name, minPayout, iconClass, instructions } = req.body;
    await PaymentMethod.create({ name, minPayout, iconClass, instructions });
    res.redirect('/admin/settings?success=1');
};

exports.getWithdrawals = async (req, res) => {
    const withdrawals = await Withdrawal.find().populate('userId').sort('-createdAt');
    res.render('admin/withdrawals', { title: 'Manage Payouts', withdrawals });
};

exports.updateWithdrawalStatus = async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) return res.status(404).send('Not Found');

    if (status === 'Returned' && withdrawal.status !== 'Returned') {
        await User.findByIdAndUpdate(withdrawal.userId, { $inc: { walletBalance: withdrawal.amount } });
    }

    if ((status === 'Approved' || status === 'Completed') && withdrawal.status === 'Returned') {
        await User.findByIdAndUpdate(withdrawal.userId, { $inc: { walletBalance: -withdrawal.amount } });
    }

    if (status === 'Completed' && withdrawal.status !== 'Completed') {
        await User.findByIdAndUpdate(withdrawal.userId, { $inc: { totalWithdrawn: withdrawal.amount } });
    }

    withdrawal.status = status;
    withdrawal.adminNotes = adminNotes;
    await withdrawal.save();

    res.redirect('/admin/withdrawals');
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt');
        res.render('admin/users', { title: 'User Management', users });
    } catch (error) {
        res.status(500).send('Error loading users');
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send('User not found');

        const userLinks = await Link.find({ userId: user._id }).sort('-createdAt').limit(50);
        const userWithdrawals = await Withdrawal.find({ userId: user._id }).sort('-createdAt');

        res.render('admin/user-detail', { 
            title: `Viewing User: ${user.email}`, 
            viewedUser: user, 
            userLinks, 
            userWithdrawals 
        });
    } catch (error) {
        res.status(500).send('Error loading user profile');
    }
};

exports.addDomain = async (req, res) => {
    try {
        const { newDomain } = req.body;
        const cleanDomain = newDomain.replace(/\/$/, "");
        await Setting.findOneAndUpdate({}, { $addToSet: { activeDomains: cleanDomain } });
        res.redirect('/admin/settings?success=domain_added');
    } catch (error) {
        res.status(500).send('Error adding domain');
    }
};
