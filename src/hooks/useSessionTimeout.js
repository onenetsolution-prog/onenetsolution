import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getServerNow } from './useServerTime';

/**
 * Session timeout hook
 * Automatically logs out user after X minutes of inactivity
 * Shows warning modal 60 seconds before logout
 * Uses server time to prevent client-side time manipulation
 */

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 60 * 1000; // 60 seconds before logout

export function useSessionTimeout() {
  const { signOut } = useAuth();
  const lastActivityRef = useRef(getServerNow());
  const warningShownRef = useRef(false);
  const timeoutIdRef = useRef(null);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    // Activity listeners
    const updateActivity = () => {
      lastActivityRef.current = getServerNow();
      warningShownRef.current = false; // Reset warning if user becomes active
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, true);
    });

    // Check for inactivity every minute
    const checkInactivity = () => {
      const now = getServerNow();
      const timeSinceLastActivity = now - lastActivityRef.current;
      const timeUntilLogout = INACTIVITY_TIMEOUT - timeSinceLastActivity;

      // Show warning 60 seconds before logout
      if (timeUntilLogout <= WARNING_TIME && !warningShownRef.current) {
        warningShownRef.current = true;
        window.dispatchEvent(
          new CustomEvent('sessionWarning', {
            detail: { timeRemaining: timeUntilLogout }
          })
        );
      }

      // Auto logout when timeout reached
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        clearInterval(checkIntervalRef.current);
        events.forEach(event => {
          window.removeEventListener(event, updateActivity, true);
        });
        signOut();
      }
    };

    checkIntervalRef.current = setInterval(checkInactivity, 60000); // Check every minute

    return () => {
      clearInterval(checkIntervalRef.current);
      events.forEach(event => {
        window.removeEventListener(event, updateActivity, true);
      });
    };
  }, [signOut]);
}
