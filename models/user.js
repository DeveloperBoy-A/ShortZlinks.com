const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // Financials
    walletBalance: { type: Number, default: 0.00 },
    lifetimeEarnings: { type: Number, default: 0.00 },
    totalWithdrawn: { type: Number, default: 0.00 },
    
    // Exhaustive Personal Details (Mandatory for withdrawal)
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    
    // Withdrawal Settings
    preferredPaymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
    withdrawalAccountDetails: { type: String, default: '' }, // e.g., phone number or UPI
    
    // Traffic Source
    declaredTrafficSources: [{ type: String }],
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Check if user has filled all billing details
userSchema.methods.isProfileComplete = function() {
    const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'country', 'phoneNumber'];
    return requiredFields.every(field => this[field] && this[field].trim() !== '');
};

module.exports = mongoose.model('User', userSchema);
