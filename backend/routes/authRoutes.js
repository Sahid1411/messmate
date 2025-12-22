// routes/authRoutes.js
const express = require('express');

// 1. UPDATE THIS LINE: Use { } to extract the functions from the object
const { protect, admin } = require('../middleware/authMiddleware'); 

// 2. Import your controller functions
const { register, login, getAllStudents, deleteUser,updateProfile } = require('../controllers/authController');

const router = express.Router();
 
router.post('/register', register);
router.post('/login', login);
router.put('/update-profile', protect, updateProfile);
router.get('/students', protect, admin, getAllStudents); 
router.delete('/student/:id', protect, admin, deleteUser); 
module.exports = router; 