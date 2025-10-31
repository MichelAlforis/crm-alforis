/**
 * Pagination & Data Fetching Constants
 *
 * Centralized pagination configuration for consistent data fetching
 * across the application.
 */

/**
 * Default Pagination Values
 */
export const PAGINATION = {
  // Default page sizes
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_SKIP: 0,

  // Common page size options
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100, 500] as const,

  // Special cases
  SMALL_LIST: 10,
  MEDIUM_LIST: 20,
  LARGE_LIST: 100,
  BULK_FETCH: 1000,
  UNLIMITED: 10000,

  // API limits
  MAX_LIMIT: 10000,
  MIN_LIMIT: 1,
} as const;

/**
 * Table Configuration
 */
export const TABLE_CONFIG = {
  DEFAULT_ROWS_PER_PAGE: 20,
  ROWS_PER_PAGE_OPTIONS: [10, 20, 50, 100],
  MAX_VISIBLE_PAGES: 5,
  SHOW_TOTAL: true,
  SHOW_PAGE_SIZE_SELECTOR: true,
} as const;

/**
 * Infinite Scroll Configuration
 */
export const INFINITE_SCROLL = {
  INITIAL_LOAD: 20,
  INCREMENTAL_LOAD: 20,
  THRESHOLD: 0.8, // Load more when 80% scrolled
} as const;

/**
 * Search & Filter Configuration
 */
export const SEARCH_CONFIG = {
  MIN_SEARCH_LENGTH: 2,
  DEBOUNCE_DELAY: 300, // ms
  MAX_RECENT_SEARCHES: 10,
  MAX_SUGGESTIONS: 5,
} as const;

/**
 * Helper functions for pagination
 */
export const paginationHelpers = {
  /**
   * Calculate total pages
   */
  getTotalPages(totalItems: number, pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE): number {
    return Math.ceil(totalItems / pageSize);
  },

  /**
   * Get skip value from page number
   */
  getSkipFromPage(page: number, pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE): number {
    return (page - 1) * pageSize;
  },

  /**
   * Get page number from skip value
   */
  getPageFromSkip(skip: number, pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE): number {
    return Math.floor(skip / pageSize) + 1;
  },

  /**
   * Check if has next page
   */
  hasNextPage(currentPage: number, totalItems: number, pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE): boolean {
    return currentPage < this.getTotalPages(totalItems, pageSize);
  },

  /**
   * Check if has previous page
   */
  hasPreviousPage(currentPage: number): boolean {
    return currentPage > 1;
  },

  /**
   * Get page range for pagination UI
   */
  getPageRange(currentPage: number, totalPages: number, maxVisible: number = TABLE_CONFIG.MAX_VISIBLE_PAGES): number[] {
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  },
};

/**
 * Query parameter names for pagination
 */
export const PAGINATION_PARAMS = {
  PAGE: 'page',
  LIMIT: 'limit',
  SKIP: 'skip',
  SORT_BY: 'sortBy',
  SORT_ORDER: 'sortOrder',
  SEARCH: 'search',
  FILTER: 'filter',
} as const;
