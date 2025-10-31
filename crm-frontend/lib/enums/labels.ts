/**
 * Centralized label mappings for all entities
 *
 * This file contains all the label mappings used across the application
 * to ensure consistency and ease of maintenance.
 */

// ==================== ORGANISATION LABELS ====================

export const ORGANISATION_CATEGORY_LABELS: Record<string, string> = {
  Institution: 'Institution',
  Wholesale: 'Wholesale',
  SDG: 'SDG',
  CGPI: 'CGPI',
  Startup: 'Startup',
  Corporation: 'Corporation',
  Autres: 'Autres',
}

export const ORGANISATION_STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  PROSPECT: 'Prospect',
  CLIENT: 'Client',
  ARCHIVE: 'Archivé',
}

// ==================== PRODUIT LABELS ====================

export const PRODUIT_TYPE_LABELS: Record<string, string> = {
  OPCVM: 'OPCVM (Fonds)',
  ETF: 'ETF (Trackers)',
  SCPI: 'SCPI (Immobilier)',
  ASSURANCE_VIE: 'Assurance Vie',
  PER: 'PER',
  AUTRE: 'Autre',
  FCP: 'FCP',
  SICAV: 'SICAV',
  'Fonds Alternatif': 'Fonds Alternatif',
  Autre: 'Autre',
}

export const PRODUIT_STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  ARCHIVE: 'Archivé',
}

// ==================== MANDAT LABELS ====================

export const MANDAT_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_NEGOCIATION: 'En négociation',
  SIGNE: 'Signé',
  ACTIF: 'Actif',
  EXPIRE: 'Expiré',
  RESILIE: 'Résilié',
  proposé: 'Proposé',
  signé: 'Signé',
  actif: 'Actif',
  terminé: 'Terminé',
}

export const MANDAT_TYPE_LABELS: Record<string, string> = {
  OPCVM: 'OPCVM (Fonds)',
  ETF: 'ETF (Trackers)',
  SCPI: 'SCPI (Immobilier)',
  ASSURANCE_VIE: 'Assurance Vie',
  PER: 'PER',
  AUTRE: 'Autre',
}

// ==================== AI / INTELLIGENCE LABELS ====================

export const AI_INTENT_LABELS: Record<string, string> = {
  question: 'Question',
  demande_info: 'Demande d\'information',
  plainte: 'Plainte',
  suggestion: 'Suggestion',
  feedback: 'Feedback',
  autre: 'Autre',
}

// ==================== RGPD / ACCESS LOGS LABELS ====================

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: 'Contact',
  organisation: 'Organisation',
  produit: 'Produit',
  mandat: 'Mandat',
  interaction: 'Interaction',
  activity: 'Activité',
  task: 'Tâche',
  email_campaign: 'Campagne Email',
  mailing_list: 'Liste de diffusion',
  workflow: 'Workflow',
  user: 'Utilisateur',
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get label for a given value from a label mapping
 * Returns the value itself if no label is found
 */
export function getLabel(
  value: string | null | undefined,
  labels: Record<string, string>
): string {
  if (!value) return '-'
  return labels[value] || value
}

/**
 * Get all available options from a label mapping
 * Useful for select/dropdown components
 */
export function getLabelOptions(labels: Record<string, string>): Array<{
  value: string
  label: string
}> {
  return Object.entries(labels).map(([value, label]) => ({
    value,
    label,
  }))
}
