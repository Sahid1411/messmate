const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    feeAmount: { type: Number, default: 2000 },
    qrCodeUrl: { type: String, default: '' } // Admin will paste an image link here
});

module.exports = mongoose.model('Settings', settingsSchema);