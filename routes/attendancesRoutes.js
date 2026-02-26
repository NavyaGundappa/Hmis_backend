// routes/attendancesRoutes.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// --- CONSTANTS ---
const GENERAL_SHIFT_START_HOUR = 9;
const GENERAL_SHIFT_START_MINUTE_LATE = 10;
const REQUIRED_SHIFT_DURATION_MS = 8 * 60 * 60 * 1000;
const OFFICE_LOCATION_MAX_DISTANCE = 500;

// --- HELPER FUNCTIONS ---

// 1. Get current time in Indian Standard Time (IST) as "HH:mm" (24-hour format)
const getISTTime24 = () => {
    return new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
};

// 2. Get Start of Today in IST (kept from your original code)
const getStartOfToday = () => {
    const now = new Date();
    const istDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return new Date(`${istDateString}T00:00:00.000Z`);
};

// 3. Distance Calculation
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
}
function deg2rad(deg) { return deg * (Math.PI / 180); }

// 4. Shift Simulation
const getExpectedShiftTimes = (employeeId, isRotational) => {
    if (isRotational) {
        return { startHour: 13, startMinute: 0, lateMinute: 10 };
    } else {
        return { startHour: GENERAL_SHIFT_START_HOUR, startMinute: 0, lateMinute: GENERAL_SHIFT_START_MINUTE_LATE };
    }
};

// --- CONTROLLERS ---

const clockInController = async (req, res) => {
    const { employeeId, latitude, longitude } = req.body;

    try {
        const employee = await Employee.findOne({ employeeId });
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        // Validate Location
        if (!employee.latitude || !employee.longitude) {
            return res.status(400).json({ success: false, message: "Office location not set." });
        }
        const distance = getDistanceFromLatLonInMeters(latitude, longitude, employee.latitude, employee.longitude);
        if (distance > OFFICE_LOCATION_MAX_DISTANCE) {
            return res.status(400).json({ success: false, message: `You are out of location!` });
        }

        // Check for existing record
        const todayStart = getStartOfToday();
        let attendance = await Attendance.findOne({
            employeeId: employeeId,
            date: todayStart,
            logoutTime: { $exists: false }
        });

        if (attendance) {
            return res.status(400).json({ success: false, message: "Already clocked in today." });
        }

        // --- NEW LOGIC START ---

        // 1. Get Current IST Time string (e.g., "14:30")
        const currentISTTime = getISTTime24();

        // 2. Parse it to numbers for status check
        const [currentISTHour, currentISTMinute] = currentISTTime.split(':').map(Number);

        // 3. Determine Status
        const { startHour, lateMinute } = getExpectedShiftTimes(employeeId, employee.isRotational);
        let initialStatus = 'Present';
        if (currentISTHour > startHour || (currentISTHour === startHour && currentISTMinute > lateMinute)) {
            initialStatus = 'Late';
        }

        // 4. Save Record
        // We save 'loginTime' as the String "HH:mm" now.
        // NOTE: Ensure your Mongoose Schema for 'loginTime' allows String, or change this field name.
        const newAttendance = new Attendance({
            employeeId: employeeId,
            date: todayStart,     // Date Object (Midnight)
            loginTime: currentISTTime, // SAVES "HH:mm" (String)
            status: initialStatus,
            locationVerified: true
        });

        await newAttendance.save();
        // --- NEW LOGIC END ---

        res.json({
            success: true,
            message: `Clocked In Successfully. Status: ${initialStatus}`,
            loginTime: newAttendance.loginTime
        });

    } catch (error) {
        console.error("Clock-In Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const clockOutController = async (req, res) => {
    const { employeeId } = req.body;

    try {
        const today = getStartOfToday();

        // Find active record
        let attendance = await Attendance.findOne({
            employeeId: employeeId,
            date: { $gte: today },
            logoutTime: { $exists: false }
        });

        if (!attendance) {
            return res.status(404).json({ success: false, message: "No active clock-in record found." });
        }

        // --- NEW LOGIC START ---

        // 1. Get Clock Out time string
        const logoutTimeStr = getISTTime24();

        // 2. Calculate Duration (Complex because loginTime is now a String "HH:mm")

        // Parse the saved login string (e.g., "09:30")
        const [loginHours, loginMinutes] = attendance.loginTime.split(':').map(Number);

        // Create a proper Date object for Login Time using the record's date
        const loginDateObj = new Date(attendance.date);
        loginDateObj.setHours(loginHours, loginMinutes, 0, 0); // Set hours/mins to the stored IST time

        // Create a proper Date object for Logout Time (Now)
        // We use the same 'attendance.date' base to ensure calculation works for the same day
        // (Note: If shifts cross midnight, you need extra logic to add +1 day)
        const logoutDateObj = new Date(); // Current actual time object

        // Calculate difference
        const durationMs = logoutDateObj.getTime() - loginDateObj.getTime();
        const hoursWorked = durationMs / (1000 * 60 * 60);

        // --- NEW LOGIC END ---

        // Determine Status
        let finalStatus;
        if (durationMs >= REQUIRED_SHIFT_DURATION_MS) {
            finalStatus = attendance.status === 'Late' ? 'Late-Complete' : 'Present';
        } else {
            finalStatus = 'Absent';
        }

        // Update Record
        attendance.logoutTime = logoutTimeStr; // Save strict string "HH:mm"
        attendance.status = finalStatus;

        await attendance.save();

        res.json({
            success: true,
            message: `Clocked Out Successfully. Total Hours: ${hoursWorked.toFixed(2)}`,
            finalStatus: finalStatus
        });

    } catch (error) {
        console.error("Clock-Out Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// --- ROUTES ---
router.post('/clock-in', clockInController);
router.post('/clock-out', clockOutController);

module.exports = router;