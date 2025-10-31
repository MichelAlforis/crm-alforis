/**
 * User-Facing Messages Constants
 *
 * Centralized error, success, and info messages for consistent UX
 * and easier i18n integration later.
 */

/**
 * Generic Error Messages
 */
export const ERROR_MESSAGES = {
  // Generic errors
  GENERIC: 'Une erreur est survenue',
  NETWORK: 'Erreur de connexion réseau',
  TIMEOUT: 'La requête a expiré',
  UNAUTHORIZED: 'Vous n\'êtes pas autorisé',
  FORBIDDEN: 'Accès refusé',
  NOT_FOUND: 'Ressource introuvable',
  SERVER_ERROR: 'Erreur serveur',

  // Loading errors
  LOAD_FAILED: 'Erreur lors du chargement',
  LOAD_ORGANISATIONS: 'Impossible de charger les organisations',
  LOAD_PEOPLE: 'Impossible de charger les contacts',
  LOAD_CAMPAIGNS: 'Impossible de charger les campagnes',
  LOAD_TEMPLATES: 'Impossible de charger les modèles',
  LOAD_ACTIVITIES: 'Impossible de charger les activités',
  LOAD_SUGGESTIONS: 'Impossible de charger les suggestions',
  LOAD_DESIGN: 'Impossible de charger le design email',

  // Creation errors
  CREATE_FAILED: 'Erreur lors de la création',
  CREATE_ORGANISATION: 'Erreur lors de la création de l\'organisation',
  CREATE_PERSON: 'Erreur lors de la création du contact',
  CREATE_CAMPAIGN: 'Erreur lors de la création de la campagne',
  CREATE_TEMPLATE: 'Erreur lors de la création du modèle',
  CREATE_ACTIVITY: 'Erreur lors de la création de l\'activité',

  // Update errors
  UPDATE_FAILED: 'Erreur lors de la mise à jour',
  UPDATE_ORGANISATION: 'Erreur lors de la mise à jour de l\'organisation',
  UPDATE_PERSON: 'Erreur lors de la mise à jour du contact',
  UPDATE_CAMPAIGN: 'Erreur lors de la mise à jour de la campagne',
  UPDATE_CONFIG: 'Erreur lors de la mise à jour de la configuration',

  // Delete errors
  DELETE_FAILED: 'Erreur lors de la suppression',
  DELETE_ORGANISATION: 'Erreur lors de la suppression de l\'organisation',
  DELETE_PERSON: 'Erreur lors de la suppression du contact',
  DELETE_CAMPAIGN: 'Erreur lors de la suppression de la campagne',

  // Import/Export errors
  IMPORT_FAILED: 'Erreur lors de l\'import',
  EXPORT_FAILED: 'Erreur lors de l\'export',
  FILE_TOO_LARGE: 'Le fichier est trop volumineux',
  INVALID_FILE_FORMAT: 'Format de fichier invalide',

  // Validation errors
  VALIDATION_FAILED: 'Erreur de validation',
  REQUIRED_FIELD: 'Ce champ est requis',
  INVALID_EMAIL: 'Email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  INVALID_URL: 'URL invalide',

  // AI errors
  AI_PROCESSING_FAILED: 'Erreur lors du traitement IA',
  AI_SUGGESTION_FAILED: 'Impossible de générer des suggestions',
  DUPLICATE_DETECTION_FAILED: 'Erreur lors de la détection de doublons',
  ENRICHMENT_FAILED: 'Erreur lors de l\'enrichissement',

  // Email errors
  SEND_EMAIL_FAILED: 'Erreur lors de l\'envoi de l\'email',
  SCHEDULE_EMAIL_FAILED: 'Erreur lors de la planification',
  CANCEL_CAMPAIGN_FAILED: 'Erreur lors de l\'annulation de la campagne',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  // Generic success
  OPERATION_SUCCESS: 'Opération réussie',
  SAVED: 'Enregistré avec succès',

  // Creation success
  CREATED: 'Créé avec succès',
  ORGANISATION_CREATED: 'Organisation créée avec succès',
  PERSON_CREATED: 'Contact créé avec succès',
  CAMPAIGN_CREATED: 'Campagne créée avec succès',
  TEMPLATE_CREATED: 'Modèle créé avec succès',
  ACTIVITY_CREATED: 'Activité créée avec succès',

  // Update success
  UPDATED: 'Mis à jour avec succès',
  ORGANISATION_UPDATED: 'Organisation mise à jour',
  PERSON_UPDATED: 'Contact mis à jour',
  CAMPAIGN_UPDATED: 'Campagne mise à jour',
  CONFIG_UPDATED: 'Configuration mise à jour',

  // Delete success
  DELETED: 'Supprimé avec succès',
  ORGANISATION_DELETED: 'Organisation supprimée',
  PERSON_DELETED: 'Contact supprimé',
  CAMPAIGN_DELETED: 'Campagne supprimée',

  // AI success
  SUGGESTION_APPROVED: 'Suggestion approuvée',
  SUGGESTION_REJECTED: 'Suggestion rejetée',
  SUGGESTIONS_APPROVED: (count: number) => `${count} suggestion(s) approuvée(s)`,
  SUGGESTIONS_REJECTED: (count: number) => `${count} suggestion(s) rejetée(s)`,
  DUPLICATES_DETECTED: (count: number) => `${count} doublon(s) détecté(s)`,
  ENRICHMENT_COMPLETE: 'Enrichissement terminé',

  // Email success
  EMAIL_SENT: 'Email envoyé avec succès',
  CAMPAIGN_SCHEDULED: 'Campagne planifiée',
  CAMPAIGN_CANCELLED: 'Campagne annulée',

  // Import/Export success
  IMPORT_SUCCESS: 'Import réussi',
  IMPORT_COMPLETE: (count: number) => `${count} élément(s) importé(s)`,
  EXPORT_SUCCESS: 'Export réussi',
  EXPORT_READY: 'Export prêt à télécharger',

  // Copy actions
  COPIED_TO_CLIPBOARD: 'Copié dans le presse-papier',
} as const;

/**
 * Info/Warning Messages
 */
export const INFO_MESSAGES = {
  // Loading states
  LOADING: 'Chargement...',
  LOADING_DATA: 'Chargement des données...',
  PROCESSING: 'Traitement en cours...',
  SAVING: 'Enregistrement...',

  // Empty states
  NO_DATA: 'Aucune donnée disponible',
  NO_RESULTS: 'Aucun résultat',
  NO_ORGANISATIONS: 'Aucune organisation',
  NO_PEOPLE: 'Aucun contact',
  NO_CAMPAIGNS: 'Aucune campagne',
  NO_TEMPLATES: 'Aucun modèle',
  NO_ACTIVITIES: 'Aucune activité',
  NO_SUGGESTIONS: 'Aucune suggestion',

  // Warnings
  UNSAVED_CHANGES: 'Modifications non enregistrées',
  CONFIRM_DELETE: 'Êtes-vous sûr de vouloir supprimer ?',
  CANNOT_UNDO: 'Cette action ne peut pas être annulée',
  LEAVING_PAGE: 'Voulez-vous vraiment quitter cette page ?',

  // Info
  SEARCH_MIN_LENGTH: (min: number) => `Saisissez au moins ${min} caractères`,
  SELECTED_ITEMS: (count: number) => `${count} élément(s) sélectionné(s)`,
  FILTERED_RESULTS: (count: number, total: number) => `${count} sur ${total} résultat(s)`,

  // Campaign status info
  CAMPAIGN_SENDING: 'Campagne en cours d\'envoi...',
  CAMPAIGN_SCHEDULED_INFO: (date: string) => `Planifiée pour le ${date}`,
  CAMPAIGN_DRAFT_INFO: 'Cette campagne est un brouillon',

  // AI info
  AI_PROCESSING: 'IA en cours de traitement...',
  AI_SUGGESTIONS_READY: (count: number) => `${count} nouvelle(s) suggestion(s)`,
  QUALITY_CHECK_RUNNING: 'Vérification de la qualité en cours...',
} as const;

/**
 * Confirmation Messages
 */
export const CONFIRM_MESSAGES = {
  DELETE_ORGANISATION: 'Êtes-vous sûr de vouloir supprimer cette organisation ?',
  DELETE_PERSON: 'Êtes-vous sûr de vouloir supprimer ce contact ?',
  DELETE_CAMPAIGN: 'Êtes-vous sûr de vouloir supprimer cette campagne ?',
  DELETE_TEMPLATE: 'Êtes-vous sûr de vouloir supprimer ce modèle ?',

  CANCEL_CAMPAIGN: 'Êtes-vous sûr de vouloir annuler cette campagne ?',
  SEND_CAMPAIGN: 'Êtes-vous sûr de vouloir envoyer cette campagne maintenant ?',

  APPROVE_SUGGESTION: 'Approuver cette suggestion ?',
  REJECT_SUGGESTION: 'Rejeter cette suggestion ?',
  APPROVE_ALL_SUGGESTIONS: (count: number) => `Approuver ${count} suggestion(s) ?`,
  REJECT_ALL_SUGGESTIONS: (count: number) => `Rejeter ${count} suggestion(s) ?`,

  DISCARD_CHANGES: 'Abandonner les modifications ?',
  OVERRIDE_DATA: 'Écraser les données existantes ?',
} as const;

/**
 * Validation Messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `Le champ "${field}" est requis`,
  MIN_LENGTH: (field: string, min: number) => `"${field}" doit contenir au moins ${min} caractères`,
  MAX_LENGTH: (field: string, max: number) => `"${field}" ne peut pas dépasser ${max} caractères`,
  INVALID_FORMAT: (field: string) => `Format de "${field}" invalide`,
  EMAIL_INVALID: 'Adresse email invalide',
  PHONE_INVALID: 'Numéro de téléphone invalide',
  URL_INVALID: 'URL invalide',
  DATE_INVALID: 'Date invalide',
  DATE_PAST: 'La date ne peut pas être dans le passé',
  DATE_FUTURE: 'La date ne peut pas être dans le futur',
} as const;

/**
 * Helper function to get error message from error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return ERROR_MESSAGES.GENERIC;
}

/**
 * Helper function to format API errors
 */
export function formatApiError(status: number): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.VALIDATION_FAILED;
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 408:
      return ERROR_MESSAGES.TIMEOUT;
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.GENERIC;
  }
}
