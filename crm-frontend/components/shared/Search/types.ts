/**
 * Shared types for Search components
 */

export interface SearchSuggestion {
  id: string
  type: string
  title: string
  subtitle?: string
  href: string
  metadata?: Record<string, any>
}

export interface SearchHistory {
  query: string
  timestamp: number
}

export type EntityType = 'organisations' | 'people' | 'mandats' | 'tasks' | 'all'

export const TYPE_LABELS: Record<string, string> = {
  // CRM entities
  organisation: 'Organisation',
  organisations: 'Organisation',
  fournisseur: 'Fournisseur',
  investisseur: 'Investisseur',
  person: 'Personne',
  people: 'Personne',
  contact: 'Contact',

  // Business
  mandat: 'Mandat',
  mandats: 'Mandat',
  opportunite: 'Opportunité',
  task: 'Tâche',
  tasks: 'Tâche',

  // Data
  kpi: 'KPI',
  info: 'Info',
}
