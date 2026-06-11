/**
 * Date Utilities
 * 
 * Helpers for parsing and formatting dates from WhatsApp exports.
 */

/**
 * Parse a date string from various WhatsApp formats into a Date object
 * @param {string} dateStr - Date portion of the WhatsApp line
 * @param {string} timeStr - Time portion of the WhatsApp line
 * @param {string} ampm - AM/PM indicator (null for 24h format)
 * @returns {Date|null}
 */
function parseWhatsAppDate(dateStr, timeStr, ampm) {
  try {
    // Clean inputs
    dateStr = dateStr.trim();
    timeStr = timeStr.trim();

    // Parse date parts (handle both / and - separators)
    const dateParts = dateStr.split(/[\/\-\.]/);
    if (dateParts.length < 3) return null;

    let day, month, year;

    // Detect format based on value ranges
    const p0 = parseInt(dateParts[0]);
    const p1 = parseInt(dateParts[1]);

    if (p0 > 12) {
      // DD/MM/YYYY format (day > 12 means first part is day)
      day = p0;
      month = p1 - 1; // JS months are 0-indexed
      year = parseInt(dateParts[2]);
    } else if (p1 > 12) {
      // MM/DD/YYYY format (second part > 12 means it's day)
      month = p0 - 1;
      day = p1;
      year = parseInt(dateParts[2]);
    } else {
      // Ambiguous — default to MM/DD/YYYY (US format, common in WhatsApp)
      month = p0 - 1;
      day = p1;
      year = parseInt(dateParts[2]);
    }

    // Handle 2-digit years
    if (year < 100) {
      year += year < 70 ? 2000 : 1900;
    }

    // Parse time
    const timeParts = timeStr.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0;

    // Handle AM/PM
    if (ampm) {
      const period = ampm.trim().toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }

    const date = new Date(year, month, day, hours, minutes, seconds);

    // Validate the date is reasonable
    if (isNaN(date.getTime())) return null;

    return date;
  } catch (err) {
    return null;
  }
}

/**
 * Extract date-only string (YYYY-MM-DD) from a Date object
 * @param {Date} date
 * @returns {string}
 */
function toDateOnly(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Extract hour (0-23) from a Date object
 * @param {Date} date
 * @returns {number}
 */
function toHourOnly(date) {
  return date.getHours();
}

/**
 * Format a date for display
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date-time for display
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = {
  parseWhatsAppDate,
  toDateOnly,
  toHourOnly,
  formatDate,
  formatDateTime,
};
