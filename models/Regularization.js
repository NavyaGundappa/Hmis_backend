const mongoose = require('mongoose');

const regularizationSchema = new mongoose.Schema({
    employeeId: String,
    date: Date,
    reason: String,
    requestType: String, // 'on_duty', etc.
    status: String // 'approved'
});

module.exports = mongoose.models.Regularization || mongoose.model('Regularization', regularizationSchema);