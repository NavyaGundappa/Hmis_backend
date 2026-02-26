const express = require('express');
const router = express.Router();
// IMPORTANT: Make sure the path to your controller is correct
const calendarController = require('../controllers/calendarController');

router.get('/data', calendarController.getCalendarSummary);

module.exports = router;