// lib/api/modules/search.ts
// ============= SEARCH MODULE =============
// Global search and autocomplete

import { BaseHttpClient } from '../core/client'

export class SearchAPI extends BaseHttpClient {
  /**
   * Autocomplete search across entities
   */
  async searchAutocomplete(
    query: string,
    entityType: 'organisations' | 'people' | 'mandats' | 'tasks' = 'organisations',
    limit = 10
  ): Promise<Array<{ id: number; name: string; type: string; [key: string]: unknown }>> {
    return this.request('/search/autocomplete', {
      params: {
        q: query,
        type: entityType,
        limit,
      },
    })
  }
}

// Singleton instance
export const searchAPI = new SearchAPI()
