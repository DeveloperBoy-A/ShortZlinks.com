const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const PaymentMethod = require('../models/PaymentMethod');

exports.getWithdrawals = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).populate('preferredPaymentMethodId');
        const history = await Withdrawal.find({ userId: user._id }).sort('-createdAt');
        res.render('user/withdrawals', { title: 'Withdrawals', user, history });
    } catch (error) {
        res.status(500).send('Error loading withdrawals');
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { trafficSource } = req.body;
        const user = await User.findById(req.session.user.id).populate('preferredPaymentMethodId');

        // Business Logic Checks
        if (!user.isProfileComplete()) {
            return res.status(400).send('Please complete your profile settings first.');
        }

        const method = user.preferredPaymentMethodId;
        if (!method) {
            return res.status(400).send('Please select a payment method in settings.');
        }

        if (user.walletBalance < method.minPayout) {
            return res.status(400).send(`Minimum payout for ${method.name} is $${method.minPayout}`);
        }

        if (!trafficSource || trafficSource.trim() === '') {
            return res.status(400).send('Traffic source is mandatory to prevent fraud.');
        }

        const withdrawalAmount = user.walletBalance;

        // Create Request
        await Withdrawal.create({
            userId: user._id,
            amount: withdrawalAmount,
            method: method.name,
            accountDetails: user.withdrawalAccountDetails,
            trafficSource
        });

        // Deduct Balance
        user.walletBalance = 0;
        
        // Track traffic sources uniquely
        if (!user.declaredTrafficSources.includes(trafficSource)) {
            user.declaredTrafficSources.push(trafficSource);
        }
        await user.save();

        res.redirect('/user/withdrawals?success=1');
    } catch (error) {
        console.error('Withdrawal Request Error:', error);
        res.status(500).send('Error processing withdrawal');
    }
};
