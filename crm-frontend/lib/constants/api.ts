/**
 * API Endpoint Constants
 *
 * Centralized API endpoint definitions to avoid magic strings
 * and facilitate endpoint management.
 */

// Base API URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const API_VERSION = '/api/v1';

// Full base path
export const API_BASE_PATH = `${API_BASE_URL}${API_VERSION}`;

/**
 * AI Module Endpoints
 */
export const AI_ENDPOINTS = {
  // Suggestions
  SUGGESTIONS: '/api/v1/ai/suggestions',
  SUGGESTION_APPROVE: (id: string | number) => `/api/v1/ai/suggestions/${id}/approve`,
  SUGGESTION_REJECT: (id: string | number) => `/api/v1/ai/suggestions/${id}/reject`,
  SUGGESTIONS_BATCH_APPROVE: '/api/v1/ai/suggestions/batch/approve',
  SUGGESTIONS_BATCH_REJECT: '/api/v1/ai/suggestions/batch/reject',

  // Executions
  EXECUTIONS: '/api/v1/ai/executions',
  EXECUTION_DETAIL: (id: string | number) => `/api/v1/ai/executions/${id}`,

  // Statistics & Config
  STATISTICS: '/api/v1/ai/statistics',
  CONFIG: '/api/v1/ai/config',

  // AI Operations
  DUPLICATES_DETECT: '/api/v1/ai/duplicates/detect',
  ENRICH_ORGANISATIONS: '/api/v1/ai/enrich/organisations',
  QUALITY_CHECK: '/api/v1/ai/quality/check',

  // Autofill
  AUTOFILL_SUGGESTIONS: '/api/v1/ai/autofill/suggestions',
} as const;

/**
 * Organisation Module Endpoints
 */
export const ORGANISATION_ENDPOINTS = {
  BASE: '/api/v1/organisations',
  DETAIL: (id: string | number) => `/api/v1/organisations/${id}`,
  ACTIVITIES: (id: string | number) => `/api/v1/organisations/${id}/activities/with-participants`,
  RECENT_ACTIVITIES: (id: string | number) => `/api/v1/organisations/${id}/activities/recent`,
  CONTACTS: (id: string | number) => `/api/v1/organisations/${id}/contacts`,
  MANDATS: (id: string | number) => `/api/v1/organisations/${id}/mandats`,
  BULK_DELETE: '/api/v1/organisations/bulk-delete',
} as const;

/**
 * People Module Endpoints
 */
export const PEOPLE_ENDPOINTS = {
  BASE: '/api/v1/people',
  DETAIL: (id: string | number) => `/api/v1/people/${id}`,
  ACTIVITIES: (id: string | number) => `/api/v1/people/${id}/activities`,
  BULK_DELETE: '/api/v1/people/bulk-delete',
} as const;

/**
 * Email Campaign Endpoints
 */
export const EMAIL_ENDPOINTS = {
  CAMPAIGNS: '/api/v1/email/campaigns',
  CAMPAIGN_DETAIL: (id: string | number) => `/api/v1/email/campaigns/${id}`,
  CAMPAIGN_SEND: (id: string | number) => `/api/v1/email/campaigns/${id}/send`,
  CAMPAIGN_SCHEDULE: (id: string | number) => `/api/v1/email/campaigns/${id}/schedule`,
  CAMPAIGN_CANCEL: (id: string | number) => `/api/v1/email/campaigns/${id}/cancel`,
  CAMPAIGN_STATS: (id: string | number) => `/api/v1/email/campaigns/${id}/stats`,

  TEMPLATES: '/api/v1/email/templates',
  TEMPLATE_DETAIL: (id: string | number) => `/api/v1/email/templates/${id}`,

  RECIPIENTS_LIST: '/email/campaigns/recipients/list',

  // Email API configuration
  EMAIL_APIS: '/api/v1/email-apis',
  EMAIL_API_DETAIL: (id: string | number) => `/api/v1/email-apis/${id}`,

  // Email accounts (multi-mail)
  EMAIL_ACCOUNTS: '/api/v1/email-accounts',
  EMAIL_ACCOUNT_DETAIL: (id: string | number) => `/api/v1/email-accounts/${id}`,
} as const;

/**
 * Interaction Endpoints
 */
export const INTERACTION_ENDPOINTS = {
  BASE: '/api/v1/interactions',
  DETAIL: (id: string | number) => `/api/v1/interactions/${id}`,
} as const;

/**
 * Import Endpoints
 */
export const IMPORT_ENDPOINTS = {
  ORGANISATIONS_BULK: '/api/v1/imports/organisations/bulk',
  PEOPLE_BULK: '/api/v1/imports/people/bulk',
} as const;

/**
 * Monitoring Endpoints
 */
export const MONITORING_ENDPOINTS = {
  HEALTH: '/api/v1/monitoring/health',
  CACHE: '/api/v1/monitoring/cache',
  GDPR: '/api/v1/monitoring/gdpr',
  METRICS: '/api/v1/monitoring/metrics',
} as const;

/**
 * Workflow Endpoints
 */
export const WORKFLOW_ENDPOINTS = {
  BASE: '/api/v1/workflows',
  DETAIL: (id: string | number) => `/api/v1/workflows/${id}`,
  EXECUTE: (id: string | number) => `/api/v1/workflows/${id}/execute`,
} as const;

/**
 * Search Endpoints
 */
export const SEARCH_ENDPOINTS = {
  GLOBAL: '/api/search',
  ORGANISATIONS: '/api/v1/organisations/search',
  PEOPLE: '/api/v1/people/search',
} as const;

/**
 * Authentication Endpoints
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh',
  VERIFY: '/api/v1/auth/verify',
} as const;

/**
 * RGPD/Privacy Endpoints
 */
export const RGPD_ENDPOINTS = {
  ACCESS_LOGS: '/api/v1/rgpd/access-logs',
  EXPORT_DATA: '/api/v1/rgpd/export',
  DELETE_DATA: '/api/v1/rgpd/delete',
  CONSENT: '/api/v1/rgpd/consent',
} as const;
