import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

let serverTimeOffset = 0; // milliseconds difference between client and server
let isInitialized = false;
let initPromise = null;

/**
 * Initialize server time by calling Supabase RPC function
 * Calculates the time difference between client and server
 * Retries with exponential backoff if initial attempts fail
 */
function initializeServerTime() {
  if (isInitialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const MAX_RETRIES = 8;
    const INITIAL_DELAY = 1000; // 1 second
    const MAX_DELAY = 16000; // 16 seconds
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Use Date.now() for client time - this is OK for offset calculation
        const clientNow = Date.now();
        const { data, error } = await supabase.rpc('get_server_time');

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }

        // data should be something like: "2026-03-07T10:30:45.123Z"
        const serverTime = new Date(data).getTime();
        serverTimeOffset = serverTime - clientNow;
        isInitialized = true;
        console.log('✅ [useServerTime] Server time synchronized. Offset:', serverTimeOffset, 'ms');
        return; // Success!
      } catch (error) {
        lastError = error;
        const delay = Math.min(INITIAL_DELAY * Math.pow(2, attempt), MAX_DELAY);
        
        console.warn(
          `⏱️ [useServerTime] Attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
          error.message,
          `Retrying in ${delay}ms...`
        );

        // Don't wait on the last attempt
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to initialize server time after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}. ` +
      'Please fix your system clock or check your internet connection.'
    );
  })();

  return initPromise;
}

/**
 * Check if server time is initialized
 */
export function isServerTimeInitialized() {
  return isInitialized;
}

/**
 * Enforce server time - throws if not initialized
 * Use this to ensure server time is ALWAYS used for application logic
 * @private
 */
function enforceServerTimeInitialized() {
  if (!isInitialized) {
    const error = new Error(
      '⏱️ SERVER TIME NOT READY: Application requires server time to be initialized. ' +
      'Server time is syncing - please wait a moment.'
    );
    console.error(error.message);
    throw error;
  }
}

/**
 * Get current server date as 'yyyy-MM-dd' format
 * STRICT: Will throw if server time not initialized
 * @returns {string} Server date in 'yyyy-MM-dd' format
 * @throws {Error} If server time hasn't been initialized
 */
export function getServerDate() {
  enforceServerTimeInitialized();
  const serverNow = new Date(Date.now() + serverTimeOffset);
  return format(serverNow, 'yyyy-MM-dd');
}

/**
 * Get current server timestamp as ISO string
 * STRICT: Will throw if server time not initialized
 * @returns {string} Full ISO timestamp from server
 * @throws {Error} If server time hasn't been initialized
 */
export function getServerTimestamp() {
  enforceServerTimeInitialized();
  return new Date(Date.now() + serverTimeOffset).toISOString();
}

/**
 * Get current server time in milliseconds (equivalent to Date.now() but using server time)
 * STRICT: Will throw if server time not initialized
 * @returns {number} Current server time in milliseconds
 * @throws {Error} If server time hasn't been initialized
 */
export function getServerNow() {
  enforceServerTimeInitialized();
  return Date.now() + serverTimeOffset;
}

/**
 * Get current server time as a Date object
 * STRICT: Will throw if server time not initialized
 * @returns {Date} Current server time as Date object
 * @throws {Error} If server time hasn't been initialized
 */
export function getServerDateObject() {
  enforceServerTimeInitialized();
  return new Date(Date.now() + serverTimeOffset);
}

/**
 * Block access to local time - FORBIDDEN
 * This prevents accidental use of local device time
 */
export const LocalTimeBlocked = {
  now() {
    throw new Error('❌ FORBIDDEN: Date.now() is not allowed. Use getServerNow() from useServerTime instead.');
  },
  today() {
    throw new Error('❌ FORBIDDEN: new Date() is not allowed. Use getServerDateObject() from useServerTime instead.');
  }, 
  utcNow() {
    throw new Error('❌ FORBIDDEN: Local time access blocked. Use getServerNow() or getServerTimestamp() from useServerTime.');
  }
};

/**
 * React hook to initialize server time on mount
 * Must be called once at app startup (e.g., in App.jsx or a root layout)
 * Keeps loading=true while retrying, only sets error if all retries fail
 */
export function useServerTime() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    initializeServerTime()
      .then(() => {
        setIsLoading(false);
        setError(null);
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err);
        console.error('[useServerTime] ❌ Initialization failed:', err.message);
      });
  }, []);

  return { isLoading, error, isInitialized };
}

/**
 * Manual initialization (for non-React contexts)
 */
export async function initServerTime() {
  return initializeServerTime();
}
