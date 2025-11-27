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
    const [activeTab, setActiveTab] = useState('overview'); 
    const [selectedMonth, setSelectedMonth] = useState('November 2025');
    
    const [settings, setSettings] = useState({ feeAmount: 2000, qrCodeUrl: '' });
    // New state for the file upload
    const [qrFile, setQrFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [payRes, studRes, setRes] = await Promise.all([
                axios.get('http://localhost:5000/api/payment/all', config),
                axios.get('http://localhost:5000/api/auth/students', config),
                axios.get('http://localhost:5000/api/settings')
            ]);
            setPayments(payRes.data);
            setStudents(studRes.data);
            setSettings(setRes.data);
        } catch (error) {
            toast.error("Error loading dashboard data");
        } finally {
            setLoading(false);
        }
    };

    // [UPDATED] Save Settings Handler (Uses FormData for Image Upload)
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('feeAmount', settings.feeAmount);
        if (qrFile) {
            formData.append('qrImage', qrFile);
        }

        try {
            const { data } = await axios.put('http://localhost:5000/api/settings', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data' // Required for files
                }
            });
            setSettings(data); // Update state with new URL
            toast.success("Settings & QR Updated!");
        } catch (error) {
            toast.error("Failed to update settings");
        }
    };

    const handleCashPayment = async (studentId) => {
        const amount = prompt("Enter Amount (Cash):", settings.feeAmount);
        if(!amount) return;
        try {
            await axios.post('http://localhost:5000/api/payment/record-cash', 
                { studentId, amount, month: selectedMonth }, config);
            toast.success("Cash Recorded");
            fetchData();
        } catch (error) { toast.error("Error recording payment"); }
    };

    // Data Processing
    const paidStudentIds = payments.filter(p => p.month === selectedMonth).map(p => p.studentId?._id);
    const defaulters = students.filter(student => !paidStudentIds.includes(student._id));
    const paidCount = paidStudentIds.length;
    const unpaidCount = defaulters.length;
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

    const chartData = {
        labels: ['Paid', 'Unpaid'],
        datasets: [{ data: [paidCount, unpaidCount], backgroundColor: ['#198754', '#dc3545'], borderWidth: 1 }]
    };

    if (loading && payments.length === 0) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary"></div></div>;


    // [NEW] Actions
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

    // Filter Pending Payments
    const pendingPayments = payments.filter(p => p.status === 'Pending');


    return (
        <>
            <Navbar />
            <div className="container py-5">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold">Admin Dashboard</h2>
                    <select className="form-select w-auto fw-bold text-primary border-primary" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                        <option>October 2025</option>
                        <option>November 2025</option>
                        <option>December 2025</option>
                    </select>
                </div>

                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'overview' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'students' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('students')}>Students</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'defaulters' ? 'active fw-bold text-danger' : 'text-danger'}`} onClick={() => setActiveTab('defaulters')}>Defaulters</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'settings' ? 'active fw-bold text-dark' : 'text-dark'}`} onClick={() => setActiveTab('settings')}>⚙️ Settings</button></li>
                </ul>

                {/* [NEW] PENDING APPROVALS ALERT */}
                {pendingPayments.length > 0 && (
                    <div className="alert alert-warning shadow-sm mb-4">
                        <h5 className="alert-heading fw-bold">⚠️ {pendingPayments.length} Pending Approvals</h5>
                        <p className="mb-0">Students have submitted manual payments. Please verify transaction IDs.</p>
                        
                        <div className="table-responsive mt-3 bg-white rounded p-2">
                            <table className="table table-sm mb-0">
                                <thead><tr><th>Student</th><th>Txn ID</th><th>Amount</th><th>Action</th></tr></thead>
                                <tbody>
                                    {pendingPayments.map(pay => (
                                        <tr key={pay._id}>
                                            <td>{pay.studentId?.name}</td>
                                            <td className="font-monospace text-primary">{pay.transactionId}</td>
                                            <td className="fw-bold">₹{pay.amount}</td>
                                            <td>
                                                <button onClick={() => handleApprove(pay._id)} className="btn btn-sm btn-success me-2">Approve</button>
                                                <button onClick={() => handleReject(pay._id)} className="btn btn-sm btn-outline-danger">Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="row">
                        <div className="col-md-4 mb-4">
                            <div className="card shadow-sm border-0 bg-primary text-white h-100">
                                <div className="card-body">
                                    <h5>Total Revenue</h5>
                                    <h2 className="display-4 fw-bold">₹{totalRevenue.toLocaleString()}</h2>
                                    <p>Lifetime collection</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 mb-4">
                            <div className="card shadow-sm border-0 h-100">
                                <div className="card-body text-center">
                                    <h5 className="text-muted mb-3">Status ({selectedMonth})</h5>
                                    <div style={{ maxHeight: '200px', display: 'flex', justifyContent: 'center' }}><Pie data={chartData} /></div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 mb-4">
                            <div className="card shadow-sm border-0 h-100">
                                <div className="card-body">
                                    <h5>Current Config</h5>
                                    <div className="mt-3">
                                        <h4>Fee: <span className="text-success">₹{settings.feeAmount}</span></h4>
                                        <div className="mt-2">
                                            <small className="text-muted">Active QR Code:</small><br/>
                                            {settings.qrCodeUrl ? <img src={settings.qrCodeUrl} width="60" alt="QR" className="border rounded" /> : <span className="badge bg-warning text-dark">No QR Uploaded</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* [UPDATED] STUDENTS TAB - SHOWS ALL DETAILS */}
                {activeTab === 'students' && (
                    <div className="card shadow border-0">
                        <div className="card-header bg-white py-3"><h5 className="mb-0">All Registered Students ({students.length})</h5></div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Dept</th>
                                        <th>Roll No</th>
                                        <th>Room No</th>  
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student._id}>
                                            <td className="fw-bold">{student.name}</td>
                                            <td className="text-muted small">{student.email}</td>
                                            <td><span className="badge bg-secondary">{student.dept || 'N/A'}</span></td>
                                            <td>{student.rollNo || '-'}</td>
                                            <td>{student.roomNo || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* [UPDATED] DEFAULTERS TAB - SHOWS DUE AMOUNT & MONTH */}
                {activeTab === 'defaulters' && (
                    <div className="card shadow border-0 border-start border-danger border-5">
                        <div className="card-header bg-danger text-white py-3">
                            <h5 className="mb-0">⚠️ Defaulters List - {selectedMonth}</h5>
                        </div>
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Dept</th>
                                        <th>Due Month</th>
                                        <th>Amount Due</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {defaulters.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-4">🎉 Everyone has paid!</td></tr>
                                    ) : (
                                        defaulters.map(student => (
                                            <tr key={student._id}>
                                                <td className="fw-bold text-danger">{student.name}</td>
                                                <td>{student.dept}</td>
                                                <td><span className="badge bg-warning text-dark">{selectedMonth}</span></td>
                                                <td className="fw-bold">₹{settings.feeAmount}</td>
                                                <td>
                                                    <button onClick={() => handleCashPayment(student._id)} className="btn btn-sm btn-outline-success">
                                                        Collect Cash
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

                {/* [UPDATED] SETTINGS TAB - FILE UPLOAD */}
                {activeTab === 'settings' && (
                    <div className="row justify-content-center">
                        <div className="col-md-6">
                            <div className="card shadow-lg border-0 rounded-3">
                                <div className="card-header bg-dark text-white py-3"><h5 className="mb-0">⚙️ System Settings</h5></div>
                                <div className="card-body p-4">
                                    <form onSubmit={handleSaveSettings}>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Mess Fee Amount (₹)</label>
                                            <input type="number" className="form-control" value={settings.feeAmount} onChange={(e) => setSettings({...settings, feeAmount: e.target.value})} required />
                                        </div>
                                        <div className="mb-4">
                                            <label className="form-label fw-bold">Upload New QR Code</label>
                                            <input 
                                                type="file" 
                                                className="form-control" 
                                                accept="image/*"
                                                onChange={(e) => setQrFile(e.target.files[0])}
                                            />
                                            <div className="form-text">Upload a generic UPI QR code image (jpg/png).</div>
                                            
                                            {/* Preview existing or new file */}
                                            <div className="mt-3 text-center p-3 bg-light rounded">
                                                <p className="small text-muted mb-2">Current QR Preview:</p>
                                                {qrFile ? (
                                                     // Show preview of newly selected file
                                                    <span className="text-success fw-bold">New file selected: {qrFile.name}</span>
                                                ) : settings.qrCodeUrl ? (
                                                    <img src={settings.qrCodeUrl} alt="Current QR" style={{ maxWidth: '200px' }} className="border rounded shadow-sm" />
                                                ) : (
                                                    <p className="text-muted">No QR Code uploaded yet.</p>
                                                )}
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold">Save Changes</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminDashboard;