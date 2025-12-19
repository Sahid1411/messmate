const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    feeAmount: { type: Number, default: 2000 },
});

module.exports = mongoose.model('Settings', settingsSchema);  