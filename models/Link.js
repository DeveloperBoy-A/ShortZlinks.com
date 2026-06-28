const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const linkSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalUrl: { type: String, required: true },
    alias: { type: String, required: true, unique: true, default: () => nanoid(7) },
    domain: { type: String }, // For multi-domain support
    totalClicks: { type: Number, default: 0 },
    validEarnings: { type: Number, default: 0.00 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Link', linkSchema);
