const cron = require('node-cron');
const User = require('../models/User');

const initCronJobs = () => {

    // 1. MONTHLY TASK: Run at midnight on the 1st of every month
    // Updates MML and Accruals
    cron.schedule('0 0 1 * *', async () => {
        console.log('Running Monthly Leave Update...');
        const users = await User.find({});

        for (const user of users) {
            // A. Reset MML
            if (user.gender === 'Female') {
                user.leaveBalance.MML = 1; // Refill to 1 (expires previous balance effectively)
            }

            // B. Add Monthly Accruals (If you want to add every month instead of calculating total from DOJ)
            // If you use this, do NOT use the "multiply by months" logic in the generation route continuously.
            user.leaveBalance.EL += 1.75;
            user.leaveBalance.CL += 0.83;
            user.leaveBalance.SL += 0.75;

            await user.save();
        }
    });

    // 2. YEARLY TASK: Run at midnight on Jan 1st
    // Expires CL and SL
    cron.schedule('0 0 1 1 *', async () => {
        console.log('Running Yearly Leave Reset...');
        const users = await User.find({});

        for (const user of users) {
            // Reset CL and SL to 0 (or carry over logic if needed)
            user.leaveBalance.CL = 0;
            user.leaveBalance.SL = 0;
            // EL usually carries over, so we don't reset it

            await user.save();
        }
    });
};

module.exports = initCronJobs;