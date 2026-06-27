const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    // Revenue Control
    adminCommissionPercent: { type: Number, default: 20 }, 
    baseCpm: { type: Number, default: 5.00 }, // Global Default CPM
    
    // NAYA ADD KIYA: Country-wise Rates storage
    // Map ka fayda ye hai ki aap dynamic keys (US, IN, etc.) save kar sakte hain
    countryRates: { 
        type: Map, 
        of: Number, 
        default: {
            "US": 10.00,
            "GB": 8.00,
            "IN": 5.00,
            "BD": 3.00
        } 
    },

    // UI & System Settings
    adSteps: { type: Number, default: 2, min: 1, max: 4 },
    activeDomains: [{ type: String }],
    defaultDomain: { type: String, default: process.env.BASE_URL || 'shortzlinks.com' },
    captchaEnabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
