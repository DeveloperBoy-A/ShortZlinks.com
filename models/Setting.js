const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    adminCommissionPercent: { type: Number, default: 20 }, // Admin takes 20%, User gets 80%
    baseCpm: { type: Number, default: 5.00 }, // Default $5 CPM per 1000 valid clicks
    adSteps: { type: Number, default: 2, min: 1, max: 4 }, // 1 to 4 pages dynamically
    activeDomains: [{ type: String }],
    defaultDomain: { type: String, default: process.env.BASE_URL },
    captchaEnabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
