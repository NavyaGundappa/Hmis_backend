// utils/leaveCalculator.js

/**
 * Constants for Leave Configuration
 */
const LEAVE_RATES = {
    // Full accrual rate (DOJ <= 15th) | Half accrual rate (DOJ > 15th)
    EL: { full: 1.75, half: 0.87, cap: 45 },
    CL: { full: 0.83, half: 0.41 },
    SL: { full: 0.75, half: 0.37 },

    // Fixed Annual/Monthly Grants
    MML_MONTHLY: 1,
    ML_YEARLY: 182,
    PL_YEARLY: 5,
    BL_YEARLY: 5
};

/**
 * Calculates current leave balances dynamically based on DOJ and rules.
 * * @param {Date} doj - Employee's Date of Joining
 * @param {String} gender - 'Male', 'Female', or 'Other'
 * @param {Object} usedLeaves - Object containing total used leaves { EL: 2, CL: 1 ... }
 * @returns {Object} Final available leave balances
 */
const calculateLeaveBalance = (doj, gender, usedLeaves = {}) => {
    const now = new Date();
    const dojDate = new Date(doj);
    const normalizedGender = gender ? gender.toLowerCase() : 'male';
    const currentYear = now.getFullYear();

    // Initialize Accrued Totals
    let accrued = {
        EL: 0,
        CL: 0,
        SL: 0,
        MML: 0, // Calculated separately
        ML: 0,  // Fixed yearly
        PL: 0,  // Fixed yearly
        BL: 0   // Fixed yearly
    };

    // --- 1. Calculate EL (Lifetime Accumulation) ---
    // EL carries forward, so we iterate from DOJ to the current month.
    let iterDateEL = new Date(dojDate);
    // Set to first day of joining month to simplify iteration loop
    iterDateEL.setDate(1);

    while (iterDateEL <= now) {
        const iterYear = iterDateEL.getFullYear();
        const iterMonth = iterDateEL.getMonth();

        // Determine if this is the Joining Month
        const isJoiningMonth = (iterYear === dojDate.getFullYear() && iterMonth === dojDate.getMonth());

        // Stop calculation if we are in a future month
        if (iterDateEL > now) break;

        if (isJoiningMonth) {
            // Rule: If joined after 15th, add Half accrual rate. Else Full.
            if (dojDate.getDate() > 15) {
                accrued.EL += LEAVE_RATES.EL.half;
            } else {
                accrued.EL += LEAVE_RATES.EL.full;
            }
        } else {
            // Standard Month accrual
            accrued.EL += LEAVE_RATES.EL.full;
        }

        // Move to the first day of the next month
        iterDateEL.setMonth(iterDateEL.getMonth() + 1);
    }

    // Apply EL Cap (max of 45)
    if (accrued.EL > LEAVE_RATES.EL.cap) {
        accrued.EL = LEAVE_RATES.EL.cap;
    }


    // --- 2. Calculate CL & SL (Current Year Only) ---
    // CL and SL reset yearly, so calculation starts from Jan 1st of Current Year 
    // OR DOJ, whichever is later.
    let startCalcDate = new Date(currentYear, 0, 1); // Jan 1st this year
    if (dojDate > startCalcDate) {
        startCalcDate = new Date(dojDate); // If joined this year, start from DOJ
    }

    let iterDateYearly = new Date(startCalcDate);
    iterDateYearly.setDate(1); // Normalize to start of month

    while (iterDateYearly <= now) {
        const iterYear = iterDateYearly.getFullYear();
        const iterMonth = iterDateYearly.getMonth();

        // Ensure we only count months >= DOJ month
        if (iterYear === dojDate.getFullYear() && iterMonth < dojDate.getMonth()) {
            iterDateYearly.setMonth(iterDateYearly.getMonth() + 1);
            continue;
        }

        const isJoiningMonth = (iterYear === dojDate.getFullYear() && iterMonth === dojDate.getMonth());

        if (isJoiningMonth) {
            // Rule: Apply half or full for the joining month
            if (dojDate.getDate() > 15) {
                accrued.CL += LEAVE_RATES.CL.half;
                accrued.SL += LEAVE_RATES.SL.half;
            } else {
                accrued.CL += LEAVE_RATES.CL.full;
                accrued.SL += LEAVE_RATES.SL.full;
            }
        } else {
            // Standard Full accrual for CL and SL
            accrued.CL += LEAVE_RATES.CL.full;
            accrued.SL += LEAVE_RATES.SL.full;
        }

        iterDateYearly.setMonth(iterDateYearly.getMonth() + 1);
    }

    // --- 3. Apply Fixed Grants (Gender-Specific) ---
    // If employee is active in the current year, they get the full fixed quota.
    accrued.BL = LEAVE_RATES.BL_YEARLY; // Bereavement Leave is universal

    if (normalizedGender === 'female') {
        accrued.ML = LEAVE_RATES.ML_YEARLY;
        accrued.MML = LEAVE_RATES.MML_MONTHLY; // MML resets to 1 at start of month
        accrued.PL = 0;
    } else {
        accrued.PL = LEAVE_RATES.PL_YEARLY;
        accrued.ML = 0;
        accrued.MML = 0;
    }

    // --- 4. Deduct Used Leaves and Finalize ---

    // Calculate Final Balance (Accrued - Used)
    const finalBalance = {
        // Use toFixed(2) for precision, then parseFloat to maintain number type
        EL: parseFloat((accrued.EL - (usedLeaves.EL || 0)).toFixed(2)),
        CL: parseFloat((accrued.CL - (usedLeaves.CL || 0)).toFixed(2)),
        SL: parseFloat((accrued.SL - (usedLeaves.SL || 0)).toFixed(2)),
        MML: parseFloat((accrued.MML - (usedLeaves.MML || 0)).toFixed(2)),
        ML: parseFloat((accrued.ML - (usedLeaves.ML || 0)).toFixed(2)),
        PL: parseFloat((accrued.PL - (usedLeaves.PL || 0)).toFixed(2)),
        BL: parseFloat((accrued.BL - (usedLeaves.BL || 0)).toFixed(2)),
    };

    // Ensure no negative balances are returned
    Object.keys(finalBalance).forEach(key => {
        if (finalBalance[key] < 0) finalBalance[key] = 0;
    });

    return finalBalance;
};

module.exports = { calculateLeaveBalance };