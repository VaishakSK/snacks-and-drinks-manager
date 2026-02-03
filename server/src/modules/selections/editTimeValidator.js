/**
 * Time-based edit validation utility
 * Checks if selections can be edited based on cutoff times configured in .env
 */

// Parse HH:MM format to minutes since midnight
function parseTime(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
}

// Get cutoff times from environment variables (IST timezone)
const MORNING_CUTOFF = parseTime(process.env.MORNING_EDIT_CUTOFF || '11:20');
const EVENING_CUTOFF = parseTime(process.env.EVENING_EDIT_CUTOFF || '16:15');

/**
 * Check if editing is currently allowed for a given session
 * @param {string} session - 'morning' or 'evening'
 * @returns {boolean} - true if editing is allowed
 */
export function isEditAllowed(session) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    if (session === 'morning') {
        return MORNING_CUTOFF ? currentTime < MORNING_CUTOFF : true;
    } else if (session === 'evening') {
        return EVENING_CUTOFF ? currentTime < EVENING_CUTOFF : true;
    }

    return false;
}

/**
 * Get time restriction info for frontend
 * @returns {object} - { morningAllowed, eveningAllowed, morningCutoff, eveningCutoff }
 */
export function getEditRestrictions() {
    const morningAllowed = isEditAllowed('morning');
    const eveningAllowed = isEditAllowed('evening');

    return {
        morningAllowed,
        eveningAllowed,
        morningCutoff: process.env.MORNING_EDIT_CUTOFF || '11:20',
        eveningCutoff: process.env.EVENING_EDIT_CUTOFF || '16:15'
    };
}
