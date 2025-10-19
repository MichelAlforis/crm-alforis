// hooks/index.ts
// ============= EXPORTS HOOKS =============

export { useAuth } from './useAuth'
export { usePeople } from './usePeople'

// Note: Legacy hooks have been removed (Phase 5 migration):
// - useInteractions → Use useOrganisationActivity instead
// - useKPIs → Use endpoints directly from /dashboards/stats

export {
  useOrganisations,
  useOrganisation,
  useSearchOrganisations,
  useOrganisationsByLanguage,
  useOrganisationStats,
  useCreateOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
} from './useOrganisations'
export {
  useMandats,
  useMandat,
  useActiveMandats,
  useMandatsByOrganisation,
  useCheckMandatActif,
  useCreateMandat,
  useUpdateMandat,
  useDeleteMandat,
} from './useMandats'
export {
  useProduits,
  useProduit,
  useSearchProduits,
  useProduitByIsin,
  useProduitsByMandat,
  useCreateProduit,
  useUpdateProduit,
  useDeleteProduit,
  useAssociateProduitToMandat,
  useDeleteMandatProduitAssociation,
} from './useProduits'
export {
  useBillingSummary,
  useTeamOverview,
  useSecurityEvents,
  useIntegrationsConfig,
  type IntegrationOptionKey,
} from './useSettingsData'
export { useNotifications } from './useNotifications'
export {
  useWebhooks,
  useWebhook,
  useWebhookEvents,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useRotateWebhookSecret,
} from './useWebhooks'
export {
  useEmailTemplates,
  useEmailCampaigns,
  useEmailCampaign,
  useEmailCampaignStats,
  useEmailCampaignSends,
} from './useEmailAutomation'
