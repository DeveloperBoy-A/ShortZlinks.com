const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress: { type: String, default: 'Unknown' },
    userAgent: { type: String, default: 'Unknown' },
    status: { type: String, enum: ['success', 'failed_password', 'failed_2fa'], required: true }
}, { timestamps: true });

// Fast lookups of "recent activity for this user"
loginActivitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LoginActivity', loginActivitySchema);
