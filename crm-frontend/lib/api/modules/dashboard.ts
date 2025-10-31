// lib/api/modules/dashboard.ts
// ============= DASHBOARD MODULE =============
// Dashboard statistics and analytics

import { BaseHttpClient } from '../core/client'

export class DashboardAPI extends BaseHttpClient {
  /**
   * Get global dashboard stats
   */
  async getGlobalDashboardStats(): Promise<any> {
    return this.request('/dashboards/stats/global')
  }

  /**
   * Get organisation-specific stats
   */
  async getOrganisationStats(organisationId: number): Promise<any> {
    return this.request(`/dashboards/stats/organisation/${organisationId}`)
  }

  /**
   * Get monthly aggregate stats
   */
  async getMonthlyAggregateStats(year: number, month: number): Promise<any> {
    return this.request(`/dashboards/stats/month/${year}/${month}`)
  }

  /**
   * Get yearly aggregate stats for organisation
   */
  async getYearlyAggregateStats(organisationId: number, year: number): Promise<any> {
    return this.request(`/dashboards/stats/organisation/${organisationId}/year/${year}`)
  }
}

// Singleton instance
export const dashboardAPI = new DashboardAPI()
