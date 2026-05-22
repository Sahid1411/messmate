import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'student', 
        dept: '', 
        roomNo: '', 
        rollNo: '', 
        phone: '' 
    });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form Validation Logic
    const validateForm = () => {
        const { name, email, password, phone, role, dept, rollNo, roomNo } = formData;

        if (name.length < 3) {
            toast.error("Name must be at least 3 characters long.");
            return false;
        }

        // Basic Email Regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address.");
            return false;
        }

        // Phone Number: Exactly 10 digits
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            toast.error("Phone number must be exactly 10 digits.");
            return false;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return false;
        }

        // Conditional validation for students
        if (role === 'student') {
            if (!dept || !rollNo || !roomNo) {
                toast.error("Please fill all student-specific fields.");
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Trigger validation before API call
        if (!validateForm()) return;

        setLoading(true);
        try {
            await axios.post('https://messmate-backend-kj4h.onrender.com/api/auth/register', formData);
            toast.success('Registration Successful! Please Login.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error Registering User');
        } finally {
            setLoading(false);
        }
    };

    // Helper to only allow numbers in phone field
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
        if (value.length <= 10) { // Limit to 10 characters
            setFormData({ ...formData, phone: value });
        }
    };

    return (
        <>
            <Navbar />
            <div className="container mt-5 mb-5">
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card shadow-lg border-0 rounded-3">
                            <div className="card-body p-4">
                                <h3 className="text-center fw-bold mb-4">Create Account</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Full Name</label>
                                            <input 
                                                className="form-control" 
                                                value={formData.name} 
                                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                                required 
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Email</label>
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                value={formData.email} 
                                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Phone Number (10 Digits)</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={formData.phone} 
                                            placeholder="Enter 10 digit number" 
                                            onChange={handlePhoneChange} 
                                            required 
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Password</label>
                                        <input 
                                            className="form-control" 
                                            type="password" 
                                            value={formData.password} 
                                            placeholder="Min 6 characters"
                                            onChange={e => setFormData({...formData, password: e.target.value})} 
                                            required 
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Role</label>
                                        <select 
                                            className="form-select" 
                                            value={formData.role} 
                                            onChange={e => setFormData({...formData, role: e.target.value})}
                                        >
                                            <option value="student">Student</option>
                                            <option value="admin">Admin (Mess Owner)</option>
                                        </select>
                                        {formData.role === 'admin' && (
                                            <small className="text-danger d-block">Note: Only one admin account is allowed.</small>
                                        )}
                                    </div>

                                    {formData.role === 'student' && (
                                        <>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">Department</label>
                                                    <input 
                                                        className="form-control" 
                                                        value={formData.dept} 
                                                        onChange={e => setFormData({...formData, dept: e.target.value})} 
                                                        required 
                                                    />
                                                </div>
                                                <div className="col-md-6 mb-3">
                                                    <label className="form-label">Roll Number</label>
                                                    <input 
                                                        className="form-control" 
                                                        value={formData.rollNo} 
                                                        onChange={e => setFormData({...formData, rollNo: e.target.value})} 
                                                        required 
                                                    />
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Room Number</label>
                                                <input 
                                                    className="form-control" 
                                                    value={formData.roomNo} 
                                                    onChange={e => setFormData({...formData, roomNo: e.target.value})} 
                                                    required 
                                                />
                                            </div>
                                        </>
                                    )}

                                    <button disabled={loading} className="btn btn-success w-100 py-2 fw-bold mt-2">
                                        {loading ? 'Creating...' : 'Register'}
                                    </button>
                                </form>
                                <p className="mt-3 text-center">
                                    Already registered? <Link to="/login">Login here</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;