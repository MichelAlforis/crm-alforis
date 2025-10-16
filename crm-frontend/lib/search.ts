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
