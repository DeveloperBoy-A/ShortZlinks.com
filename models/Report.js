const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportedUrl: { type: String, required: true },
    reason: { type: String, required: true }, // e.g. Copyright Infringement, Malware
    email: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);

