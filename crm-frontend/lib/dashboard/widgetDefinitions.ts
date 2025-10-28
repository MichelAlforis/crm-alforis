// lib/dashboard/widgetDefinitions.ts
// ============= DASHBOARD V2 - Widget Catalog =============

import type { WidgetDefinition, WidgetType } from '@/lib/types/dashboard'

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  kpi_card: {
    type: 'kpi_card',
    label: 'Carte KPI',
    description: 'Affichez une métrique clé avec tendance',
    icon: '📊',
    defaultSize: 'small',
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 },
    category: 'analytics',
    requiresConfig: true,
    configSchema: {
      metric: ['organisations', 'mandats', 'revenue', 'tasks', 'contacts'],
      period: ['today', 'week', 'month', 'quarter', 'year'],
    },
  },

  revenue_chart: {
    type: 'revenue_chart',
    label: 'Graphique de revenu',
    description: 'Évolution du revenu dans le temps',
    icon: '💰',
    defaultSize: 'large',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    category: 'analytics',
    requiresConfig: true,
    configSchema: {
      period: ['7days', '30days', '90days', '12months'],
      chartType: ['line', 'bar', 'area'],
      comparison: ['none', 'previous_period', 'same_period_last_year'],
    },
  },

  pipeline_funnel: {
    type: 'pipeline_funnel',
    label: 'Pipeline / Funnel',
    description: 'Visualisez votre pipeline de ventes',
    icon: '🎯',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    category: 'analytics',
  },

  activity_timeline: {
    type: 'activity_timeline',
    label: 'Timeline d\'activité',
    description: 'Activités récentes en temps réel',
    icon: '⏱️',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
    category: 'activities',
    requiresConfig: true,
    configSchema: {
      limit: [5, 10, 20, 50],
      types: ['all', 'interactions', 'tasks', 'deals', 'emails'],
    },
  },

  hot_leads: {
    type: 'hot_leads',
    label: 'Leads chauds',
    description: 'Prospects à forte valeur qui nécessitent votre attention',
    icon: '🔥',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    category: 'ai',
    requiresConfig: true,
    configSchema: {
      threshold: [70, 80, 90],
      limit: [5, 10, 20],
    },
  },

  tasks_kanban: {
    type: 'tasks_kanban',
    label: 'Tâches Kanban',
    description: 'Vue Kanban de vos tâches',
    icon: '✅',
    defaultSize: 'large',
    minSize: { w: 3, h: 2 },
    maxSize: { w: 4, h: 4 },
    category: 'activities',
  },

  recent_interactions: {
    type: 'recent_interactions',
    label: 'Interactions récentes',
    description: 'Dernières interactions avec vos clients',
    icon: '💬',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    category: 'activities',
    requiresConfig: true,
    configSchema: {
      limit: [5, 10, 20],
    },
  },

  conversion_rate: {
    type: 'conversion_rate',
    label: 'Taux de conversion',
    description: 'Analyse des conversions par étape',
    icon: '📈',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    category: 'analytics',
  },

  email_performance: {
    type: 'email_performance',
    label: 'Performance emails',
    description: 'Statistiques de vos campagnes email',
    icon: '📧',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 2 },
    category: 'analytics',
    requiresConfig: true,
    configSchema: {
      period: ['7days', '30days', '90days'],
    },
  },

  ai_insights: {
    type: 'ai_insights',
    label: 'Insights IA',
    description: 'Recommandations et prédictions intelligentes',
    icon: '🤖',
    defaultSize: 'large',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    category: 'ai',
  },

  team_performance: {
    type: 'team_performance',
    label: 'Performance équipe',
    description: 'Classement et stats de l\'équipe',
    icon: '👥',
    defaultSize: 'large',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    category: 'team',
  },

  top_clients: {
    type: 'top_clients',
    label: 'Meilleurs clients',
    description: 'Top clients par revenu et engagement',
    icon: '⭐',
    defaultSize: 'medium',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    category: 'analytics',
    requiresConfig: true,
    configSchema: {
      limit: [5, 10, 20],
      sortBy: ['revenue', 'deals', 'health_score'],
    },
  },

  monthly_trends: {
    type: 'monthly_trends',
    label: 'Tendances mensuelles',
    description: 'Évolution des métriques clés',
    icon: '📉',
    defaultSize: 'large',
    minSize: { w: 3, h: 2 },
    maxSize: { w: 4, h: 3 },
    category: 'analytics',
  },

  forecast: {
    type: 'forecast',
    label: 'Prévisions',
    description: 'Prévisions de revenu basées sur l\'IA',
    icon: '🔮',
    defaultSize: 'large',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    category: 'ai',
    requiresConfig: true,
    configSchema: {
      horizon: ['30days', '90days', '6months', '12months'],
    },
  },

  quick_actions: {
    type: 'quick_actions',
    label: 'Actions rapides',
    description: 'Raccourcis vers actions fréquentes',
    icon: '⚡',
    defaultSize: 'medium',
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 2 },
    category: 'actions',
    requiresConfig: true,
    configSchema: {
      actions: ['new_org', 'new_person', 'new_task', 'new_interaction', 'new_email'],
    },
  },
}

export const WIDGET_CATEGORIES = {
  analytics: {
    label: 'Analytics',
    icon: '📊',
    color: 'blue',
  },
  activities: {
    label: 'Activités',
    icon: '⚡',
    color: 'green',
  },
  ai: {
    label: 'Intelligence',
    icon: '🤖',
    color: 'purple',
  },
  actions: {
    label: 'Actions',
    icon: '🎯',
    color: 'orange',
  },
  team: {
    label: 'Équipe',
    icon: '👥',
    color: 'indigo',
  },
} as const

// Default layouts by role
export const DEFAULT_LAYOUTS = {
  commercial: {
    name: 'Commercial',
    widgets: [
      {
        id: 'kpi-1',
        type: 'kpi_card' as WidgetType,
        title: 'Pipeline',
        size: 'small' as const,
        position: { x: 0, y: 0, w: 1, h: 1 },
        config: { metric: 'pipeline_value' },
      },
      {
        id: 'hot-leads',
        type: 'hot_leads' as WidgetType,
        title: 'Leads prioritaires',
        size: 'medium' as const,
        position: { x: 1, y: 0, w: 2, h: 2 },
        config: { threshold: 80, limit: 10 },
      },
      {
        id: 'tasks',
        type: 'tasks_kanban' as WidgetType,
        title: 'Mes tâches',
        size: 'large' as const,
        position: { x: 0, y: 1, w: 3, h: 2 },
      },
      {
        id: 'recent',
        type: 'recent_interactions' as WidgetType,
        title: 'Activité récente',
        size: 'medium' as const,
        position: { x: 3, y: 0, w: 2, h: 2 },
        config: { limit: 10 },
      },
    ],
  },

  manager: {
    name: 'Manager',
    widgets: [
      {
        id: 'revenue',
        type: 'revenue_chart' as WidgetType,
        title: 'Évolution du revenu',
        size: 'large' as const,
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: { period: '90days', chartType: 'area' },
      },
      {
        id: 'team',
        type: 'team_performance' as WidgetType,
        title: 'Performance équipe',
        size: 'large' as const,
        position: { x: 3, y: 0, w: 2, h: 2 },
      },
      {
        id: 'pipeline',
        type: 'pipeline_funnel' as WidgetType,
        title: 'Pipeline global',
        size: 'medium' as const,
        position: { x: 0, y: 2, w: 2, h: 2 },
      },
      {
        id: 'conversion',
        type: 'conversion_rate' as WidgetType,
        title: 'Taux de conversion',
        size: 'medium' as const,
        position: { x: 2, y: 2, w: 2, h: 2 },
      },
      {
        id: 'forecast',
        type: 'forecast' as WidgetType,
        title: 'Prévisions',
        size: 'large' as const,
        position: { x: 0, y: 4, w: 4, h: 2 },
        config: { horizon: '90days' },
      },
    ],
  },

  admin: {
    name: 'Admin',
    widgets: [
      {
        id: 'kpi-1',
        type: 'kpi_card' as WidgetType,
        title: 'Organisations',
        size: 'small' as const,
        position: { x: 0, y: 0, w: 1, h: 1 },
        config: { metric: 'organisations' },
      },
      {
        id: 'kpi-2',
        type: 'kpi_card' as WidgetType,
        title: 'Contacts',
        size: 'small' as const,
        position: { x: 1, y: 0, w: 1, h: 1 },
        config: { metric: 'contacts' },
      },
      {
        id: 'kpi-3',
        type: 'kpi_card' as WidgetType,
        title: 'Tâches',
        size: 'small' as const,
        position: { x: 2, y: 0, w: 1, h: 1 },
        config: { metric: 'tasks' },
      },
      {
        id: 'kpi-4',
        type: 'kpi_card' as WidgetType,
        title: 'Revenu',
        size: 'small' as const,
        position: { x: 3, y: 0, w: 1, h: 1 },
        config: { metric: 'revenue' },
      },
      {
        id: 'ai-insights',
        type: 'ai_insights' as WidgetType,
        title: 'Insights IA',
        size: 'large' as const,
        position: { x: 0, y: 1, w: 4, h: 2 },
      },
      {
        id: 'trends',
        type: 'monthly_trends' as WidgetType,
        title: 'Tendances',
        size: 'large' as const,
        position: { x: 0, y: 3, w: 4, h: 2 },
      },
      {
        id: 'top-clients',
        type: 'top_clients' as WidgetType,
        title: 'Top clients',
        size: 'medium' as const,
        position: { x: 0, y: 5, w: 2, h: 2 },
        config: { limit: 10, sortBy: 'revenue' },
      },
      {
        id: 'email',
        type: 'email_performance' as WidgetType,
        title: 'Performance emails',
        size: 'medium' as const,
        position: { x: 2, y: 5, w: 2, h: 2 },
        config: { period: '30days' },
      },
    ],
  },
}
