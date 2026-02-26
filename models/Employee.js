// models/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    designation: { type: String, required: true },
    department: { type: String },
    password: { type: String, required: true },
    status: { type: String, default: 'active' },
    // >>> These two fields MUST be added and populated in your database <<<
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false }
});

module.exports = mongoose.model('Employee', EmployeeSchema);