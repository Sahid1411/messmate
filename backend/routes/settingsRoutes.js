const express = require('express');
const Settings = require('../models/settings');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router(); 

// Get Settings
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({ feeAmount: 2000 });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings" });
    }
});

// Update Fee Amount (JSON Only)
router.put('/', protect, admin, async (req, res) => {
    const { feeAmount } = req.body;
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({ feeAmount });
        } else {
            settings.feeAmount = feeAmount;
        }

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Error updating fee" });
    }
});

module.exports = router;