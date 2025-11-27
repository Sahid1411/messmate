import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('userInfo'));

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand" to="/">MessMate</Link>
                <div className="ml-auto">
                    {user ? (
                        <>
                            <span className="text-white me-3">Hi, {user.name}</span>
                            <button onClick={handleLogout} className="btn btn-outline-light btn-sm">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link className="btn btn-primary me-2" to="/login">Login</Link>
                            <Link className="btn btn-outline-light" to="/register">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;