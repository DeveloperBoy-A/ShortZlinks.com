// scripts/seedPaymentMethods.js
//
// Ek baar chalane ke liye script — 6 common payment methods ko DB me
// add kar deta hai, har ek ke apne required fields ke saath.
//
// Kaise chalayein (project ke root folder se):
//   node scripts/seedPaymentMethods.js
//
// Agar method already (same name se) exist karta hai, to use skip kar dega,
// dobara chalane se duplicate nahi banenge.

require('dotenv').config();
const mongoose = require('mongoose');
const PaymentMethod = require('../models/PaymentMethod');

const methods = [
    {
        name: 'UPI',
        iconClass: 'fas fa-mobile-alt',
        minPayout: 2,
        instructions: 'Apna active UPI ID daalein jo aapke bank account se linked ho.',
        fields: ['UPI ID']
    },
    {
        name: 'Bank Transfer (NEFT/IMPS)',
        iconClass: 'fas fa-university',
        minPayout: 10,
        instructions: 'Bank details bilkul sahi bharein, galat details se payout fail ho sakta hai.',
        fields: ['Account Holder Name', 'Account Number', 'IFSC Code', 'Bank Name']
    },
    {
        name: 'Paytm Wallet',
        iconClass: 'fas fa-wallet',
        minPayout: 2,
        instructions: 'Wo mobile number daalein jo aapke Paytm wallet se linked hai.',
        fields: ['Paytm Registered Mobile Number']
    },
    {
        name: 'PayPal',
        iconClass: 'fab fa-paypal',
        minPayout: 5,
        instructions: 'Apna verified PayPal email address daalein.',
        fields: ['PayPal Email']
    },
    {
        name: 'Payoneer',
        iconClass: 'fas fa-money-check-alt',
        minPayout: 20,
        instructions: 'Apna Payoneer account email daalein.',
        fields: ['Payoneer Email']
    },
    {
        name: 'USDT (Crypto - TRC20)',
        iconClass: 'fab fa-bitcoin',
        minPayout: 10,
        instructions: 'Sirf TRC20 network wala USDT wallet address daalein.',
        fields: ['USDT Wallet Address (TRC20)']
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        for (const m of methods) {
            const exists = await PaymentMethod.findOne({ name: m.name });
            if (exists) {
                console.log(`⏭️  Skipped (already exists): ${m.name}`);
                continue;
            }
            await PaymentMethod.create(m);
            console.log(`✅ Added: ${m.name}`);
        }

        console.log('🎉 Done seeding payment methods.');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
