const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true }, // Stored as string in case method is deleted later
    accountDetails: { type: String, required: true },
    trafficSource: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Completed', 'Returned'], default: 'Pending' },
    adminNotes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
