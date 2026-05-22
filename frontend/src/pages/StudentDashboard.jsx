import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [applications, setApplications] = useState([]);
    const [settings, setSettings] = useState({ feeAmount: 2000, qrCodeUrl: '' });
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [appForm, setAppForm] = useState({ type: 'Leave', startDate: '', endDate: '', subject: '', message: '' });
    
    // User data from localStorage
    const user = JSON.parse(localStorage.getItem('userInfo'));
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Form State for Profile
    const [profileForm, setProfileForm] = useState({ 
        name: user?.name || '', 
        roomNo: user?.roomNo || '', 
        dept: user?.dept || '',
        phone: user?.phone || '' // New Phone Field  
    });

    const getDueMonths = (joiningDate) => {
        const start = new Date(joiningDate);
        const end = new Date();
        const months = [];

        // Reset to the 1st of the joining month to avoid day-overflow errors
        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
        months.push(current.toLocaleString('default', { month: 'long', year: 'numeric' }));
        // Move to the next month
        current.setMonth(current.getMonth() + 1);
    }
        return months;
    };

    const allPossibleMonths = user?.createdAt 
    ? getDueMonths(user.createdAt) 
    : [];

    const unpaidMonths = allPossibleMonths.filter(month =>
        !history.find(p => p.month === month && (p.status === 'Success' || p.status === 'Pending'))
    );

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => { 
        setLoading(true);
        try {
            const [hRes, sRes, aRes, appRes] = await Promise.all([
                axios.get('http://https://messmate-backend.onrender.com/api/payment/my-history', config),
                axios.get('http://https://messmate-backend.onrender.com/api/settings'),
                axios.get('http://https://messmate-backend.onrender.com/api/mess/attendance/my', config),
                axios.get('http://https://messmate-backend.onrender.com/api/mess/applications/my', config)
            ]);
            setHistory(hRes.data);
            setSettings(sRes.data);
            setAttendance(aRes.data);
            setApplications(appRes.data);
        } catch (err) {
            toast.error("Failed to sync data with server");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
        const { data } = await axios.put('http://https://messmate-backend.onrender.com/api/auth/update-profile', profileForm, config);
        
        // 1. Update LocalStorage
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        
        // 2. IMPORTANT: Update the form state with the new data from server
        setProfileForm({
            name: data.user.name,
            phone: data.user.phone,
            roomNo: data.user.roomNo,
            dept: data.user.dept
        });

        toast.success("Profile Updated!");
    } catch (err) {
        toast.error("Update failed");
    }
    };

    const handlePay = async (month) => {
        setLoading(true);
        try {
            const { data } = await axios.post('http://https://messmate-backend.onrender.com/api/payment/create-order', { month }, config);
            const options = {
                key: data.key_id,
                amount: data.order.amount,
                currency: "INR",
                name: "MessMate Hostel",
                description: `Fees for ${month}`,
                order_id: data.order.id,
                handler: async (response) => {
                    await axios.post('http://https://messmate-backend.onrender.com/api/payment/verify-payment', {
                        ...response, amount: settings.feeAmount, month
                    }, config);
                    toast.success(`Payment successful for ${month}`);
                    fetchInitialData();
                },
                prefill: { name: user.name, email: user.email },
                theme: { color: "#0d6efd" }
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast.error(err.response?.data?.message || "Payment initiation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleAppSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://https://messmate-backend.onrender.com/api/mess/apply', appForm, config);
            toast.success("Application submitted successfully!");
            setAppForm({ type: 'Leave', startDate: '', endDate: '', subject: '', message: '' });
            fetchInitialData();
        } catch (err) {
            toast.error("Submission failed");
        }
    };

    // --- PROFESSIONALLY REDESIGNED RECEIPT ---
    const downloadReceipt = (pay) => {
        const doc = new jsPDF();
        
        // 1. Formal Border
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277);

        // 2. Hostel Branding Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 40, 60);
        doc.text("LDCN HOSTEL", 105, 30, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(80, 80, 80);
        doc.text("Dibrugarh University, Assam", 105, 38, { align: 'center' });
        
        doc.setDrawColor(0);
        doc.line(20, 45, 190, 45);

        // 3. Receipt Metadata
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("OFFICIAL FEE RECEIPT", 105, 60, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Receipt ID: ${pay._id.toUpperCase()}`, 20, 75);
        doc.text(`Date: ${new Date(pay.date).toLocaleDateString()}`, 150, 75);

        // 4. Student Information Box
        doc.setFillColor(245, 245, 245);
        doc.rect(20, 85, 170, 45, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("Student Name:", 25, 95);
        doc.text("Roll Number:", 25, 105);
        doc.text("Phone Number:", 25, 115);
        doc.text("Room / Dept:", 110, 95);
        doc.text("Payment Status:", 110, 105);
        
        doc.setFont("helvetica", "normal");
        doc.text(`${user.name}`, 55, 95);
        doc.text(`${user.rollNo}`, 55, 105);
        doc.text(`${user.phone || profileForm.phone || 'N/A'}`, 55, 115);
        doc.text(`${user.roomNo} / ${user.dept}`, 140, 95);
        doc.setTextColor(0, 128, 0); // Green for PAID
        doc.text("PAID", 140, 105);
        doc.setTextColor(0);

        // 5. Payment Table
        doc.setLineWidth(0.3);
        doc.line(20, 140, 190, 140);
        doc.setFont("helvetica", "bold");
        doc.text("Description", 25, 148);
        doc.text("Month", 100, 148);
        doc.text("Amount (INR)", 155, 148);
        doc.line(20, 153, 190, 153);

        doc.setFont("helvetica", "normal");
        doc.text("Monthly Mess Fees", 25, 163);
        doc.text(`${pay.month}`, 100, 163);
        doc.text(`${pay.amount}.00`, 165, 163);

        doc.line(20, 175, 190, 175);
        doc.setFont("helvetica", "bold");
        doc.text("NET TOTAL PAID", 100, 185);
        doc.text(`Rs. ${pay.amount}.00`, 155, 185);

        // 6. Signatures
        doc.setFont("courier", "italic");
        doc.setFontSize(14);
        doc.text("MessManager_LDCN", 150, 230); // Placeholder for sign
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.line(140, 233, 185, 233);
        doc.text("Mess Manager Signature", 145, 238);

        // 7. Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("This is a system-generated receipt for LDCN Hostel.", 105, 275, { align: 'center' });

        doc.save(`Receipt_LDCN_${pay.month.replace(" ", "_")}.pdf`);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <>
            <Navbar />
            <div className="container-fluid position-relative p-0 overflow-hidden">
                {/* Fixed Top Bar for Mobile */}
                <div className="d-md-none p-3 bg-white border-bottom d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{ zIndex: 1000 }}>
                    <span className="fw-bold text-primary">Student Dashboard</span>
                    <button className="btn btn-primary btn-sm" onClick={toggleSidebar}>
                        ☰ Menu
                    </button>
                </div>

                <div className="row g-0">
                    {/* SIDEBAR - Fixed Overlap */}
                    <div className={`col-md-2 bg-white vh-100 border-end shadow-sm sidebar-mobile ${isSidebarOpen ? 'show' : ''}`}>
                        {/* Internal Sidebar Header for Mobile Close */}
                        <div className="p-3 d-flex justify-content-between align-items-center border-bottom d-md-none bg-light">
                            <span className="fw-bold">Menu</span>
                            <button className="btn btn-outline-danger btn-sm" onClick={toggleSidebar}>✕ Close</button>
                        </div>
                        
                        <div className="p-3 pt-md-4">
                            <h5 className="fw-bold mb-4 text-primary d-none d-md-block px-2">MessMate</h5>
                            <div className="nav flex-column nav-pills gap-2">
                                <button className={`nav-link text-start ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => {setActiveTab('overview'); setIsSidebarOpen(false);}}>📊 Dashboard</button>
                                <button className={`nav-link text-start ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => {setActiveTab('attendance'); setIsSidebarOpen(false);}}>📅 Attendance</button>
                                <button className={`nav-link text-start ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => {setActiveTab('applications'); setIsSidebarOpen(false);}}>📝 Leave & Query</button>
                                <button className={`nav-link text-start ${activeTab === 'history' ? 'active' : ''}`} onClick={() => {setActiveTab('history'); setIsSidebarOpen(false);}}>📜 History</button>
                                <button className={`nav-link text-start ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => {setActiveTab('rules'); setIsSidebarOpen(false);}}>📜 Rules & Menu</button>
                                <button className={`nav-link text-start ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => {setActiveTab('profile'); setIsSidebarOpen(false);}}>👤 Profile</button>
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="col-md-10 p-3 p-md-4 bg-light overflow-auto content-area" style={{ height: '92vh' }}>
                        
                       {activeTab === 'overview' && (
                        <div className="row g-3 animate__animated animate__fadeIn">
                        {/* Welcome Header - Responsive text sizes */}
                        <div className="col-12 mb-2 mb-md-4 text-center text-md-start">
                            <h3 className="fw-bold display-6 display-md-5">Welcome, {user.name}!</h3>
                            <p className="text-muted">
                                <span className="badge bg-primary-subtle text-primary me-2">ID: {user.rollNo}</span>
                                <span className="badge bg-secondary-subtle text-secondary">{user.dept}</span>
                            </p>
                        </div>

                        {/* Conditional Rendering */}
                        {unpaidMonths.length > 0 ? (
                            unpaidMonths.map(month => (
                                <div key={month} className="col-12 col-sm-6 col-lg-4 mb-3">
                                    <div className="card border-0 shadow-sm border-start border-danger border-4 h-100 transition-hover">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <h5 className="fw-bold mb-0">{month}</h5>
                                                <span className="badge rounded-pill bg-danger-subtle text-danger small">Pending</span>
                                            </div>
                                            <p className="text-danger fs-4 fw-bold mb-4">₹{settings.feeAmount}</p>
                                            <button 
                                                disabled={loading} 
                                                onClick={() => handlePay(month)} 
                                                className="btn btn-primary w-100 py-2 fw-bold shadow-sm rounded-3"
                                            >
                                                {loading ? 'Processing...' : 'Pay Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            /* --- FULLY RESPONSIVE SUCCESS UI --- */
                            <div className="col-12">
                                <div className="card border-0 shadow-sm text-center p-4 p-md-5 border-top border-success border-4 rounded-4 bg-white mx-auto" style={{ maxWidth: '800px' }}>
                                    <div className="card-body py-2 py-md-4">
                                        {/* Inline SVG Success Icon - Guaranteed to show */}
                                        <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-4 shadow-sm" 
                                            style={{ width: 'clamp(80px, 15vw, 120px)', height: 'clamp(80px, 15vw, 120px)', backgroundColor: '#e9f7ef' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="60%" height="60%" fill="#198754" className="bi bi-check-lg" viewBox="0 0 16 16">
                                                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.42-6.446z"/>
                                            </svg>
                                        </div>
                                        
                                        <h2 className="fw-bold text-dark mb-2 h1-responsive">All Caught Up!</h2>
                                        <p className="text-muted fs-5 mb-4 px-2">
                                            Great job! You have cleared all your mess dues for **LDCN Hostel**. <br className="d-none d-md-block" />
                                            There are no pending payments at this time.
                                        </p>
                                        
                                        <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3">
                                            <span className="badge bg-success-subtle text-success px-4 py-3 rounded-pill border border-success border-opacity-25 fs-6 w-100 w-sm-auto">
                                                Current Balance: ₹0.00
                                            </span>
                                            <button onClick={() => setActiveTab('history')} className="btn btn-outline-secondary rounded-pill px-4 py-2 w-100 w-sm-auto">
                                                View History
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                            </div>
                        )}

                        {/* Profile section  */}
                        {activeTab === 'profile' && (
                            <div className="row justify-content-center animate__animated animate__fadeIn">
                                <div className="col-md-10 col-lg-8">
                                    <div className="card border-0 shadow-sm p-4">
                                        <h4 className="fw-bold mb-4">Edit Profile</h4>
                                        <form onSubmit={handleUpdateProfile}>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label small text-muted">Full Name</label>
                                                    <input type="text" className="form-control" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small text-muted">Phone Number</label>
                                                    <input type="text" className="form-control" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="Enter your phone number" required />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small text-muted">Room Number</label>
                                                    <input type="text" className="form-control" value={profileForm.roomNo} onChange={e => setProfileForm({...profileForm, roomNo: e.target.value})} required />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small text-muted">Department</label>
                                                    <input type="text" className="form-control" value={profileForm.dept} onChange={e => setProfileForm({...profileForm, dept: e.target.value})} required />
                                                </div>
                                                <div className="col-12 mt-4">
                                                    <button type="submit" className="btn btn-success px-4 py-2 fw-bold shadow-sm">Update My Details</button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Attendance Tab */}
                        {activeTab === 'attendance' && (
                            <div className="card border-0 shadow-sm p-3 p-md-4 animate__animated animate__fadeIn">
                                <h4 className="fw-bold mb-3">Meal Attendance</h4>
                                <div className="table-responsive">
                                    <table className="table table-bordered text-center align-middle">
                                        <thead className="table-dark">
                                            <tr><th>Date</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th></tr>
                                        </thead>
                                        <tbody>
                                            {attendance.map(record => (
                                                <tr key={record.date}>
                                                    <td>{record.date}</td>
                                                    <td>{record.meals.breakfast ? "✔️" : "❌"}</td>
                                                    <td>{record.meals.lunch ? "✔️" : "❌"}</td>
                                                    <td>{record.meals.dinner ? "✔️" : "❌"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Applications Tab */}
                        {activeTab === 'applications' && (
                            <div className="row animate__animated animate__fadeIn">
                                <div className="col-lg-6">
                                    <div className="card border-0 shadow-sm p-4 mb-4 h-100">
                                        <h4 className="fw-bold">New Application</h4>
                                        <form onSubmit={handleAppSubmit}>
                                            <select className="form-select mb-3" value={appForm.type} onChange={e => setAppForm({...appForm, type: e.target.value})}>
                                                <option value="Leave">Leave Request (No Food)</option>
                                                <option value="Query">Query / Question</option>
                                                <option value="Complaint">Complaint</option>
                                            </select>
                                            {appForm.type === 'Leave' && (
                                                <div className="row mb-3">
                                                    <div className="col-6"><label className="small">From</label><input type="date" className="form-control" onChange={e => setAppForm({...appForm, startDate: e.target.value})} /></div>
                                                    <div className="col-6"><label className="small">To</label><input type="date" className="form-control" onChange={e => setAppForm({...appForm, endDate: e.target.value})} /></div>
                                                </div>
                                            )}
                                            <input type="text" className="form-control mb-3" placeholder="Subject" value={appForm.subject} onChange={e => setAppForm({...appForm, subject: e.target.value})} />
                                            <textarea className="form-control mb-3" rows="3" placeholder="Message..." value={appForm.message} onChange={e => setAppForm({...appForm, message: e.target.value})}></textarea>
                                            <button className="btn btn-primary w-100">Submit Application</button>
                                        </form>
                                    </div>
                                </div>
                                <div className="col-lg-6 mt-4 mt-lg-0">
                                    <h4 className="fw-bold mb-3">Status of Requests</h4>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        {applications.map(app => (
                                            <div key={app._id} className="card border-0 shadow-sm mb-2 border-start border-4 border-primary">
                                                <div className="card-body p-3">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <h6 className="fw-bold mb-1">{app.subject}</h6>
                                                        <span className={`badge ${app.status === 'Approved' ? 'bg-success' : 'bg-warning text-dark'}`}>{app.status}</span>
                                                    </div>
                                                    <p className="small text-muted mb-2">{app.message}</p>
                                                    {app.adminReply && <div className="p-2 bg-light rounded"><p className="small text-primary mb-0 font-italic"><b>Admin Reply:</b> {app.adminReply}</p></div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <div className="card border-0 shadow-sm p-3 p-md-4 animate__animated animate__fadeIn">
                                <h4 className="fw-bold mb-3">My Payments</h4>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light"><tr><th>Month</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
                                        <tbody>
                                            {history.map(p => (
                                                <tr key={p._id}>
                                                    <td>{p.month}</td>
                                                    <td>₹{p.amount}</td>
                                                    <td><span className={`badge ${p.status==='Success'?'bg-success':'bg-warning text-dark'}`}>{p.status}</span></td>
                                                    <td>{p.status === 'Success' && <button onClick={() => downloadReceipt(p)} className="btn btn-sm btn-outline-dark">Download PDF</button>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                {activeTab === 'rules' && (
                <div className="card border-0 shadow-sm p-4 animate__animated animate__fadeIn">
                <h4 className="fw-bold text-primary mb-4">Official Hostel Mess Rules & Regulations</h4>
                <div className="row g-4">
                {/* Left Column: Meal Schedule & Fees */}
                <div className="col-md-5 border-end">
                    <div className="mb-4">
                        <h6 className="fw-bold text-dark"><i className="bi bi-clock-history me-2"></i>🕒 Meal Timings</h6>
                        <ul className="list-group list-group-flush small">
                            <li className="list-group-item d-flex justify-content-between"><span>Breakfast</span> <span className="fw-bold text-primary">08:30 AM - 09:30 AM</span></li>
                            <li className="list-group-item d-flex justify-content-between"><span>Lunch</span> <span className="fw-bold text-primary">12:00 PM - 02:00 PM</span></li>
                            <li className="list-group-item d-flex justify-content-between"><span>Dinner</span> <span className="fw-bold text-primary">08:30 PM - 09:30 PM</span></li>
                        </ul>
                    </div>
                
                <div className="p-3 bg-light rounded">
                    <h6 className="fw-bold text-dark"><i className="bi bi-currency-rupee me-2"></i>💰 Fee Payment Model</h6>
                    <p className="small mb-2 text-muted">Current Monthly Fee: <b className="text-dark">₹{settings.feeAmount}</b></p>
                    <table className="table table-sm table-bordered bg-white small mb-0">
                        <thead className="table-secondary">
                            <tr><th>Days in Mess</th><th>Amount to be Paid</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>25 days or more</td><td>Full Mess Dues</td></tr>
                            <tr><td>15 to 24 days</td><td>90% of Total Dues</td></tr>
                            <tr><td>Less than 15 days</td><td>50% of Total Dues</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column: General Regulations */}
            <div className="col-md-7">
                <h6 className="fw-bold text-dark"><i className="bi bi-journal-check me-2"></i>📜 General Regulations</h6>
                <div className="accordion accordion-flush small" id="rulesAccordion">
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#rule1">
                                Payment Deadlines
                            </button>
                        </h2>
                        <div id="rule1" className="accordion-collapse collapse show" data-bs-parent="#rulesAccordion">
                            <div className="accordion-body py-2 text-muted">
                                Dues must be deposited within the 10th of each calendar month. A relaxation of five days may be allowed by the Warden against a written application.
                            </div>
                        </div>
                    </div>
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#rule2">
                                Examination Clearance
                            </button>
                        </h2>
                        <div id="rule2" className="accordion-collapse collapse" data-bs-parent="#rulesAccordion">
                            <div className="accordion-body py-2 text-muted">
                                Clearance of Hostel Mess dues must be ensured before filling up the examination form.
                            </div>
                        </div>
                    </div>
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#rule3">
                                Cooking & Individual Items
                            </button>
                        </h2>
                        <div id="rule3" className="accordion-collapse collapse" data-bs-parent="#rulesAccordion">
                            <div className="accordion-body py-2 text-muted">
                                No boarder is allowed to cook his/her own individual item in the hostel mess.
                            </div>
                        </div>
                    </div>
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#rule4">
                                Leave & Refund Policy
                            </button>
                        </h2>
                        <div id="rule4" className="accordion-collapse collapse" data-bs-parent="#rulesAccordion">
                            <div className="accordion-body py-2 text-muted">
                                Caution money is refunded after adjustment of dues when a boarder leaves. For semester breaks (Jan/July), Rs. 100 per year is deducted for pipeline gas rental.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
)}
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .sidebar-mobile {
                        position: fixed;
                        top: 0;
                        left: -100%;
                        z-index: 1050;
                        transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        width: 280px !important;
                    }
                    .sidebar-mobile.show {
                        left: 0;
                    }
                    .content-area {
                        width: 100% !important;
                        flex: 0 0 100% !important;
                        max-width: 100% !important;
                    }
                }
                .nav-link { border-radius: 8px !important; margin: 0 5px; }
                .nav-link.active { background-color: #0d6efd !important; color: white !important; }
            `}</style>
        </>
    );
};

export default StudentDashboard;