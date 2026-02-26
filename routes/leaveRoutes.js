// leaveRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// 1. IMPORT the robust leave calculation utility
// You must ensure this file exists at '../utils/leaveCalculator.js' 
// and contains the advanced logic (15th cutoff, accrual loops, etc.)
const { calculateLeaveBalance } = require('../utils/leaveCalculator');

// ===============================================
// 1. MODELS (Fixed to match your DB)
// ===============================================

// FIX: Map the 'User' model to the 'employees' collection 
// The third argument, 'employees', forces Mongoose to use your collection name.
const userSchema = new mongoose.Schema({
    employeeId: { type: String, unique: true },
    name: String,
    fullName: String,   // Added based on your data dump
    department: String,
    sex: String,        // Added based on your data dump ("Female")
    gender: String,     // Fallback field
    dateOfJoining: Date,
}, {
    strict: false, // Allows other fields in your DB (like aadhaarNumber) to be ignored in the schema
});

const User = mongoose.models.User || mongoose.model('User', userSchema, 'employees');

// Leave Model/Schema
const Leave = mongoose.models.Leave || mongoose.model('Leave', new mongoose.Schema({
    employeeId: String,
    employeeName: String,
    department: String,
    leaveType: String,
    fromDate: Date,
    toDate: Date,
    totalDays: Number,
    reason: String,
    description: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    appliedDate: Date,
}));

// Regularization Model/Schema
const Regularization = mongoose.models.Regularization || mongoose.model('Regularization', new mongoose.Schema({
    employeeId: String,
    date: Date,
    requestType: String,
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    submittedAt: Date
}));


// ===============================================
// 2. LEAVE CONFIGURATION (No longer needed here, removed simple helpers)
// Configuration and logic are now exclusively in calculateLeaveBalance.
// ===============================================

// ===============================================
// 3. ROUTES
// ===============================================

/**
 * GET /hmis/leaves/balances/:employeeId
 * Calculates and returns the current leave balances (Accrued - Used).
 */
router.get('/balances/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;

        // 1. Fetch Employee Details (Date of Joining, Gender)
        // This queries the 'employees' collection due to the model fix above.
        const user = await User.findOne({ employeeId: employeeId });

        if (!user) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Determine Gender (Prioritize 'sex' from your DB dump)
        const gender = user.sex || user.gender || 'Male';

        // 2. Fetch APPROVED Leaves Taken (Used Leaves)
        const leavesTakenAgg = await Leave.aggregate([
            {
                $match: {
                    employeeId: employeeId,
                    status: 'approved' // Only deduct approved leaves
                }
            },
            {
                $group: {
                    _id: '$leaveType', // e.g., 'CL', 'EL'
                    total: { $sum: '$totalDays' } // Sum up the total days used
                }
            }
        ]);

        // Convert aggregation array to object map: { 'EL': 5, 'CL': 2 }
        const usedLeaves = {};
        leavesTakenAgg.forEach(item => {
            if (item._id) usedLeaves[item._id.toUpperCase()] = item.total;
        });

        // 3. Calculate Balance using the external, robust utility
        const balances = calculateLeaveBalance(
            user.dateOfJoining,
            gender,
            usedLeaves
        );

        // 4. Respond to Frontend
        res.status(200).json({
            employeeId: user.employeeId,
            name: user.fullName || user.name,
            gender: gender,
            dateOfJoining: user.dateOfJoining,
            leaveBalance: balances
        });

    } catch (error) {
        console.error('Error fetching balances:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


/**
 * POST /hmis/leaves/apply
 * Submits a new leave application. (Kept original logic)
 */
router.post('/apply', async (req, res) => {
    try {
        const { employeeId, employeeName, department, leaveType, fromDate, toDate, totalDays, reason, description } = req.body;

        if (!employeeId || !leaveType || !fromDate || !totalDays) {
            return res.status(400).json({ message: 'Missing required fields for leave application.' });
        }

        const newLeave = new Leave({
            employeeId,
            employeeName,
            department,
            leaveType: leaveType.toUpperCase(),
            fromDate: new Date(fromDate),
            toDate: new Date(toDate || fromDate),
            totalDays,
            reason: reason || 'N/A',
            description,
            status: 'pending',
            appliedDate: new Date(),
        });

        await newLeave.save();

        res.status(201).json({
            message: `Leave application for ${totalDays} day(s) submitted successfully. Waiting for approval.`
        });

    } catch (error) {
        console.error('Error submitting leave:', error);
        res.status(500).json({ message: 'Server error submitting leave application.' });
    }
});


/**
 * POST /hmis/leaves/regularize
 * Submits a new regularization request. (Kept original logic)
 */
router.post('/regularize', async (req, res) => {
    try {
        const { employeeId, date, requestType, reason } = req.body;

        if (!employeeId || !date || !requestType || !reason) {
            return res.status(400).json({ message: 'Missing required fields for regularization request.' });
        }

        const newRegularization = new Regularization({
            employeeId,
            date: new Date(date),
            requestType,
            reason,
            status: 'pending',
            submittedAt: new Date(),
        });

        await newRegularization.save();

        res.status(201).json({
            message: `Regularization request for ${requestType.replace('_', ' ')} submitted successfully. Waiting for approval.`
        });

    } catch (error) {
        console.error('Error submitting regularization:', error);
        res.status(500).json({ message: 'Server error submitting regularization request.' });
    }
});

module.exports = router;