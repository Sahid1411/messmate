const Attendance = require('../models/attendance');
const Application = require('../models/application');

// --- ATTENDANCE ---

// FIXED: Admin fetches all records for a specific date
exports.getAdminAttendanceByDate = async (req, res) => {
    try {
        const records = await Attendance.find({ date: req.query.date });
        res.json(records);
    } catch (error) { 
        res.status(500).json({ message: "Server Error fetching attendance" }); 
    }
};

exports.markAttendance = async (req, res) => {
    const { studentId, date, mealType } = req.body; 
    try {
        let record = await Attendance.findOne({ studentId, date });
        
        if (!record) {
            record = new Attendance({ 
                studentId, 
                date, 
                meals: { [mealType]: true } 
            });
        } else {
            // Toggle Logic
            const currentStatus = record.meals[mealType] || false;
            record.meals[mealType] = !currentStatus;
            
            // CRITICAL FIX: Tell Mongoose to save the nested object change
            record.markModified('meals');
        }
        
        await record.save();
        res.json(record);
    } catch (error) { 
        res.status(500).json({ message: "Attendance error" }); 
    }
};

exports.getStudentAttendance = async (req, res) => {
    try {
        const data = await Attendance.find({ studentId: req.user.id });
        res.json(data);
    } catch (error) { 
        res.status(500).json({ message: "Attendance fetch error" }); 
    }
};

// --- LEAVE & QUERY APPLICATIONS ---

exports.submitApplication = async (req, res) => {
    try {
        const { type, startDate, endDate, message, subject } = req.body;
        const app = await Application.create({
            studentId: req.user.id,
            type, startDate, endDate, message, subject
        });
        res.status(201).json(app);
    } catch (error) { 
        res.status(500).json({ message: "Application failed" }); 
    }
};

exports.getStudentApplications = async (req, res) => {
    try {
        const apps = await Application.find({ studentId: req.user.id }).sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) { 
        res.status(500).json({ message: "Error fetching applications" }); 
    }
};

exports.getAdminApplications = async (req, res) => {
    try {
        const apps = await Application.find().populate('studentId', 'name roomNo rollNo').sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) { 
        res.status(500).json({ message: "Admin fetch error" }); 
    }
};

exports.respondToApplication = async (req, res) => {
    const { status, adminReply } = req.body;
    try {
        const app = await Application.findByIdAndUpdate(
            req.params.id, 
            { status, adminReply }, 
            { new: true }
        );
        if (!app) return res.status(404).json({ message: "Application not found" });
        res.json(app);
    } catch (error) { 
        res.status(500).json({ message: "Error responding to application" }); 
    }
};  