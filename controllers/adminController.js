const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Setting = require('../models/Setting');
const PaymentMethod = require('../models/PaymentMethod');
const Link = require('../models/Link');
const Click = require('../models/Click');

// 1. Dashboard: Stats + Total Profit
exports.getDashboard = async (req, res) => {
    try {
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'Pending' });
        const totalUsers = await User.countDocuments();
        const settings = await Setting.findOne() || await Setting.create({});
        
        // Total Admin Commission Calculation
        const stats = await Click.aggregate([
            { $match: { isValid: true } },
            { $group: { _id: null, totalAdminProfit: { $sum: "$adminCommission" } } }
        ]);
        const totalProfit = stats.length > 0 ? stats[0].totalAdminProfit : 0;

        res.render('admin/dashboard', { 
            title: 'Admin God Mode', 
            pendingWithdrawals, 
            totalUsers, 
            totalProfit,
            settings 
        });
    } catch (error) {
        res.status(500).send('Error loading dashboard');
    }
};

// 2. Settings: Render
exports.getSettings = async (req, res) => {
    let settings = await Setting.findOne() || await Setting.create({});
    const paymentMethods = await PaymentMethod.find();
    res.render('admin/settings', { title: 'Platform Settings', settings, paymentMethods });
};

// 3. Settings: Update Logic (CPM Engine + Percentage)
exports.updateSettings = async (req, res) => {
    try {
        const { baseCpm, adminCommissionPercent, adSteps, countryRates } = req.body;

        let parsedRates = {};
        try {
            parsedRates = JSON.parse(countryRates);
        } catch (e) {
            return res.status(400).send('Invalid JSON format for Country Rates');
        }

        await Setting.findOneAndUpdate({}, { 
            baseCpm: parseFloat(baseCpm), 
            adminCommissionPercent: parseFloat(adminCommissionPercent), 
            adSteps: parseInt(adSteps), 
            countryRates: parsedRates 
        }, { upsert: true });

        // Redirect back to referring page or dashboard
        res.redirect(req.headers.referer || '/admin/settings?success=1');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating settings');
    }
};

// 4. Payment Methods
exports.addPaymentMethod = async (req, res) => {
    const { name, minPayout, iconClass, instructions } = req.body;
    await PaymentMethod.create({ name, minPayout, iconClass, instructions });
    res.redirect('/admin/settings?success=1');
};

// 5. Withdrawals Management
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

// 6. User Management
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

// 7. Domain Management
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
