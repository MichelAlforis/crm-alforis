export type SearchItemType =
  | 'fournisseur'
  | 'investisseur'
  | 'person'
  | 'contact'
  | 'opportunite'
  | 'kpi'
  | 'info'

export interface SearchItem {
  id: string
  type: SearchItemType
  title: string
  subtitle?: string
  href: string
}

export interface SearchSuggestion {
  id: number | string
  name?: string
  title?: string
  type: string
  category?: string
  email?: string
  status?: string
  role?: string
  [key: string]: unknown
}
