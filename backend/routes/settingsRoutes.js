const express = require('express');
const Settings = require('../models/settings');
const protect = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// [NEW] Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/'); // Save files in 'backend/uploads' folder
    },
    filename(req, file, cb) {
        // Rename file to 'qr-code.png' (or jpg) to avoid duplicates, or use timestamp
        cb(null, `qr-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
});

// Get Settings
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({ feeAmount: 2000, qrCodeUrl: '' });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings" });
    }
});

// Update Settings (Supports Text AND File)
router.put('/', protect, upload.single('qrImage'), async (req, res) => {
    const { feeAmount } = req.body;
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({ feeAmount });
        } else {
            settings.feeAmount = feeAmount;
        }

        // If a new file is uploaded, update the URL
        if (req.file) {
            // Store the path accessible by frontend
            settings.qrCodeUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Error updating settings" });
    }
});

module.exports = router;