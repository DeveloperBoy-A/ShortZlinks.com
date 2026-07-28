const Withdrawal = require('../models/Withdrawal');
const Subscriber = require('../models/Subscriber');

// Masks a username the same way the reference site does: "krishna" -> "kri******"
function maskUsername(name) {
    if (!name) return 'User******';
    const visible = name.slice(0, 3);
    return `${visible}${'*'.repeat(6)}`;
}

// ==========================================
// PAYMENT PROOFS  (/payment-proofs)
// Real, paginated data pulled from completed withdrawals.
// ==========================================
exports.getPaymentProofs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const perPage = 20;

        const filter = { status: 'Completed' };

        const [totalCount, withdrawals] = await Promise.all([
            Withdrawal.countDocuments(filter),
            Withdrawal.find(filter)
                .populate('userId', 'username')
                .sort('-updatedAt')
                .skip((page - 1) * perPage)
                .limit(perPage)
        ]);

        const proofs = withdrawals.map(w => ({
            date: w.updatedAt,
            username: maskUsername(w.userId ? w.userId.username : 'user'),
            amount: w.amount,
            method: w.method
        }));

        const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

        res.render('payment-proofs', {
            title: 'Payment Proofs',
            proofs,
            page,
            totalPages
        });
    } catch (error) {
        console.error('Payment Proofs Page Error:', error);
        res.status(500).send('Error loading payment proofs');
    }
};

// ==========================================
// PRIVACY POLICY  (/privacy)
// ==========================================
exports.getPrivacyPolicy = (req, res) => {
    res.render('privacy', { title: 'Privacy Policy' });
};

// ==========================================
// TERMS AND CONDITIONS  (/terms)
// ==========================================
exports.getTerms = (req, res) => {
    res.render('terms', { title: 'Terms and Conditions' });
};

// ==========================================
// CONTACT US  (/contact)
// ==========================================
exports.getContact = (req, res) => {
    res.render('contact', { title: 'Contact Us' });
};

// ==========================================
// NEWSLETTER SUBSCRIBE  (/subscribe)
// ==========================================
exports.subscribeNewsletter = async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email) return res.redirect('back');

        await Subscriber.updateOne({ email }, { email }, { upsert: true });
        res.redirect(req.get('Referrer') ? req.get('Referrer') + '?subscribed=1' : '/?subscribed=1');
    } catch (error) {
        console.error('Subscribe Error:', error);
        res.redirect(req.get('Referrer') || '/');
    }
};
