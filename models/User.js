const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema({
    // Core Auth
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    
    // Financials & Stats
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
    withdrawalAccountDetails: { type: String, default: '' }, 
    
    // Traffic Source Tracking (For Admin Verification)
    declaredTrafficSources: [{ type: String }],

    // Developer API
    apiToken: { type: String, unique: true, default: () => nanoid(20) },
    
    // Referral System
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralEarnings: { type: Number, default: 0.00 },

    // Password Reset
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date }

}, { timestamps: true });

// Helper Method: Check if user has filled all billing details
userSchema.methods.isProfileComplete = function() {
    const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'country', 'phoneNumber'];
    return requiredFields.every(field => this[field] && this[field].trim() !== '');
};

module.exports = mongoose.model('User', userSchema);
