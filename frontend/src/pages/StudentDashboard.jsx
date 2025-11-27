import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({ feeAmount: 2000, qrCodeUrl: '' });
    
    // UI States for Manual Payment
    const [showQrModal, setShowQrModal] = useState(false);
    const [manualTxnId, setManualTxnId] = useState(''); 
    
    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    const currentMonth = "November 2025"; 

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const historyRes = await axios.get('http://localhost:5000/api/payment/my-history', config);
            const settingsRes = await axios.get('http://localhost:5000/api/settings');
            setHistory(historyRes.data);
            setSettings(settingsRes.data);
        } catch(err) { 
            toast.error("Failed to load data"); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- RAZORPAY PAYMENT LOGIC ---
    const handlePay = async () => {
        if (history.find(p => p.month === currentMonth && p.status === 'Success')) {
            toast.error(`Fees already paid for ${currentMonth}`);
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post(
                'http://localhost:5000/api/payment/create-order', 
                { amount: settings.feeAmount, month: currentMonth }, 
                config
            );

            const options = {
                key: data.key_id,
                amount: data.order.amount,
                currency: "INR",
                name: "MessMate Hostel",
                description: `Mess Fees for ${currentMonth}`,
                order_id: data.order.id,
                handler: async function (response) {
                    try {
                        await axios.post('http://localhost:5000/api/payment/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: settings.feeAmount,
                            month: currentMonth
                        }, config);
                        
                        toast.success("Payment Successful! 🎉");
                        fetchInitialData();
                    } catch (error) {
                        toast.error("Payment Verification Failed");
                    }
                },
                prefill: { name: user.name, email: user.email },
                theme: { color: "#3399cc" },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();
            setLoading(false); 

        } catch (error) {
            setLoading(false);
            toast.error(error.response?.data?.message || "Error initiating payment");
        }
    };

    // --- MANUAL PAYMENT LOGIC ---
    const handleManualSubmit = async () => {
        if(!manualTxnId) {
            toast.error("Please enter Transaction ID!");
            return;
        }
        
        try {
            await axios.post('http://localhost:5000/api/payment/manual-request', {
                amount: settings.feeAmount,
                month: currentMonth,
                transactionId: manualTxnId
            }, config);

            toast.success("Payment Submitted! Admin will verify soon.");
            setShowQrModal(false); 
            setManualTxnId(''); 
            fetchInitialData(); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Error submitting request");
        }
    };

    // --- PROFESSIONAL RECEIPT GENERATOR ---
    const downloadReceipt = (pay) => {
        const doc = new jsPDF();
        
        // --- DESIGN ---
        // 1. Outer Border
        doc.setLineWidth(1);
        doc.setDrawColor(0, 0, 0);
        doc.rect(5, 5, 200, 287);

        // 2. Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(44, 62, 80); // Dark Blue
        doc.text("LDCN Hostel", 105, 25, null, null, "center");
        
        doc.setFontSize(16);
        doc.setTextColor(100, 100, 100); // Grey
        doc.text("Dibrugarh University", 105, 35, null, null, "center");

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45); // Horizontal Line

        // 3. Title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.text("OFFICIAL PAYMENT RECEIPT", 105, 60, null, null, "center");
        doc.setFontSize(10);
        doc.text(`Receipt ID: ${pay._id.toString().toUpperCase()}`, 105, 66, null, null, "center");

        // 4. Info Box (Student Details)
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 80, 170, 50, 'F'); // Grey Background Box
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        
        // Left Column
        doc.text(`Student Name : ${user.name}`, 25, 95);
        doc.text(`Department   : ${user.dept || 'N/A'}`, 25, 105);
        doc.text(`Roll Number  : ${user.rollNo || 'N/A'}`, 25, 115);
        
        // Right Column
        doc.text(`Date         : ${new Date(pay.date).toLocaleDateString()}`, 110, 95);
        doc.text(`Room No      : ${user.roomNo || 'N/A'}`, 110, 105);
        doc.text(`Payment Mode : ${pay.paymentMethod || 'Online'}`, 110, 115);

        // 5. Payment Details Table
        let yPos = 150;
        
        // Table Header
        doc.setFillColor(44, 62, 80); // Dark Header
        doc.rect(20, yPos, 170, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Description", 25, yPos + 8);
        doc.text("Amount (INR)", 150, yPos + 8);

        // Table Row
        yPos += 12;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.rect(20, yPos, 170, 15);
        doc.text(`Mess Fees for Month: ${pay.month}`, 25, yPos + 10);
        doc.text(`${pay.amount}/-`, 150, yPos + 10);

        // Total
        yPos += 15;
        doc.setFont("helvetica", "bold");
        doc.rect(20, yPos, 170, 12);
        doc.text("TOTAL PAID", 110, yPos + 8);
        doc.text(`Rs. ${pay.amount}/-`, 150, yPos + 8);

        // 6. Signatures & Footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        doc.text("Transaction ID (Ref):", 20, 220);
        doc.text(pay.transactionId, 20, 225);

        doc.text("Authorized Signatory", 150, 240, null, null, "center");
        doc.line(130, 235, 170, 235); // Signature Line

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text("Thank you for your payment. This receipt is computer generated.", 105, 270, null, null, "center");
        doc.text("MessMate System - Dibrugarh University", 105, 275, null, null, "center");

        // Save
        doc.save(`Receipt_${user.name}_${pay.month}.pdf`);
    };

    return (
        <>
            <Navbar />
            <div className="container py-5">
                <div className="row mb-4">
                    <div className="col-md-12">
                        <h2 className="fw-bold text-dark">👋 Welcome, <span className="text-primary">{user?.name}</span></h2>
                    </div>
                </div>

                {/* QR Code Section */}
                {settings.qrCodeUrl && (
                    <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                        <div className="me-3">
                            <strong>Pay via UPI App:</strong> Click the QR image to scan and pay manually.
                        </div>
                        <img 
                            src={settings.qrCodeUrl} 
                            alt="Admin QR" 
                            style={{ height: '80px', width: '80px', objectFit: 'cover', cursor: 'pointer' }} 
                            className="border rounded bg-white shadow-sm"
                            onClick={() => setShowQrModal(true)}
                        />
                    </div>
                )}

                {/* Main Action Area */}
                <div className="row">
                    {/* Left: Payment Card */}
                    <div className="col-md-4 mb-4">
                        <div className="card text-white bg-primary bg-gradient shadow-lg border-0 h-100" style={{ borderRadius: '15px' }}>
                            <div className="card-body p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <h5 className="card-title opacity-75">Current Dues</h5>
                                    <h2 className="display-4 fw-bold">₹{settings.feeAmount}</h2>
                                    <p className="mb-0">Month: {currentMonth}</p>
                                </div>
                                
                                {history.find(p => p.month === currentMonth && p.status === 'Pending') ? (
                                    <button className="btn btn-warning fw-bold mt-3 py-2 w-100 shadow-sm text-dark" disabled>
                                        ⏳ Processing Verification...
                                    </button>
                                ) : history.find(p => p.month === currentMonth && p.status === 'Success') ? (
                                    <button className="btn btn-light fw-bold mt-3 py-2 w-100 shadow-sm text-success" disabled>
                                        ✅ Paid Successfully
                                    </button>
                                ) : (
                                    <button onClick={handlePay} disabled={loading} className="btn btn-light text-primary fw-bold mt-3 py-2 w-100 shadow-sm">
                                        {loading ? "Processing..." : "💳 Pay Online (Instant)"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: History Table */}
                    <div className="col-md-8">
                        <div className="card shadow border-0" style={{ borderRadius: '15px' }}>
                             <div className="card-body p-4">
                                <h5 className="fw-bold text-secondary mb-3">📜 Payment History</h5>
                                {loading && history.length === 0 ? (
                                    <div className="text-center"><div className="spinner-border text-primary"></div></div>
                                ) : history.length === 0 ? (
                                    <p className="text-muted text-center py-3">No payment records found.</p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle">
                                            <thead className="table-light">
                                                <tr><th>Date</th><th>Month</th><th>Amount</th><th>Status</th><th>Receipt</th></tr>
                                            </thead>
                                            <tbody>
                                                {history.map(pay => (
                                                    <tr key={pay._id}>
                                                        <td>{new Date(pay.date).toLocaleDateString()}</td>
                                                        <td>{pay.month}</td>
                                                        <td className="fw-bold">₹{pay.amount}</td>
                                                        <td>
                                                            {pay.status === 'Success' ? <span className="badge bg-success">Success</span> : 
                                                             pay.status === 'Pending' ? <span className="badge bg-warning text-dark">Pending</span> : 
                                                             <span className="badge bg-danger">Failed</span>}
                                                        </td>
                                                        <td>
                                                            {pay.status === 'Success' && (
                                                                <button onClick={() => downloadReceipt(pay)} className="btn btn-sm btn-outline-secondary">Download</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Code Modal for Manual Payment */}
            {showQrModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Manual Payment</h5>
                                <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
                            </div>
                            <div className="modal-body text-center">
                                <p className="text-muted small">Step 1: Scan this QR and Pay ₹{settings.feeAmount}</p>
                                <img src={settings.qrCodeUrl} alt="QR" className="img-fluid border rounded mb-3" style={{ maxHeight: '200px'}} />
                                
                                <p className="text-muted small mt-2 text-start">Step 2: Enter Transaction ID / UTR from your App</p>
                                <input 
                                    type="text" 
                                    className="form-control mb-3" 
                                    placeholder="e.g. UPI/1234567890" 
                                    value={manualTxnId}
                                    onChange={(e) => setManualTxnId(e.target.value)}
                                />
                                <button onClick={handleManualSubmit} className="btn btn-success w-100">Submit for Verification</button>
                            </div>
                        </div>
                    </div>  
                </div>
            )}
        </>
    );
};

export default StudentDashboard;