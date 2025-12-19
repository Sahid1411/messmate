const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true }, // e.g., "2025-10"
    status: { type: String, default: 'Success' },
    transactionId: { type: String, required: true }, // Mock or Real ID
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema); 