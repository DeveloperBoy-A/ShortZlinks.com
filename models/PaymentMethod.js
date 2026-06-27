const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., PhonePe, Bank Transfer, PayPal
    iconClass: { type: String, default: 'fas fa-wallet' }, // FontAwesome icon
    minPayout: { type: Number, required: true, default: 5 },
    isActive: { type: Boolean, default: true },
    instructions: { type: String } // e.g., "Enter your UPI ID below"
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
