const User = require('../models/user');
const bcrypt = require('bcryptjs');
const Application = require('../models/application');
const Attendance = require('../models/attendance');   
const jwt = require('jsonwebtoken');

// Register User
exports.register = async (req, res) => {
    const { name, email, password, role, rollNo, dept,phone, roomNo } = req.body;
    try {
        // 1. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // 2. [NEW] SINGLE ADMIN CHECK
        if (role === 'admin') {
            const adminExists = await User.findOne({ role: 'admin' });
            if (adminExists) {
                return res.status(400).json({ message: 'An Admin already exists. Only one admin is allowed.' });
            }
        }

        // 3. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create user
        await User.create({
            name, email, password: hashedPassword, role, rollNo, dept, phone, roomNo
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login User
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({ 
                token, 
                user: { id: user._id, name: user.name, role: user.role, dept: user.dept, roomNo: user.roomNo, rollNo: user.rollNo,phone: user.phone || '',createdAt: user.createdAt } 
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all students
exports.getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const studentId = req.params.id;
        
        await User.findByIdAndDelete(studentId);
        
        await Application.deleteMany({ studentId: studentId });
        await Attendance.deleteMany({ studentId: studentId });

        res.json({ message: 'Student and all related records removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
 
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, roomNo, dept } = req.body;

        // Find user and update
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { name, phone, roomNo, dept }, 
            { new: true, runValidators: true }
        ).select('-password'); // Don't return the password

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ 
            message: "Profile updated successfully", 
            user // Sending back the updated user to update frontend localStorage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error during profile update" });
    }
};