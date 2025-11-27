const Payment = require('../models/Payment');
const Settings = require('../models/settings'); // Import Settings
const Razorpay = require('razorpay');
const crypto = require('crypto');

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. CREATE ORDER (Updated)
exports.createOrder = async (req, res) => {
    const { month } = req.body;
    try {
        // A. DOUBLE PAYMENT CHECK
        const existingPayment = await Payment.findOne({ 
            studentId: req.user.id, 
            month: month,  
            status: 'Success' 
        });

        if (existingPayment) {
            return res.status(400).json({ message: `Fees already paid for ${month}` });
        }

        // B. GET DYNAMIC FEE AMOUNT
        const settings = await Settings.findOne();
        const amountToPay = settings ? settings.feeAmount : 2000; // Default 2000

        const options = {
            amount: amountToPay * 100, // Convert to paise
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        const order = await instance.orders.create(options);
        res.json({ order, key_id: process.env.RAZORPAY_KEY_ID }); // Send Key to frontend
    } catch (error) {
        res.status(500).json({ message: error.message || "Something went wrong" });
    }
};

// ... Verify Payment and other functions remain the same ...
// Just ensure verification saves the payment with the correct amount if needed.
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, month } = req.body;
        
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

        if (razorpay_signature === expectedSign) {
            // Check double payment again just to be safe
            const existing = await Payment.findOne({ studentId: req.user.id, month: month, status: 'Success' });
            if(existing) return res.status(400).json({ message: "Already Paid" });

            const newPayment = await Payment.create({
                studentId: req.user.id,
                amount: amount, 
                month: month,
                transactionId: razorpay_payment_id,
                status: 'Success',
                paymentMethod: 'Online'
            });
            res.status(200).json({ message: "Payment Verified", payment: newPayment });
        } else {
            res.status(400).json({ message: "Invalid Signature" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// Pay Fees
exports.payFees = async (req, res) => {
    const { amount, month, transactionId } = req.body;
    try {
        const payment = await Payment.create({
            studentId: req.user.id,
            amount,
            month,
            transactionId
        });
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get History (Student)
exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ studentId: req.user.id }).sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Payments (Admin)
exports.getAllPayments = async (req, res) => {
    try {
        // Populate user details to see WHO paid
        const payments = await Payment.find().populate('studentId', 'name rollNo roomNo dept');
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//  Admin records cash payment
exports.recordCashPayment = async (req, res) => {
    const { studentId, amount, month } = req.body;
    try {
        const newPayment = await Payment.create({
            studentId,
            amount,
            month,
            transactionId: 'CASH-' + Date.now(), // Generate a dummy ID for cash
            status: 'Success',
            paymentMethod: 'Cash'
        });
        res.status(201).json(newPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// [NEW] 1. Student submits a manual payment request
exports.submitManualPayment = async (req, res) => {
    const { amount, month, transactionId } = req.body;
    try {
        // Check if already paid or pending
        const existing = await Payment.findOne({ 
            studentId: req.user.id, 
            month: month, 
            status: { $in: ['Success', 'Pending'] } // Check both
        });

        if (existing) {
            return res.status(400).json({ message: "Payment already active or paid for this month." });
        }

        const newPayment = await Payment.create({
            studentId: req.user.id,
            amount,
            month,
            transactionId, // Student enters this manually
            status: 'Pending', // <--- IMPORTANT
            paymentMethod: 'Manual/UPI'
        });

        res.status(201).json(newPayment);
    } catch (error) {
        res.status(500).json({ message: "Error submitting request" });
    }
};

// [NEW] 2. Admin approves a pending payment
exports.approvePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if(payment) {
            payment.status = 'Success';
            await payment.save();
            res.json({ message: "Payment Approved" });
        } else {
            res.status(404).json({ message: "Payment not found" }); 
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// [NEW] 3. Admin rejects a payment
exports.rejectPayment = async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ message: "Payment Rejected & Removed" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};