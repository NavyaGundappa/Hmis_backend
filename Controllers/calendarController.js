const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const Leave = require('../models/Leave');
const Regularization = require('../models/Regularization');

// Helper to format date as YYYY-MM-DD
const formatDateKey = (date) => {
    // Since 'date' in your Attendance model is a Date object (midnight UTC),
    // we split the ISO string to get the date part.
    return date.toISOString().split('T')[0];
};

exports.getCalendarSummary = async (req, res) => {
    const { employeeId, month, year } = req.query;

    if (!employeeId || !month || !year) {
        return res.status(400).json({ success: false, message: "Missing params" });
    }

    try {
        // 1. Calculate Date Range for the requested month
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        // 2. Parallel Queries
        const [attendances, holidays, leaves, regularizations] = await Promise.all([
            Attendance.find({
                employeeId,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            Holiday.find({
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            Leave.find({
                employeeId,
                status: 'approved',
                $or: [
                    { fromDate: { $lte: endOfMonth }, toDate: { $gte: startOfMonth } }
                ]
            }),
            Regularization.find({
                employeeId,
                status: 'approved',
                date: { $gte: startOfMonth, $lte: endOfMonth }
            })
        ]);

        const calendarMap = {};

        // A. Process Holidays
        holidays.forEach(h => {
            const dateKey = formatDateKey(h.date);
            calendarMap[dateKey] = {
                type: 'Holiday',
                status: 'HOLIDAY', // CRITICAL: Frontend looks for this status
                color: '#9c27b0',
                title: h.name,
                details: h.description
            };
        });

        // B. Process Leaves
        leaves.forEach(l => {
            let current = new Date(l.fromDate);
            const end = new Date(l.toDate);
            while (current <= end) {
                if (current >= startOfMonth && current <= endOfMonth) {
                    const dateKey = formatDateKey(current);
                    let color = '#ff9800';
                    switch (l.leaveType.toLowerCase()) {
                        case 'cl': color = '#e67e22'; break;
                        case 'sl': color = '#e74c3c'; break;
                        case 'el': color = '#f1c40f'; break;
                        case 'ml': color = '#e91e63'; break;
                        case 'pl': color = '#3498db'; break;
                        case 'bl': color = '#95a5a6'; break;
                    }
                    calendarMap[dateKey] = {
                        type: 'Leave',
                        subType: l.leaveType.toUpperCase(),
                        color: color,
                        reason: l.reason,
                        status: 'Approved'
                    };
                }
                current.setDate(current.getDate() + 1);
            }
        });

        // C. Process Regularizations
        regularizations.forEach(r => {
            const dateKey = formatDateKey(r.date);
            calendarMap[dateKey] = {
                type: 'Regularization',
                subType: r.requestType,
                color: '#00bcd4',
                reason: r.reason,
                status: 'Approved'
            };
        });

        // D. Process Attendance (Updated for String loginTime/logoutTime)
        attendances.forEach(a => {
            const dateKey = formatDateKey(a.date);

            const existingEntry = calendarMap[dateKey];
            const isSpecialDate = existingEntry && (existingEntry.type === 'Holiday' || existingEntry.type === 'Leave');

            let color = '#f44336';
            if (a.status === 'Present' || a.status === 'Late-Complete') color = '#4caf50'; // Green
            if (a.status === 'Late') color = '#ffeb3b'; // Yellow

            calendarMap[dateKey] = {
                ...calendarMap[dateKey],
                // If status is 'Absent', keep the existing type (like Holiday/Leave), else mark 'Attendance'
                type: a.status === 'Absent' ? (calendarMap[dateKey]?.type || 'Absent') : 'Attendance',
                status: isSpecialDate ? existingEntry.status : a.status,
                color: isSpecialDate ? existingEntry.color : color,
                loginTime: a.loginTime,
                logoutTime: a.logoutTime,
                locationVerified: a.locationVerified
            };
        });

        res.json({ success: true, data: calendarMap });

    } catch (error) {
        console.error("Calendar Fetch Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};