// models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    // Employee ID to link the record
    employeeId: {
        type: String,
        required: true,
    },

    // Date of attendance (Midnight UTC representing the day)
    date: {
        type: Date,
        required: true
    },

    // CHANGED: type is String to store "HH:mm" (e.g., "15:42")
    loginTime: {
        type: String,
        required: true
    },

    // CHANGED: type is String and fixed the 'required' syntax
    logoutTime: {
        type: String,
        required: false // Note: 'required' is a property, not a Type
    },

    // Status (e.g., Present, Absent)
    status: {
        type: String,
        enum: ['Present', 'Complete', 'Late', 'Absent', 'Late-Complete', 'leave'],
        default: 'Present'
    },

    // Confirmation that location was within geofence
    locationVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Attendance', AttendanceSchema);