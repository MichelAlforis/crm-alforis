/**
 * Timeout & Interval Constants
 *
 * Centralized timing configuration for consistent behavior across
 * the application (polling, debouncing, caching, etc.)
 */

/**
 * API Request Timeouts (in milliseconds)
 */
export const API_TIMEOUTS = {
  // Request timeouts
  SHORT: 5000, // 5 seconds - Quick operations
  DEFAULT: 10000, // 10 seconds - Standard requests
  LONG: 30000, // 30 seconds - Heavy operations (export, import)
  VERY_LONG: 60000, // 60 seconds - Very heavy operations

  // Connection timeouts
  CONNECT_TIMEOUT: 5000,
  READ_TIMEOUT: 10000,
} as const;

/**
 * Polling & Refetch Intervals (in milliseconds)
 */
export const POLLING_INTERVALS = {
  FAST: 5000, // 5 seconds - Real-time updates (campaign sending)
  NORMAL: 10000, // 10 seconds - Regular polling
  SLOW: 30000, // 30 seconds - Background updates
  VERY_SLOW: 60000, // 60 seconds - Low-priority updates
  IDLE: 300000, // 5 minutes - When app is idle
} as const;

/**
 * Cache TTL (Time To Live) in milliseconds
 */
export const CACHE_TTL = {
  SHORT: 30000, // 30 seconds - Highly dynamic data
  MEDIUM: 300000, // 5 minutes - Standard caching
  LONG: 900000, // 15 minutes - Relatively static data
  VERY_LONG: 3600000, // 1 hour - Nearly static data
  DAY: 86400000, // 24 hours - Very static data
} as const;

/**
 * React Query Stale Time Configuration
 */
export const STALE_TIME = {
  IMMEDIATE: 0, // Always stale
  SHORT: 10000, // 10 seconds
  MEDIUM: 30000, // 30 seconds
  LONG: 60000, // 60 seconds
  VERY_LONG: 300000, // 5 minutes
  INFINITE: Infinity, // Never stale
} as const;

/**
 * UI Interaction Delays (in milliseconds)
 */
export const UI_DELAYS = {
  // Debouncing
  DEBOUNCE_SEARCH: 300, // Search input debounce
  DEBOUNCE_INPUT: 500, // Generic input debounce
  DEBOUNCE_RESIZE: 150, // Window resize debounce

  // Throttling
  THROTTLE_SCROLL: 100, // Scroll event throttle
  THROTTLE_CLICK: 1000, // Prevent double-click

  // Animations
  ANIMATION_SHORT: 150,
  ANIMATION_MEDIUM: 300,
  ANIMATION_LONG: 500,

  // Toast/Notification display
  TOAST_DURATION: 3000,
  TOAST_ERROR_DURATION: 5000,
  TOAST_SUCCESS_DURATION: 2000,

  // Tooltip delays
  TOOLTIP_DELAY: 500,
} as const;

/**
 * Session & Idle Timeouts (in milliseconds)
 */
export const SESSION_TIMEOUTS = {
  IDLE_WARNING: 7200000, // 2 hours - Warn user of inactivity
  IDLE_LOGOUT: 7380000, // 2 hours 3 minutes - Auto logout
  SESSION_CHECK: 60000, // 1 minute - Check session validity
  TOKEN_REFRESH: 840000, // 14 minutes - Refresh token (15min token lifetime)
} as const;

/**
 * Background Job Timeouts (in milliseconds)
 */
export const JOB_TIMEOUTS = {
  IMPORT: 300000, // 5 minutes - CSV import
  EXPORT: 180000, // 3 minutes - Data export
  AI_PROCESSING: 120000, // 2 minutes - AI suggestions
  EMAIL_SEND: 60000, // 1 minute - Single email
  BULK_EMAIL: 600000, // 10 minutes - Bulk email campaign
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2, // Exponential backoff
} as const;

/**
 * Test/E2E Timeouts (in milliseconds)
 */
export const TEST_TIMEOUTS = {
  SHORT: 2000,
  DEFAULT: 5000,
  LONG: 10000,
  VERY_LONG: 30000,
} as const;

/**
 * Helper functions for timing operations
 */
export const timingHelpers = {
  /**
   * Sleep/delay function
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Create debounced function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number = UI_DELAYS.DEBOUNCE_INPUT
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Create throttled function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number = UI_DELAYS.THROTTLE_SCROLL
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Calculate exponential backoff delay
   */
  getBackoffDelay(attempt: number): number {
    const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
    return Math.min(delay, RETRY_CONFIG.MAX_DELAY);
  },

  /**
   * Format milliseconds to human readable
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },
};
