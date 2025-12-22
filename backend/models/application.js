const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Leave', 'Query', 'Complaint'], default: 'Leave' },
    startDate: Date, // For Leaves
    endDate: Date,   // For Leaves
    subject: String,
    message: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    adminReply: { type: String, default: '' }
}, { timestamps: true }); 

module.exports = mongoose.model('Application', applicationSchema);