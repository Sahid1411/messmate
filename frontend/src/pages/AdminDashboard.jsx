import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import toast from 'react-hot-toast'; 

ChartJS.register(ArcElement, Tooltip, Legend);

const AdminDashboard = () => {
    const [payments, setPayments] = useState([]);
    const [students, setStudents] = useState([]);
    const [applications, setApplications] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]); // New state for visual marking
    const [activeTab, setActiveTab] = useState('overview'); 
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]); 
    const [settings, setSettings] = useState({ feeAmount: 2000 }); // QR code state removed
    const [loading, setLoading] = useState(false);

    const [replyData, setReplyData] = useState({ id: '', text: '', status: 'Approved' });

    // Add this near your other useState hooks
    const [deleteModal, setDeleteModal] = useState({ show: false, id: '', name: '' });

    // PROFESSIONAL MODAL STATE FOR CASH PAYMENTS
    const [cashModal, setCashModal] = useState({ show: false, studentId: '', name: '', amount: 2000 });

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const getDropdownMonths = () => {
        const months = [];
        for (let i = -2; i <= 1; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() + i);
            months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
        }
        return months;
    };

    // Fetch core dashboard data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [payRes, studRes, setRes, appRes] = await Promise.all([
                axios.get('http://localhost:5000/api/payment/all', config),
                axios.get('http://localhost:5000/api/auth/students', config),
                axios.get('http://localhost:5000/api/settings'),
                axios.get('http://localhost:5000/api/mess/applications', config)
            ]);
            setPayments(payRes.data);
            setStudents(studRes.data);
            setSettings(setRes.data);
            setApplications(appRes.data);
        } catch (error) {
            toast.error("Error loading dashboard data");
        } finally {
            setLoading(false);
        }
    };

    // New: Fetch attendance for specific date to show marked/unmarked status
    const fetchAttendance = async () => {
        try {
            const { data } = await axios.get(`http://localhost:5000/api/mess/attendance?date=${attendanceDate}`, config);
            setAttendanceRecords(data);
        } catch (error) {
            console.error("Attendance fetch error");
        }
    };

    useEffect(() => { 
        fetchData(); 
    }, []);

    // Trigger attendance fetch whenever the date changes
    useEffect(() => {
        fetchAttendance();
    }, [attendanceDate]);

    const handleMarkAttendance = async (studentId, mealType) => {
        try {
            await axios.post('http://localhost:5000/api/mess/attendance/mark', {
                studentId,
                date: attendanceDate,
                mealType
            }, config);
            fetchAttendance(); // Refresh visual state immediately
            toast.success("Attendance Updated");
        } catch (error) {
            toast.error("Failed to mark attendance");
        }
    };

    const handleAppReply = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:5000/api/mess/applications/${replyData.id}`, {
                status: replyData.status,
                adminReply: replyData.text
            }, config);
            toast.success("Response sent!");
            setReplyData({ id: '', text: '', status: 'Approved' });
            fetchData();
        } catch (error) {
            toast.error("Error sending response");
        }
    };

    // Updated: Simple JSON update without QR code logic
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.put(
                'http://localhost:5000/api/settings', 
                { feeAmount: settings.feeAmount }, 
                config
            );
            setSettings(data);
            toast.success("Mess Fee Updated Successfully!");
        } catch (error) { 
            toast.error("Failed to update fee"); 
        }
    };

    // NEW PROFESSIONAL CASH PAYMENT CONFIRMATION
    const handleConfirmCashPayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/payment/record-cash', { 
                studentId: cashModal.studentId, 
                amount: cashModal.amount, 
                month: selectedMonth 
            }, config);
            toast.success(`₹${cashModal.amount} Cash Recorded for ${cashModal.name}`);
            setCashModal({ show: false, studentId: '', name: '', amount: 2000 }); // Close Modal
            fetchData();
        } catch (error) { toast.error("Error recording payment"); }
    };

    // Keep original trigger logic but change to open modal
    const handleCashPayment = (studentId, name) => {
        setCashModal({
            show: true,
            studentId,
            name,
            amount: settings.feeAmount
        });
    };

    const handleApprove = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/payment/approve/${id}`, {}, config);
            toast.success("Payment Approved!");
            fetchData();
        } catch (error) { toast.error("Error approving"); }
    };

    const handleReject = async (id) => {
        if(window.confirm("Reject and remove this payment request?")) {
            try {
                await axios.delete(`http://localhost:5000/api/payment/reject/${id}`, config);
                toast.error("Payment Rejected");
                fetchData();
            } catch (error) { toast.error("Error rejecting"); }
        }
    };
   
    // Helper to convert "Month Year" string to a comparable date (1st of that month)
    const getSelectedMonthDate = (monthStr) => {
        const [month, year] = monthStr.split(' ');
    return new Date(Date.parse(`${month} 1, ${year}`));
    };

    const selectedDate = getSelectedMonthDate(selectedMonth);

    // Data Processing with Joining Date Check
    const paidStudentIds = payments
        .filter(p => p.month === selectedMonth && p.status === 'Success')
        .map(p => p.studentId?._id || p.studentId);

    const defaulters = students.filter(student => {
        // 1. Check if already paid
        const hasPaid = paidStudentIds.includes(student._id);
        
        // 2. Check if the student had joined by this month
        const joinDate = new Date(student.createdAt);
        const joiningMonthDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);

        const wasJoined = joiningMonthDate <= selectedDate;

        // Only a defaulter if joined but NOT paid
        return wasJoined && !hasPaid;
    });


        // function to delete a student

        // Step A: Just open the modal
        const confirmDelete = (id, name) => { 
            setDeleteModal({ show: true, id, name });
        };

        // Step B: The actual API call
        const handleFinalDelete = async () => {
            try {
                await axios.delete(`http://localhost:5000/api/auth/student/${deleteModal.id}`, config);
                toast.success(`${deleteModal.name} removed successfully`);
                setDeleteModal({ show: false, id: '', name: '' }); // Close box
                fetchData(); // Refresh list
            } catch (error) {
                toast.error("Failed to remove student");
            }
        };
    
    // UPDATED: ROLLING 3-MONTH REVENUE LOGIC
    const totalRevenue = payments.reduce((acc, curr) => {
        const paymentDate = new Date(curr.createdAt || curr.date);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (curr.status === 'Success' && paymentDate >= threeMonthsAgo) {
            return acc + curr.amount;
        }
        return acc;
    }, 0);

    const chartData = {
        labels: ['Paid', 'Unpaid'],
        datasets: [{ data: [paidStudentIds.length, defaulters.length], backgroundColor: ['#198754', '#dc3545'], borderWidth: 1 }]
    };

    if (loading && payments.length === 0) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary"></div></div>;

    const pendingPayments = payments.filter(p => p.status === 'Pending');


    return (
        <>
            <Navbar />
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold">Admin Dashboard</h2>
                    <select 
                        className="form-select w-auto fw-bold text-primary border-primary shadow-sm" 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        {getDropdownMonths().map(month => (
                            <option key={month} value={month}>{month}</option>
                        ))}
                    </select>
                </div>

                <ul className="nav nav-tabs mb-4 border-0">
                    <li className="nav-item"><button className={`nav-link border-0 ${activeTab === 'overview' ? 'active fw-bold text-primary border-bottom border-primary border-3' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button></li>
                    <li className="nav-item"><button className={`nav-link border-0 ${activeTab === 'attendance' ? 'active fw-bold text-success border-bottom border-success border-3' : 'text-success'}`} onClick={() => setActiveTab('attendance')}>📅 Attendance</button></li>
                    <li className="nav-item"><button className={`nav-link border-0 ${activeTab === 'applications' ? 'active fw-bold text-warning border-bottom border-warning border-3' : 'text-warning'}`} onClick={() => setActiveTab('applications')}>📩 Applications</button></li>
                    <li className="nav-item"><button className={`nav-link border-0 ${activeTab === 'students' ? 'active fw-bold text-dark border-bottom border-dark border-3' : 'text-dark'}`} onClick={() => setActiveTab('students')}>Students</button></li>
                    <li className="nav-item"><button className={`nav-link border-0 ${activeTab === 'defaulters' ? 'active fw-bold text-danger border-bottom border-danger border-3' : 'text-danger'}`} onClick={() => setActiveTab('defaulters')}>Defaulters</button></li>
                    <li className="nav-item"><button className={`nav-link border-0 ${activeTab === 'settings' ? 'active fw-bold text-secondary border-bottom border-secondary border-3' : 'text-secondary'}`} onClick={() => setActiveTab('settings')}>⚙️ Settings</button></li>
                </ul>

                {pendingPayments.length > 0 && activeTab === 'overview' && (
                    <div className="alert alert-warning shadow-sm mb-4 border-0 border-start border-4 border-warning">
                        <h5 className="alert-heading fw-bold">⚠️ {pendingPayments.length} Pending Approvals</h5>
                        <div className="table-responsive mt-3 bg-white rounded-3 p-2">
                            <table className="table table-sm mb-0 align-middle">
                                <thead><tr><th>Student</th><th>Txn ID</th><th>Amount</th><th>Action</th></tr></thead>
                                <tbody>
                                    {pendingPayments.map(pay => (
                                        <tr key={pay._id}>
                                            <td>{pay.studentId?.name}</td>
                                            <td className="font-monospace text-primary">{pay.transactionId}</td>
                                            <td className="fw-bold">₹{pay.amount}</td>
                                            <td>
                                                <button onClick={() => handleApprove(pay._id)} className="btn btn-sm btn-success me-2 rounded-pill px-3">Approve</button>
                                                <button onClick={() => handleReject(pay._id)} className="btn btn-sm btn-outline-danger rounded-pill px-3">Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="row g-4 animate__animated animate__fadeIn">
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 bg-primary text-white h-100 rounded-4">
                                <div className="card-body p-4">
                                    <h6 className="text-white-50 uppercase small fw-bold mb-3">Total Revenue (Last 3 Months)</h6>
                                    <h2 className="display-5 fw-bold mb-0">₹{totalRevenue.toLocaleString()}</h2>
                                    <div className="mt-3 small opacity-75">Based on confirmed successful transactions</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 text-center">
                            <div className="card shadow-sm border-0 h-100 p-3 rounded-4">
                                <h6 className="text-muted mb-3 fw-bold uppercase small">Status: {selectedMonth}</h6>
                                <div style={{ maxHeight: '180px', display: 'flex', justifyContent: 'center' }}><Pie data={chartData} /></div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 h-100 p-4 rounded-4">
                                <h6 className="text-muted mb-3 fw-bold uppercase small">Quick Metrics</h6>
                                <div className="d-flex justify-content-between mb-2"><span>Total Boarders:</span> <span className="fw-bold text-primary">{students.length}</span></div>
                                <div className="d-flex justify-content-between mb-2"><span>Pending Verification:</span> <span className="fw-bold text-warning">{pendingPayments.length}</span></div>
                                <div className="d-flex justify-content-between"><span>Active Applications:</span> <span className="fw-bold text-danger">{applications.filter(a => a.status === 'Pending').length}</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="card shadow-sm border-0 p-4 rounded-4 animate__animated animate__fadeIn">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                            <div>
                                <h5 className="fw-bold mb-1 text-success">Daily Attendance Logger</h5>
                                <p className="text-muted small mb-0">Toggle buttons to mark/unmark meals for the selected date</p>
                            </div>
                            <input type="date" className="form-control w-auto shadow-sm" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                        </div>
                        <div className="table-responsive">
                            <table className="table align-middle table-hover">
                                <thead className="table-light">
                                    <tr className="small uppercase text-muted">
                                        <th>Student</th>
                                        <th>Room</th>
                                        <th className="text-center">Breakfast</th>
                                        <th className="text-center">Lunch</th>
                                        <th className="text-center">Dinner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(s => {
                                        const record = attendanceRecords.find(r => (r.studentId?._id || r.studentId) === s._id);
                                        const isMarked = (type) => record?.meals?.[type] === true;
                                        
                                        return (
                                            <tr key={s._id}>
                                                <td><div className="fw-bold">{s.name}</div><div className="x-small text-muted">{s.rollNo}</div></td>
                                                <td><span className="badge bg-light text-dark border">{s.roomNo}</span></td>
                                                {['breakfast', 'lunch', 'dinner'].map(meal => (
                                                    <td key={meal} className="text-center">
                                                        <button 
                                                            onClick={() => handleMarkAttendance(s._id, meal)} 
                                                            className={`btn btn-sm rounded-pill px-3 transition-all ${isMarked(meal) ? 'btn-success shadow-sm' : 'btn-outline-secondary opacity-50'}`}
                                                            style={{ minWidth: '85px' }}
                                                        >
                                                            {isMarked(meal) ? '✓ Marked' : 'Mark'}
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'applications' && (
                    <div className="row animate__animated animate__fadeIn">
                        <div className="col-12">
                            <h5 className="fw-bold mb-4 text-warning">Leave & Query Inbox</h5>
                            {applications.length === 0 ? <div className="text-center py-5 bg-light rounded-4">No applications found.</div> : (
                                applications.map(app => (
                                    <div key={app._id} className={`card shadow-sm mb-3 border-0 border-start border-4 rounded-3 ${app.status === 'Pending' ? 'border-warning' : 'border-success'}`}>
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 className="fw-bold mb-1">{app.studentId?.name} <span className="badge bg-light text-dark ms-2 border">{app.type}</span></h6>
                                                    <div className="text-muted small mb-3">Room {app.studentId?.roomNo} | Submitted: {new Date(app.createdAt).toLocaleDateString()}</div>
                                                </div>
                                                <span className={`badge rounded-pill ${app.status === 'Pending' ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}`}>{app.status}</span>
                                            </div>
                                            <p className="mb-3"><strong>{app.subject}</strong>: {app.message}</p>
                                            {app.status === 'Pending' ? (
                                                <button className="btn btn-sm btn-primary rounded-pill px-4" onClick={() => setReplyData({ ...replyData, id: app._id })}>Reply & Resolve</button>
                                            ) : (
                                                <div className="p-3 bg-light rounded-3 small border-start border-success border-3">
                                                    <div className="fw-bold text-success mb-1">Admin Response:</div>
                                                    {app.adminReply}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {replyData.id && (
                            <div className="modal show d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <div className="modal-dialog modal-dialog-centered">
                                    <div className="modal-content border-0 shadow-lg rounded-4">
                                        <div className="modal-body p-4">
                                            <h5 className="fw-bold mb-4">Respond to Student</h5>
                                            <form onSubmit={handleAppReply}>
                                                <label className="small fw-bold text-muted mb-1">Set Status</label>
                                                <select className="form-select mb-3 rounded-3" value={replyData.status} onChange={e => setReplyData({...replyData, status: e.target.value})}>
                                                    <option value="Approved">Approve / Acknowledge</option>
                                                    <option value="Rejected">Reject</option>
                                                </select>
                                                <label className="small fw-bold text-muted mb-1">Reply Message</label>
                                                <textarea className="form-control mb-4 rounded-3" rows="4" placeholder="Instruction or feedback for student..." value={replyData.text} onChange={e => setReplyData({...replyData, text: e.target.value})} required></textarea>
                                                <div className="d-flex gap-2">
                                                    <button className="btn btn-success w-100 py-2 fw-bold rounded-3">Send Response</button>
                                                    <button type="button" className="btn btn-light w-100 py-2 fw-bold rounded-3" onClick={() => setReplyData({ id: '', text: '', status: 'Approved' })}>Cancel</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                <div className="card shadow-sm border-0 rounded-4 animate__animated animate__fadeIn">
                    <div className="card-header bg-white py-4 border-0 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold">Active Boarder Directory</h5>
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3">{students.length} Total</span>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small uppercase">
                                {/* Added Action header */}
                                <tr><th>Name</th><th>Email/Phone</th><th>Department</th><th>Roll No</th><th>Room</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student._id}>
                                        <td className="fw-bold text-dark">{student.name}</td>
                                        <td><div className="small">{student.email}</div><div className="x-small text-muted">{student.phone}</div></td>
                                        <td><span className="badge bg-secondary-subtle text-secondary border-0 px-3">{student.dept}</span></td>
                                        <td>{student.rollNo}</td>
                                        <td><span className="badge bg-light text-dark border">{student.roomNo}</span></td>
                                        {/* Added Delete Button */}
                                        <td>
                                           <button 
                                            onClick={() => confirmDelete(student._id, student.name)} 
                                            className="btn btn-sm btn-outline-danger rounded-pill transition-all"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {activeTab === 'defaulters' && (
                    <div className="card shadow-sm border-0 border-top border-danger border-4 rounded-4 animate__animated animate__fadeIn">
                        <div className="card-header bg-white py-4 border-0">
                            <h5 className="mb-0 fw-bold text-danger">⚠️ Defaulters List: {selectedMonth}</h5>
                            <p className="text-muted small mb-0">Students who haven't paid as per LDCN Rule 17(c)</p>
                        </div>
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead className="small uppercase text-muted">
                                    <tr><th>Student</th><th>Department</th><th>Due Amount</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                    {defaulters.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center py-5 text-success fw-bold">🎉 No pending dues for this month!</td></tr>
                                    ) : (
                                        defaulters.map(student => (
                                            <tr key={student._id}>
                                                <td className="fw-bold">{student.name}</td>
                                                <td>{student.dept}</td>
                                                <td className="fw-bold text-danger">₹{settings.feeAmount}</td>
                                                <td>
                                                    <button 
                                                        onClick={() => handleCashPayment(student._id, student.name)} 
                                                        className="btn btn-sm btn-outline-success rounded-pill px-3"
                                                    >
                                                        Log Cash Payment
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="row justify-content-center animate__animated animate__fadeIn">
                        <div className="col-md-5">
                            <div className="card shadow border-0 rounded-4">
                                <div className="card-header bg-dark text-white py-4 rounded-top-4">
                                    <h5 className="mb-0 text-center fw-bold">⚙️ Financial Settings</h5>
                                </div>
                                <div className="card-body p-5">
                                    <form onSubmit={handleSaveSettings}>
                                        <div className="mb-4">
                                            <label className="form-label fw-bold text-muted small uppercase mb-2">
                                                Standard Mess Fee (₹)
                                            </label>
                                            <div className="input-group input-group-lg shadow-sm">
                                                <span className="input-group-text bg-white border-end-0 text-muted">₹</span>
                                                <input 
                                                    type="number" 
                                                    className="form-control fw-bold border-start-0 ps-0" 
                                                    value={settings.feeAmount} 
                                                    onChange={(e) => setSettings({...settings, feeAmount: e.target.value})} 
                                                    required 
                                                />
                                            </div>
                                            <div className="form-text mt-3 p-3 bg-warning-subtle text-warning rounded-3 small">
                                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                This global amount dictates the "Pay Now" value for all students. Update with caution.
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm mt-2 transition-all">
                                            Update Fee Amount
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PROFESSIONAL CASH PAYMENT MODAL */}
            {cashModal.show && (
                <div className="modal show d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header border-0 bg-success text-white">
                                <h5 className="modal-title fw-bold">Record Cash Payment</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setCashModal({...cashModal, show: false})}></button>
                            </div>
                            <form onSubmit={handleConfirmCashPayment}>
                                <div className="modal-body p-4 text-center">
                                    <p className="text-muted small">Confirming offline payment for <strong>{selectedMonth}</strong></p>
                                    <h4 className="fw-bold text-dark">{cashModal.name}</h4>
                                    <div className="mt-4">
                                        <label className="small fw-bold text-muted d-block mb-2">Amount Received (₹)</label>
                                        <input 
                                            type="number" 
                                            className="form-control form-control-lg fw-bold text-center border-success" 
                                            value={cashModal.amount} 
                                            onChange={(e) => setCashModal({...cashModal, amount: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 p-3">
                                    <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setCashModal({...cashModal, show: false})}>Cancel</button>
                                    <button type="submit" className="btn btn-success rounded-pill px-4 fw-bold shadow-sm">Save & Confirm</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .transition-all { transition: all 0.2s ease; }
                .x-small { font-size: 0.75rem; }
                .uppercase { text-transform: uppercase; letter-spacing: 1px; }
                .rounded-4 { border-radius: 1rem !important; }
                .nav-link:hover { opacity: 0.8; }
                .transition-all:hover { transform: translateY(-2px); }
            `}</style>

            {/* PROFESSIONAL DELETE CONFIRMATION MODAL */}
            {deleteModal.show && (
                <div className="modal show d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header bg-danger text-white border-0">
                                <h5 className="modal-title fw-bold">Confirm Removal</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteModal({ ...deleteModal, show: false })}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <div className="mb-3 text-danger">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="currentColor" className="bi bi-exclamation-octagon" viewBox="0 0 16 16">
                                        <path d="M4.54.146A.5.5 0 0 1 4.893 0h6.214a.5.5 0 0 1 .353.146l4.394 4.394a.5.5 0 0 1 .146.353v6.214a.5.5 0 0 1-.146.353l-4.394 4.394a.5.5 0 0 1-.353.146H4.893a.5.5 0 0 1-.353-.146L.146 11.46A.5.5 0 0 1 0 11.107V4.893a.5.5 0 0 1 .146-.353L4.54.146zM5.1 1 1 5.1v5.8L5.1 15h5.8l4.1-4.1V5.1L10.9 1H5.1z"/>
                                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                                    </svg>
                                </div>
                                <h4 className="fw-bold">Are you sure?</h4>
                                <p className="text-muted mb-0">You are about to remove <strong>{deleteModal.name}</strong> from the LDCN Hostel records.</p>
                                <p className="small text-danger mt-2">This action cannot be undone. All attendance and application history will be purged.</p>
                            </div>
                            <div className="modal-footer border-0 p-3 bg-light">
                                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setDeleteModal({ ...deleteModal, show: false })}>Cancel</button>
                                <button type="button" className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={handleFinalDelete}>Yes, Remove Permanently</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminDashboard;