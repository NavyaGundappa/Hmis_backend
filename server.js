// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- 1. IMPORT ROUTES ---
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendancesRoutes');
const calendarRoutes = require('./routes/calendarRoutes'); // Ensure this file exists in /routes
const leaveRoutes = require('./routes/leaveRoutes');
const compOffRoutes = require('./routes/compOffRoutes');
const approvalRoutes = require('./routes/approvalRoutes');

// --- 2. INITIALIZE APP ---
const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// --- 3. MIDDLEWARE ---
app.use(cors()); // Fixes the "cors" error
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 4. MOUNT ROUTES ---
app.use('/hmis/attendance', attendanceRoutes);
app.use('/hmis/calendar', calendarRoutes); // Calendar endpoint
app.use('/hmis/leaves', leaveRoutes);
app.use('/hmis', authRoutes);
app.use('/hmis/compoff', compOffRoutes);
app.use('/hmis/approvals', approvalRoutes);


// --- 5. DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        // Start server only after DB is connected
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://192.168.50.105:${PORT}`);
        });
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));