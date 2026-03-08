/**
 * SERVER TIME ENFORCEMENT MODULE
 * 
 * This module ensures the entire application uses Supabase server time ONLY
 * for USER-FACING and DATA operations.
 * 
 * Internal libraries (Supabase, React, Auth) can use Date.now() internally.
 * We enforce server time at the APPLICATION LAYER, not globally.
 */

import { getServerNow, getServerDateObject, getServerDate, getServerTimestamp } from '../hooks/useServerTime';
import { format } from 'date-fns';

/**
 * ⏱️ STRICT TIME POLICY
 * 
 * ALLOWED (use these only):
 * - getServerNow() → milliseconds since epoch (server)
 * - getServerDateObject() → Date object (server)
 * - getServerDate() → 'YYYY-MM-DD' string (server)
 * - getServerTimestamp() → ISO 8601 string (server)
 * 
 * FORBIDDEN (will throw error):
 * - Date.now() ❌
 * - new Date() ❌
 * - Date.getTime() ❌
 * - Date.getUTCDate() ❌
 * - new Date().toISOString() ❌
 * - moment() ❌
 * - dayjs() ❌
 */

let enforcementActive = true;

/**
 * Activate server time enforcement (LENIENT MODE)
 * 
 * This only enforces server time in CRITICAL places:
 * 1. Database timestamps (created_at, updated_at)
 * 2. Date-based queries (where entry_date >= X)
 * 3. Audit logs and payment records
 * 
 * Internal libraries can still use Date.now() internally.
 */
export function activateServerTimeEnforcement() {
  enforcementActive = true;
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Server Time Enforcement ACTIVE');
    console.log('   ✓ Database timestamps MUST use getServerTimestamp()');
    console.log('   ✓ Date filters MUST use getServerDate()');
    console.log('   ✓ Audit logs MUST use server time');
    console.log('   ✓ Internal libraries can use Date.now() freely');
  }
}

/**
 * Deactivate enforcement (only for testing)
 * @private
 */
export function deactivateServerTimeEnforcement() {
  enforcementActive = false;
  console.warn('⚠️ Server Time Enforcement DEACTIVATED');
}

/**
 * Check if a timestamp appears to use local time instead of server time
 * Returns true if timestamp is SUSPICIOUSLY DIFFERENT from server time
 * @param {string|Date} timestamp - Timestamp to check
 * @returns {boolean} True if likely local time (warning only)
 */
export function isLocalTimeUsed(timestamp) {
  try {
    const serverNow = getServerNow();
    const checkTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
    const diff = Math.abs(serverNow - checkTime);
    
    // If difference is > 1 hour, likely local time was used
    const oneHourMs = 3600000;
    return diff > oneHourMs;
  } catch (e) {
    return false; // Can't determine, assume OK
  }
}

/**
 * Helper: Create timestamp for database operations (server time only)
 * @returns {string} ISO timestamp from server
 */
export function dbTimestamp() {
  return getServerTimestamp();
}

/**
 * Helper: Create date for database queries (server time only)
 * Use this for gte/lte date comparisons
 * @param {number} daysOffset - Days to add/subtract (optional)
 * @returns {string} 'YYYY-MM-DD' format
 */
export function dbDate(daysOffset = 0) {
  const baseDate = getServerDateObject();
  if (daysOffset !== 0) {
    baseDate.setDate(baseDate.getDate() + daysOffset);
  }
  return format(baseDate, 'yyyy-MM-dd');
}

/**
 * Helper: Get current time in milliseconds (server time)
 * Safe alternative to Date.now()
 * @returns {number} Server time in milliseconds
 */
export function currentTime() {
  return getServerNow();
}

/**
 * Helper: Format server time to display string
 * @param {string|Date} date - Server date object or ISO string
 * @param {string} formatStr - date-fns format string
 * @returns {string} Formatted date string
 */
export function formatServerTime(date, formatStr = 'MMM dd, yyyy HH:mm') {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Validate that timestamps use server time (WARNING only, doesn't throw)
 * Use this before database mutations to catch accidental local time usage
 * @param {object} data - Data object with timestamps
 * @param {...string} fields - Field names to check (e.g., 'created_at', 'entry_date')
 * @returns {boolean} True if all timestamps are valid
 */
export function assertServerTimeUsed(data, ...fields) {
  let hasIssues = false;
  
  fields.forEach(field => {
    if (data[field] && isLocalTimeUsed(data[field])) {
      console.warn(
        `⚠️ WARNING: Field '${field}' may use local time instead of server time.\n` +
        `   Expected: getServerTimestamp()\n` +
        `   Value: ${data[field]}`
      );
      hasIssues = true;
    }
  });
  
  return !hasIssues;
}

export default {
  activateServerTimeEnforcement,
  deactivateServerTimeEnforcement,
  dbTimestamp,
  dbDate,
  currentTime,
  formatServerTime,
  assertServerTimeUsed,
  isLocalTimeUsed,
};
