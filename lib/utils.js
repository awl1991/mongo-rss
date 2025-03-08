/**
 * Utility functions for the headlines application
 */

/**
 * Format a date string to Central Time (CST) with a user-friendly format
 * This function works on both server and client side
 * @param {string} dtString - ISO date string to format
 * @returns {string} Formatted date string in Central Time with CST label
 */
function formatDatetimeToCentral(dtString) {
    try {
        // Create a new date object from the input string
        const dt = new Date(dtString);
        
        // Create options for date formatting
        const options = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
            timeZone: "America/Chicago" // Explicitly set to Central Time
        };
        
        // Format the date according to Central Time
        const formattedTime = dt.toLocaleString("en-US", options).replace(/ 0(\d)/, " $1");
        
        // Add CST label to the end
        return `${formattedTime} CST`;
    } catch (e) {
        console.error("Error formatting time:", e);
        return dtString;
    }
}

/**
 * Check if a headline is new (published within the last 30 minutes)
 * @param {string} pubTimeIso - ISO date string of publication time
 * @returns {boolean} Whether the headline is new
 */
function isNewHeadline(pubTimeIso) {
    return (new Date() - new Date(pubTimeIso)) / 1000 < 1800; // 30 minutes
}

/**
 * Create a retention date for the data retention policy
 * @param {number} daysToKeep - Number of days of data to keep
 * @returns {string} ISO date string for the retention threshold
 */
function getRetentionDate(daysToKeep = 7) {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - daysToKeep);
    return retentionDate.toISOString();
}

// Export all functions using CommonJS syntax
module.exports = {
    formatDatetimeToCentral,
    isNewHeadline,
    getRetentionDate
};