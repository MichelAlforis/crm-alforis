// lib/api/modules/ai.ts
// ============= AI MODULE =============
// AI autofill statistics and analytics

import { BaseHttpClient } from '../core/client'
import type {
  AutofillStats,
  AutofillTimelineResponse,
  AutofillLeaderboardResponse,
} from '@/lib/types'

export class AIAPI extends BaseHttpClient {
  /**
   * Get autofill statistics
   */
  async getAutofillStats(params?: { days?: number }): Promise<AutofillStats> {
    return this.request<AutofillStats>('/ai/autofill/stats', { params })
  }

  /**
   * Get autofill timeline
   */
  async getAutofillTimeline(params?: { days?: number }): Promise<AutofillTimelineResponse> {
    return this.request<AutofillTimelineResponse>('/ai/autofill/stats/timeline', { params })
  }

  /**
   * Get autofill leaderboard
   */
  async getAutofillLeaderboard(): Promise<AutofillLeaderboardResponse> {
    return this.request<AutofillLeaderboardResponse>('/ai/autofill/stats/leaderboard')
  }
}

// Singleton instance
export const aiAPI = new AIAPI()
