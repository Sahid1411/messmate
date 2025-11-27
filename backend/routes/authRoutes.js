const express = require('express');
// 1. IMPORT protect middleware
const protect = require('../middleware/authMiddleware');

// 2. IMPORT the new controller functions (getAllStudents, deleteUser)
const { register, login, getAllStudents, deleteUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// [NEW] Admin Only Routes
router.get('/students', protect, getAllStudents); // Now 'protect' and 'getAllStudents' are defined
router.delete('/student/:id', protect, deleteUser); // Now 'deleteUser' is defined

module.exports = router;