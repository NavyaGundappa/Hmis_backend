const mongoose = require('mongoose');

// You defined it here with a capital 'S'
const CompOffSchema = new mongoose.Schema({
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    days: { type: Number, default: 1 },
    reason: { type: String, required: true },
    workDate: { type: Date, required: true },
    awardedBy: { type: String, required: true },
    awardedDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    status: { type: String, default: 'active' }
}, { timestamps: true });

CompOffSchema.pre('save', function (next) {
    if (!this.expiryDate) {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        this.expiryDate = date;
    }
    next();
});

// CHANGE THIS LINE: Use CompOffSchema (matching the definition above)
module.exports = mongoose.models.CompOff || mongoose.model('CompOff', CompOffSchema);