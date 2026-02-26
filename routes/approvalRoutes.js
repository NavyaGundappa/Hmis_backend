const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const CompOff = require('../models/CompOff');
const Regularization = require('../models/Regularization');
const Employee = require('../models/Employee'); // NEW: Required to find subordinates

// 1. FOR EMPLOYEES: Keep your existing route to see personal request status
router.get('/pending-approvals/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const [leaves, compOffs, regularizations] = await Promise.all([
            Leave.find({ employeeId }),
            CompOff.find({ employeeId }),
            Regularization.find({ employeeId })
        ]);

        const combined = [
            ...leaves.map(item => ({ id: item._id, type: 'Leave', subType: item.leaveType, date: item.fromDate, status: item.status, reason: item.reason })),
            ...compOffs.map(item => ({ id: item._id, type: 'Comp Off', subType: 'N/A', date: item.workDate, status: item.status, reason: item.reason })),
            ...regularizations.map(item => ({ id: item._id, type: 'Regularization', subType: 'N/A', date: item.fromDate, status: item.status, reason: item.reason }))
        ];
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ success: true, data: combined });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. FOR MANAGERS: Fetch all pending requests from their team
router.get('/manager-team-requests/:managerName', async (req, res) => {
    try {
        const { managerName } = req.params;

        // Step A: Find all employees where reportingManager1 matches the manager's name
        const subordinates = await Employee.find({ reportingManager1: managerName }).select('employeeId name');
        const subordinateIds = subordinates.map(emp => emp.employeeId);

        // Step B: Fetch only "pending" requests for those employee IDs
        const [leaves, compOffs, regularizations] = await Promise.all([
            Leave.find({ employeeId: { $in: subordinateIds }, status: 'pending' }).lean(),
            CompOff.find({ employeeId: { $in: subordinateIds }, status: 'pending' }).lean(),
            Regularization.find({ employeeId: { $in: subordinateIds }, status: 'pending' }).lean()
        ]);

        // Step C: Combine and label for the notification dropdown
        const notifications = [
            ...leaves.map(item => ({ ...item, requestId: item._id, category: 'Leave', title: 'Leave Request' })),
            ...compOffs.map(item => ({ ...item, requestId: item._id, category: 'Comp Off', title: 'Comp-Off Request' })),
            ...regularizations.map(item => ({ ...item, requestId: item._id, category: 'Regularization', title: 'Regularization Request' }))
        ];

        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. ACTION ROUTE: Accept or Reject a request
router.post('/respond-to-request', async (req, res) => {
    const { requestId, category, status, adminRemarks } = req.body;
    let Model;

    // Determine which table to update
    if (category === 'Leave') Model = Leave;
    else if (category === 'Comp Off') Model = CompOff;
    else if (category === 'Regularization') Model = Regularization;

    try {
        // Update the status and add the manager's reason/description
        const updatedRequest = await Model.findByIdAndUpdate(
            requestId,
            {
                status: status,          // 'approved' or 'rejected'
                adminRemarks: adminRemarks // This stores the description you write
            },
            { new: true }
        );

        res.json({ success: true, message: `Request ${status} successfully.`, data: updatedRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;