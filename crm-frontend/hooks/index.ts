// hooks/index.ts
// ============= EXPORTS HOOKS =============

export { useAuth } from './useAuth'
export { useInvestors } from './useInvestors'
export { useInteractions } from './useInteractions'
export { useKPIs } from './useKPIs'
export { useFournisseurs } from './useFournisseurs'
export { usePeople } from './usePeople'
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
