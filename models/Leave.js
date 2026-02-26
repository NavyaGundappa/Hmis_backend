const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    employeeId: String,
    leaveType: String, // 'cl', 'sl', 'el', etc.
    fromDate: Date,
    toDate: Date,
    status: String, // 'approved', 'pending'
    reason: String
});

module.exports = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);