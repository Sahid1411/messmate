// routes/messRoutes.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

const { 
    markAttendance, 
    submitApplication, 
    getAdminApplications, 
    getStudentApplications,
    respondToApplication,
    getAdminAttendanceByDate, // [ADDED] Moved logic here
    getStudentAttendance      // [ADDED] Enabled for students
} = require('../controllers/messController');

// --- ATTENDANCE ---
router.post('/attendance/mark', protect, admin, markAttendance); 
router.get('/attendance/my', protect, getStudentAttendance); // [ENABLED]
router.get('/attendance', protect, admin, getAdminAttendanceByDate); // [FIXED] No inline logic

// --- APPLICATIONS ---
router.post('/apply', protect, submitApplication);
router.get('/applications/my', protect, getStudentApplications); 
router.get('/applications', protect, admin, getAdminApplications); 
router.put('/applications/:id', protect, admin, respondToApplication);

module.exports = router;