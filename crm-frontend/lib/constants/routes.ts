/**
 * Application Route Constants
 *
 * Centralized route definitions for navigation throughout the app.
 * Use these instead of hardcoded strings in router.push(), Link href, etc.
 */

/**
 * Dashboard Routes
 */
export const ROUTES = {
  // Root
  HOME: '/',
  DASHBOARD: '/dashboard',

  // CRM Module
  CRM: {
    BASE: '/dashboard/crm',
    ORGANISATIONS: '/dashboard/organisations',
    ORGANISATION_DETAIL: (id: string | number) => `/dashboard/organisations/${id}`,
    ORGANISATION_NEW: '/dashboard/organisations/new',

    PEOPLE: '/dashboard/people',
    PERSON_DETAIL: (id: string | number) => `/dashboard/people/${id}`,
    PERSON_NEW: '/dashboard/people/new',

    MANDATS: '/dashboard/mandats',
    MANDAT_DETAIL: (id: string | number) => `/dashboard/mandats/${id}`,
    MANDAT_NEW: '/dashboard/mandats/new',

    PRODUITS: '/dashboard/produits',
    PRODUIT_DETAIL: (id: string | number) => `/dashboard/produits/${id}`,
    PRODUIT_NEW: '/dashboard/produits/new',
  },

  // AI Module
  AI: {
    BASE: '/dashboard/ai',
    SUGGESTIONS: '/dashboard/ai/suggestions',
    CONFIG: '/dashboard/ai/config',
    EXECUTIONS: '/dashboard/ai/executions',
    ANALYTICS: '/dashboard/ai/analytics',
  },

  // Marketing Module
  MARKETING: {
    BASE: '/dashboard/marketing',
    CAMPAIGNS: '/dashboard/marketing/campaigns',
    CAMPAIGN_DETAIL: (id: string | number) => `/dashboard/marketing/campaigns/${id}`,
    CAMPAIGN_NEW: '/dashboard/marketing/campaigns/new',

    TEMPLATES: '/dashboard/marketing/templates',
    TEMPLATE_DETAIL: (id: string | number) => `/dashboard/marketing/templates/${id}`,
    TEMPLATE_NEW: '/dashboard/marketing/templates/new',

    MAILING_LISTS: '/dashboard/marketing/mailing-lists',
    MAILING_LIST_DETAIL: (id: string | number) => `/dashboard/marketing/mailing-lists/${id}`,
    MAILING_LIST_NEW: '/dashboard/marketing/mailing-lists/new',
  },

  // Email Campaigns (Legacy - consider merging with Marketing)
  EMAIL: {
    CAMPAIGNS: '/dashboard/email-campaigns',
    CAMPAIGN_DETAIL: (id: string | number) => `/dashboard/email-campaigns/${id}`,
    CAMPAIGN_NEW: '/dashboard/email-campaigns/new',

    TEMPLATES: '/dashboard/email-templates',
    TEMPLATE_DETAIL: (id: string | number) => `/dashboard/email-templates/${id}`,
    TEMPLATE_NEW: '/dashboard/email-templates/new',

    EMAIL_APIS: '/dashboard/email-apis',
  },

  // Workflows
  WORKFLOWS: {
    BASE: '/dashboard/workflows',
    WORKFLOW_DETAIL: (id: string | number) => `/dashboard/workflows/${id}`,
    WORKFLOW_NEW: '/dashboard/workflows/new',
  },

  // Tasks
  TASKS: {
    BASE: '/dashboard/tasks',
    KANBAN: '/dashboard/tasks/kanban',
    LIST: '/dashboard/tasks/list',
    CALENDAR: '/dashboard/tasks/calendar',
  },

  // KPIs & Analytics
  ANALYTICS: {
    KPIS: '/dashboard/kpis',
    REPORTS: '/dashboard/reports',
    MONITORING: '/dashboard/monitoring',
  },

  // Settings
  SETTINGS: {
    BASE: '/dashboard/settings',
    PROFILE: '/dashboard/settings/profile',
    TEAM: '/dashboard/settings/team',
    INTEGRATIONS: '/dashboard/settings/integrations',
    SIDEBAR_ANALYTICS: '/dashboard/settings/sidebar-analytics',
    RGPD: '/dashboard/settings/rgpd',
    PREFERENCES: '/dashboard/settings/preferences',
  },

  // Authentication
  AUTH: {
    LOGIN: '/login',
    LOGOUT: '/logout',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
} as const;

/**
 * External Routes
 */
export const EXTERNAL_ROUTES = {
  DOCS: 'https://docs.example.com',
  SUPPORT: 'https://support.example.com',
  BLOG: 'https://blog.example.com',
} as const;

/**
 * Helper function to check if a route is active
 */
export function isRouteActive(currentPath: string, targetRoute: string): boolean {
  return currentPath.startsWith(targetRoute);
}

/**
 * Helper to build query string
 */
export function withQuery(route: string, params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  return `${route}?${searchParams.toString()}`;
}
