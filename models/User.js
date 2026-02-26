const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    dateOfJoining: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] }, // Needed for MML/ML/PL logic

    // --- ADD THIS SECTION ---
    leaveBalance: {
        EL: { type: Number, default: 0 }, // Earned Leave (Accumulates)
        CL: { type: Number, default: 0 }, // Casual Leave (Resets yearly)
        SL: { type: Number, default: 0 }, // Sick Leave (Resets yearly)
        MML: { type: Number, default: 0 }, // Menstruation Leave (Resets monthly)
        ML: { type: Number, default: 182 }, // Maternity Leave (Fixed pot)
        PL: { type: Number, default: 5 },   // Paternity Leave (Fixed pot)
        BL: { type: Number, default: 5 }    // Bereavement Leave (Fixed pot)
    }
    // ------------------------
});

module.exports = mongoose.model('User', userSchema);