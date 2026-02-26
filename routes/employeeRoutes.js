const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Route to get full profile by Employee ID
router.get('/profile/:empId', async (req, res) => {
    try {
        const employee = await mongoose.connection.db.collection('employees').findOne({
            employeeId: req.params.empId
        });

        if (!employee) return res.status(404).json({ message: "Not found" });
        res.json(employee);
    } catch (err) {
        res.status(500).json(err);
    }
});

// --- NEW ROUTE: Get details for Dashboard/Celebration Widget ---
router.get('/details/:employeeId', async (req, res) => {
    const { employeeId } = req.params;

    try {
        const employee = await mongoose.connection.db.collection('employees').findOne(
            { employeeId: employeeId },
            {
                projection: {
                    date_of_birth: 1,
                    date_of_joining: 1,
                    _id: 0 // Optional: Exclude _id if not needed
                }
            }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found."
            });
        }

        // Backend Response Structure for Frontend
        res.json({
            success: true,
            employee: {
                dob: employee.date_of_birth,
                doj: employee.date_of_joining,
            }
        });

    } catch (err) {
        console.error("Database query error:", err);
        // Respond with a generic 500 error and internal error details
        res.status(500).json({
            success: false,
            message: 'Server error retrieving employee details.',
            error: err.message
        });
    }
});


module.exports = router;