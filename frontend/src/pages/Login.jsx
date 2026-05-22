import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast'; // Import Toast

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('https://messmate-backend-kj4h.onrender.com/api/auth/login', { email, password });
            
            // Save info
            localStorage.setItem('userInfo', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            
            toast.success(`Welcome back, ${data.user.name}!`); // Success Toast

            if(data.user.role === 'admin') navigate('/admin-dashboard');
            else navigate('/student-dashboard');
            
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid Email or Password'); // Error Toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <Navbar />
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow-lg border-0 rounded-3">
                        <div className="card-body p-5">
                            <h3 className="text-center fw-bold mb-4">Login</h3>
                            <form onSubmit={handleLogin}>
                                <div className="mb-3">
                                    <label className="form-label">Email Address</label>
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Password</label>
                                    <input 
                                        type="password" 
                                        className="form-control" 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <button disabled={loading} type="submit" className="btn btn-primary w-100 py-2 fw-bold">
                                    {loading ? 'Logging in...' : 'Login'}
                                </button>
                            </form>
                            <p className="mt-3 text-center">
                                Don't have an account? <Link to="/register">Register here</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default Login;