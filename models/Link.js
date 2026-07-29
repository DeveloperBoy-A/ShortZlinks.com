const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const linkSchema = new mongoose.Schema({
    // Optional: guest (not-logged-in) users can shorten links straight from the
    // homepage with no account. Those links simply have userId = null and never
    // generate publisher earnings (there's no one to pay), but they still work,
    // still redirect, and still count in the site-wide stats.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    isGuestLink: { type: Boolean, default: false },
    originalUrl: { type: String, required: true },
    alias: { type: String, required: true, unique: true, default: () => nanoid(7) },
    domain: { type: String }, // For multi-domain support
    expiresAt: { type: Date, default: null },
    totalClicks: { type: Number, default: 0 },
    validEarnings: { type: Number, default: 0.00 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Link', linkSchema);
