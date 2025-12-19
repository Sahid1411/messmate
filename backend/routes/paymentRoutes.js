const express = require('express');
const router = express.Router();

// Import using destructuring - ensure names match exports exactly
const { 
    createOrder, 
    verifyPayment, 
    getMyPayments, 
    getAllPayments,
    recordCashPayment,
    submitManualPayment,
    approvePayment,
    rejectPayment 
} = require('../controllers/paymentController');

// Import middleware using destructuring
const { protect, admin } = require('../middleware/authMiddleware'); 

// --- STUDENT ROUTES ---
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/my-history', protect, getMyPayments);
router.post('/manual-request', protect, submitManualPayment);

// --- ADMIN ROUTES ---
router.get('/all', protect, admin, getAllPayments); 
router.post('/record-cash', protect, admin, recordCashPayment);
router.put('/approve/:id', protect, admin, approvePayment);
router.delete('/reject/:id', protect, admin, rejectPayment);

module.exports = router;