const express = require('express');
const router = express.Router();
const CompOff = require('../models/compOff');

router.post('/apply', async (req, res) => {
    try {
        const { employeeId, employeeName, department, reason, workDate, awardedBy } = req.body;

        const newCompOff = new CompOff({
            employeeId,
            employeeName,
            department,
            reason,
            workDate: new Date(workDate),
            awardedBy
        });

        await newCompOff.save();
        res.status(201).json({ success: true, data: newCompOff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;