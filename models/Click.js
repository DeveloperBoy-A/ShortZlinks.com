const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress: { type: String, required: true },
    country: { type: String, default: 'Unknown' },
    userAgent: { type: String },
    isValid: { type: Boolean, default: true }, // Set to false if it's a proxy or duplicate
    earningsGenerated: { type: Number, default: 0.00 }, // User's cut
    adminCommission: { type: Number, default: 0.00 } // Admin's cut
}, { timestamps: true });

// Index for optimizing the 24-hour limit checks
clickSchema.index({ ipAddress: 1, linkId: 1, createdAt: -1 });

module.exports = mongoose.model('Click', clickSchema);
