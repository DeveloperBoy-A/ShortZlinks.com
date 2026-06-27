const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Setting = require('../models/Setting');
const PaymentMethod = require('../models/PaymentMethod');

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

exports.updateSettings = async (req, res) => {
    const { adminCommissionPercent, baseCpm, adSteps } = req.body;
    await Setting.findOneAndUpdate({}, { adminCommissionPercent, baseCpm, adSteps }, { upsert: true });
    res.redirect('/admin/settings?success=1');
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

    // If a payment is returned, refund the user's wallet
    if (status === 'Returned' && withdrawal.status !== 'Returned') {
        await User.findByIdAndUpdate(withdrawal.userId, {
            $inc: { walletBalance: withdrawal.amount }
        });
    }
    
    // If it was returned but now changed to Approved/Completed, deduct it back
    if ((status === 'Approved' || status === 'Completed') && withdrawal.status === 'Returned') {
        await User.findByIdAndUpdate(withdrawal.userId, {
            $inc: { walletBalance: -withdrawal.amount }
        });
    }

    // Update totalWithdrawn if completed
    if (status === 'Completed' && withdrawal.status !== 'Completed') {
        await User.findByIdAndUpdate(withdrawal.userId, {
            $inc: { totalWithdrawn: withdrawal.amount }
        });
    }

    withdrawal.status = status;
    withdrawal.adminNotes = adminNotes;
    await withdrawal.save();
    
    res.redirect('/admin/withdrawals');
};

// Fetch all users for Admin
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt');
        res.render('admin/users', { title: 'User Management', users });
    } catch (error) {
        res.status(500).send('Error loading users');
    }
};

// Advanced User Profile (God Mode View)
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send('User not found');

        // Fetch their recent links and withdrawal history
        const Link = require('../models/Link');
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
    
