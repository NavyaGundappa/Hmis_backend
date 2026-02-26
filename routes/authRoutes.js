// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// POST /hmis/login
router.post('/login', async (req, res) => {
    const { employeeId, password } = req.body;

    try {
        // 1. Find User by ID
        const user = await Employee.findOne({ employeeId: employeeId });
        if (!user) {
            // Use generic message for security
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 2. Validate Password (Simplified for example; USE BCRYPT in production!)
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Check for First Time Login (Password is the default "12345")
        if (user.password === "12345") {
            return res.json({
                status: "success",
                action: "RESET_PASSWORD", // App redirects to ResetPasswordScreen
                userId: user._id.toString() // Use Mongoose _id for secure lookup later
            });
        }

        // 4. Designation-Based Dashboard Routing
        // Check if the designation string contains the word "manager" (case-insensitive)
        if (user.designation && user.designation.toLowerCase().includes("manager")) {
            return res.json({
                status: "success",
                action: "MANAGER_DASHBOARD",
                employeeId: user.employeeId,
                name: user.name,
                department: user.department
            });
        } else {
            // All other employees
            return res.json({
                status: "success",
                action: "EMPLOYEE_DASHBOARD",
                employeeId: user.employeeId,
                name: user.name,
                department: user.department
            });
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Server error during login." });
    }
});

// POST /hmis/reset-password
router.post('/reset-password', async (req, res) => {
    const { userId, newPassword } = req.body;

    // Basic validation
    if (!userId || !newPassword) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    try {
        // 1. Find and Update the employee's password
        // In production, you would HASH newPassword before saving
        const updatedUser = await Employee.findByIdAndUpdate(
            userId,
            { password: newPassword }, // Save the new password
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        // 2. Respond with success
        res.json({ status: "success", message: "Password updated successfully." });
    } catch (error) {
        console.error("Password Reset Error:", error);
        return res.status(500).json({ message: "Server error during password reset." });
    }
});

module.exports = router;