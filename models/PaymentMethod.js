const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., PhonePe, Bank Transfer, PayPal
    iconClass: { type: String, default: 'fas fa-wallet' }, // FontAwesome icon
    minPayout: { type: Number, required: true, default: 5 },
    isActive: { type: Boolean, default: true },
    instructions: { type: String }, // e.g., "Enter your UPI ID below"
    // Har payment method ko alag alag account-details fields chahiye hote hain.
    // e.g. Bank Transfer => ["Account Holder Name", "Account Number", "IFSC Code", "Bank Name"]
    // e.g. UPI => ["UPI ID"]
    fields: { type: [String], default: ['Account Details'] }
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);