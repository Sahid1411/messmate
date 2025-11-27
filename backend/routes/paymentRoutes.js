const express = require('express');
const { 
    createOrder, verifyPayment, getMyPayments, getAllPayments, 
    recordCashPayment, submitManualPayment, approvePayment, rejectPayment 
} = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

// Existing
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/my-history', protect, getMyPayments);
router.get('/all', protect, getAllPayments);
router.post('/record-cash', protect, recordCashPayment);

// [NEW] Manual Flow Routes
router.post('/manual-request', protect, submitManualPayment); // Student
router.put('/approve/:id', protect, approvePayment); // Admin
router.delete('/reject/:id', protect, rejectPayment); // Admin

module.exports = router;