const Payment = require('../models/payment'); // Ensure case matches your filename
const Settings = require('../models/settings');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. CREATE RAZORPAY ORDER
exports.createOrder = async (req, res) => {
    const { month } = req.body;
    try {
        const existingPayment = await Payment.findOne({ 
            studentId: req.user.id, 
            month: month,  
            status: { $in: ['Success', 'Pending'] } 
        });

        if (existingPayment) {
            return res.status(400).json({ message: `Payment for ${month} is already ${existingPayment.status}` });
        }

        const settings = await Settings.findOne();
        const amountToPay = settings ? settings.feeAmount : 2000;

        const options = {
            amount: amountToPay * 100, 
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        const order = await instance.orders.create(options);
        res.json({ order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        res.status(500).json({ message: error.message || "Order creation failed" });
    }
};

// 2. VERIFY RAZORPAY PAYMENT
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, month } = req.body;
        
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                                   .update(sign.toString()).digest("hex");

        if (razorpay_signature === expectedSign) {
            const newPayment = await Payment.create({
                studentId: req.user.id,
                amount, 
                month,
                transactionId: razorpay_payment_id,
                status: 'Success',
                paymentMethod: 'Online'
            });
            res.status(200).json({ message: "Payment Verified", payment: newPayment });
        } else {
            res.status(400).json({ message: "Invalid Payment Signature" });
        }
    } catch (error) {
        res.status(500).json({ message: "Verification Server Error" });
    }
};

// 3. GET HISTORY (Student)
exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ studentId: req.user.id }).sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. GET ALL PAYMENTS (Admin)
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate('studentId', 'name rollNo roomNo dept').sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. ADMIN: RECORD CASH
exports.recordCashPayment = async (req, res) => {
    const { studentId, amount, month } = req.body;
    try {
        const newPayment = await Payment.create({
            studentId,
            amount,
            month,
            transactionId: 'CASH-' + Date.now(),
            status: 'Success',
            paymentMethod: 'Cash'
        });
        res.status(201).json(newPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
 
// 6. MANUAL UPI REQUEST (Student Submits Txn ID)
exports.submitManualPayment = async (req, res) => {
    const { amount, month, transactionId } = req.body;
    try {
        const existing = await Payment.findOne({ 
            studentId: req.user.id, 
            month: month, 
            status: { $in: ['Success', 'Pending'] } 
        });

        if (existing) return res.status(400).json({ message: "Month already paid or pending verification" });

        const newPayment = await Payment.create({
            studentId: req.user.id,
            amount, month, transactionId,
            status: 'Pending',
            paymentMethod: 'Manual/UPI'
        });
        res.status(201).json(newPayment);
    } catch (error) {
        res.status(500).json({ message: "Manual request error" });
    }
};

// 7. ADMIN APPROVAL
exports.approvePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndUpdate(req.params.id, { status: 'Success' }, { new: true });
        res.json({ message: "Approved successfully", payment });
    } catch (error) { res.status(500).json({ message: "Approval failed" }); }
};

// 8. ADMIN REJECTION
exports.rejectPayment = async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ message: "Payment Rejected" });
    } catch (error) { res.status(500).json({ message: "Rejection failed" }); }
}; 