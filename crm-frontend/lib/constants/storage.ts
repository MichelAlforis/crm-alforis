/**
 * LocalStorage & SessionStorage Keys
 *
 * Centralized storage key definitions to prevent typos and
 * facilitate refactoring.
 */

/**
 * Authentication Storage Keys
 */
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  CSRF_TOKEN: 'csrf_token',
  USER: 'user',
  EXPIRES_AT: 'auth_expires_at',

  // Legacy keys (to be migrated)
  LEGACY_TOKEN: 'token',
} as const;

/**
 * User Preferences Storage Keys
 */
export const PREFERENCES_STORAGE_KEYS = {
  THEME: 'user_theme',
  LANGUAGE: 'user_language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  TABLE_DENSITY: 'table_density',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
} as const;

/**
 * UI State Storage Keys
 */
export const UI_STATE_STORAGE_KEYS = {
  LAST_VISITED_PAGE: 'last_visited_page',
  DASHBOARD_LAYOUT: 'dashboard_layout',
  FILTERS_STATE: 'filters_state',
  SORT_STATE: 'sort_state',
  COLUMN_VISIBILITY: 'column_visibility',
} as const;

/**
 * Cache Storage Keys
 */
export const CACHE_STORAGE_KEYS = {
  ORGANISATIONS_LIST: 'cache_organisations_list',
  PEOPLE_LIST: 'cache_people_list',
  RECENT_SEARCHES: 'cache_recent_searches',
} as const;

/**
 * Feature Flags Storage Keys
 */
export const FEATURE_FLAGS_STORAGE_KEYS = {
  AI_SUGGESTIONS_ENABLED: 'feature_ai_suggestions',
  MULTI_MAIL_ENABLED: 'feature_multi_mail',
  SMART_AUTOFILL_ENABLED: 'feature_smart_autofill',
} as const;

/**
 * All storage keys combined
 */
export const STORAGE_KEYS = {
  ...AUTH_STORAGE_KEYS,
  ...PREFERENCES_STORAGE_KEYS,
  ...UI_STATE_STORAGE_KEYS,
  ...CACHE_STORAGE_KEYS,
  ...FEATURE_FLAGS_STORAGE_KEYS,
} as const;

/**
 * Helper functions for safe storage access
 */
export const storage = {
  /**
   * Get item from localStorage with type safety
   */
  get<T = string>(key: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined') return defaultValue ?? null;

    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue ?? null;

      // Try to parse as JSON, fallback to raw string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error(`Error reading from localStorage (key: ${key}):`, error);
      return defaultValue ?? null;
    }
  },

  /**
   * Set item in localStorage with type safety
   */
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error writing to localStorage (key: ${key}):`, error);
    }
  },

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (key: ${key}):`, error);
    }
  },

  /**
   * Clear all storage
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(key) !== null;
  },
};
