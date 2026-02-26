const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    dateString: String, // "YYYY-MM-DD"
    name: String,
    description: String,
    year: Number
});

module.exports = mongoose.model('Holiday', holidaySchema);