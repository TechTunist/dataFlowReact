/**
 * Simple centralized logger for the frontend.
 * 
 * Currently wraps console methods.
 * In the future this can be easily upgraded to send errors to
 * Sentry, LogRocket, or a custom backend endpoint without touching
 * call sites.
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  info: (...args) => {
    if (isDev) console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (message, error) => {
    // Always log errors (even in production) so we have some visibility
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }

    // Future: send to error tracking service here
    // if (!isDev) captureException({ message, error });
  },
};

export default logger;
