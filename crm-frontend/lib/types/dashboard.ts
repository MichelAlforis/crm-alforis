// lib/types/dashboard.ts
// ============= DASHBOARD V2 - Type Definitions =============

export type WidgetType =
  | 'kpi_card'
  | 'revenue_chart'
  | 'pipeline_funnel'
  | 'activity_timeline'
  | 'hot_leads'
  | 'tasks_kanban'
  | 'recent_interactions'
  | 'conversion_rate'
  | 'email_performance'
  | 'ai_insights'
  | 'team_performance'
  | 'top_clients'
  | 'monthly_trends'
  | 'forecast'
  | 'quick_actions'

export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  size: WidgetSize
  position: {
    x: number
    y: number
    w: number
    h: number
  }
  config?: Record<string, any>
  refreshInterval?: number // seconds, 0 = no auto-refresh
}

export interface DashboardLayout {
  id?: number
  name: string
  user_id?: number
  is_default: boolean
  widgets: WidgetConfig[]
  created_at?: string
  updated_at?: string
}

export interface WidgetDefinition {
  type: WidgetType
  label: string
  description: string
  icon: string
  defaultSize: WidgetSize
  minSize: { w: number; h: number }
  maxSize: { w: number; h: number }
  category: 'analytics' | 'activities' | 'ai' | 'actions' | 'team'
  requiresConfig?: boolean
  configSchema?: any
}

// Analytics data types
export interface RevenueData {
  period: string
  revenue: number
  target?: number
  growth?: number
}

export interface PipelineStage {
  stage: string
  count: number
  value: number
  conversion_rate?: number
}

export interface TeamMemberStats {
  user_id: number
  name: string
  avatar?: string
  deals_closed: number
  revenue: number
  activities: number
  conversion_rate: number
}

export interface AIInsight {
  type: 'opportunity' | 'risk' | 'recommendation' | 'trend'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  action_url?: string
  created_at: string
}

export interface ForecastData {
  period: string
  predicted: number
  lower_bound: number
  upper_bound: number
  actual?: number
}

export interface TopClient {
  organisation_id: number
  name: string
  revenue: number
  deals_count: number
  last_interaction?: string
  health_score: number
}

export interface ConversionMetrics {
  stage_from: string
  stage_to: string
  rate: number
  count: number
  avg_time_days: number
}
