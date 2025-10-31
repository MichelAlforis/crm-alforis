// lib/api/index.ts
// ============= API CLIENT - MODULAR ARCHITECTURE =============
// This file provides backward compatibility while exposing the new modular structure

import { BaseHttpClient } from './core/client'

// Import all modules
import { authAPI, AuthAPI } from './modules/auth'
import { organisationsAPI, OrganisationsAPI } from './modules/organisations'
import { peopleAPI, PeopleAPI } from './modules/people'
import { mandatsAPI, MandatsAPI } from './modules/mandats'
import { produitsAPI, ProduitsAPI } from './modules/produits'
import { tasksAPI, TasksAPI } from './modules/tasks'
import { emailAPI, EmailAPI } from './modules/email'
import { webhooksAPI, WebhooksAPI } from './modules/webhooks'
import { aiAPI, AIAPI } from './modules/ai'
import { kpiAPI, KPIAPI } from './modules/kpi'
import { dashboardAPI, DashboardAPI } from './modules/dashboard'
import { integrationsAPI, IntegrationsAPI } from './modules/integrations'
import { searchAPI, SearchAPI } from './modules/search'

// ============= LEGACY API CLIENT (Backward Compatibility) =============
// Combines all modules into a single class to maintain backward compatibility

class ApiClient extends BaseHttpClient {
  // Instantiate all modules
  private auth = new AuthAPI()
  private orgs = new OrganisationsAPI()
  private ppl = new PeopleAPI()
  private mands = new MandatsAPI()
  private prods = new ProduitsAPI()
  private tsks = new TasksAPI()
  private eml = new EmailAPI()
  private hooks = new WebhooksAPI()
  private ai = new AIAPI()
  private kpis = new KPIAPI()
  private dash = new DashboardAPI()
  private integs = new IntegrationsAPI()
  private srch = new SearchAPI()

  // ============= AUTH METHODS =============
  login = this.auth.login.bind(this.auth)
  getCurrentUser = this.auth.getCurrentUser.bind(this.auth)
  logout = this.auth.logout.bind(this.auth)
  changePassword = this.auth.changePassword.bind(this.auth)
  updateProfile = this.auth.updateProfile.bind(this.auth)
  healthCheck = this.auth.healthCheck.bind(this.auth)

  // ============= SEARCH METHODS =============
  searchAutocomplete = this.srch.searchAutocomplete.bind(this.srch)

  // ============= PEOPLE METHODS =============
  getPeople = this.ppl.getPeople.bind(this.ppl)
  getPerson = this.ppl.getPerson.bind(this.ppl)
  createPerson = this.ppl.createPerson.bind(this.ppl)
  updatePerson = this.ppl.updatePerson.bind(this.ppl)
  deletePerson = this.ppl.deletePerson.bind(this.ppl)
  createPersonOrganizationLink = this.ppl.createPersonOrganizationLink.bind(this.ppl)
  updatePersonOrganizationLink = this.ppl.updatePersonOrganizationLink.bind(this.ppl)
  deletePersonOrganizationLink = this.ppl.deletePersonOrganizationLink.bind(this.ppl)

  // ============= ORGANISATIONS METHODS =============
  getOrganisations = this.orgs.getOrganisations.bind(this.orgs)
  getOrganisation = this.orgs.getOrganisation.bind(this.orgs)
  createOrganisation = this.orgs.createOrganisation.bind(this.orgs)
  updateOrganisation = this.orgs.updateOrganisation.bind(this.orgs)
  deleteOrganisation = this.orgs.deleteOrganisation.bind(this.orgs)
  getOrganisationActivity = this.orgs.getOrganisationActivity.bind(this.orgs)
  getActivityWidget = this.orgs.getActivityWidget.bind(this.orgs)
  searchOrganisations = this.orgs.searchOrganisations.bind(this.orgs)
  getOrganisationsByLanguage = this.orgs.getOrganisationsByLanguage.bind(this.orgs)
  getOrganisationsStats = this.orgs.getOrganisationsStats.bind(this.orgs)

  // ============= MANDATS METHODS =============
  getMandats = this.mands.getMandats.bind(this.mands)
  getMandat = this.mands.getMandat.bind(this.mands)
  getActiveMandats = this.mands.getActiveMandats.bind(this.mands)
  getMandatsByOrganisation = this.mands.getMandatsByOrganisation.bind(this.mands)
  checkMandatActif = this.mands.checkMandatActif.bind(this.mands)
  createMandat = this.mands.createMandat.bind(this.mands)
  updateMandat = this.mands.updateMandat.bind(this.mands)
  deleteMandat = this.mands.deleteMandat.bind(this.mands)

  // ============= PRODUITS METHODS =============
  getProduits = this.prods.getProduits.bind(this.prods)
  getProduit = this.prods.getProduit.bind(this.prods)
  searchProduits = this.prods.searchProduits.bind(this.prods)
  getProduitByIsin = this.prods.getProduitByIsin.bind(this.prods)
  getProduitsByMandat = this.prods.getProduitsByMandat.bind(this.prods)
  createProduit = this.prods.createProduit.bind(this.prods)
  updateProduit = this.prods.updateProduit.bind(this.prods)
  deleteProduit = this.prods.deleteProduit.bind(this.prods)
  associateProduitToMandat = this.prods.associateProduitToMandat.bind(this.prods)
  deleteMandatProduitAssociation = this.prods.deleteMandatProduitAssociation.bind(this.prods)

  // ============= TASKS METHODS =============
  getTasks = this.tsks.getTasks.bind(this.tsks)
  getTask = this.tsks.getTask.bind(this.tsks)
  getTaskStats = this.tsks.getTaskStats.bind(this.tsks)
  createTask = this.tsks.createTask.bind(this.tsks)
  updateTask = this.tsks.updateTask.bind(this.tsks)
  deleteTask = this.tsks.deleteTask.bind(this.tsks)
  snoozeTask = this.tsks.snoozeTask.bind(this.tsks)
  quickActionTask = this.tsks.quickActionTask.bind(this.tsks)

  // ============= EMAIL METHODS =============
  getEmailTemplates = this.eml.getEmailTemplates.bind(this.eml)
  createEmailTemplate = this.eml.createEmailTemplate.bind(this.eml)
  updateEmailTemplate = this.eml.updateEmailTemplate.bind(this.eml)
  getEmailCampaigns = this.eml.getEmailCampaigns.bind(this.eml)
  getEmailCampaign = this.eml.getEmailCampaign.bind(this.eml)
  createEmailCampaign = this.eml.createEmailCampaign.bind(this.eml)
  updateEmailCampaign = this.eml.updateEmailCampaign.bind(this.eml)
  scheduleEmailCampaign = this.eml.scheduleEmailCampaign.bind(this.eml)
  getEmailCampaignStats = this.eml.getEmailCampaignStats.bind(this.eml)
  getEmailCampaignSends = this.eml.getEmailCampaignSends.bind(this.eml)
  getNewsletters = this.eml.getNewsletters.bind(this.eml)
  createNewsletter = this.eml.createNewsletter.bind(this.eml)
  sendNewsletter = this.eml.sendNewsletter.bind(this.eml)
  deleteNewsletter = this.eml.deleteNewsletter.bind(this.eml)

  // ============= WEBHOOKS METHODS =============
  getWebhooks = this.hooks.getWebhooks.bind(this.hooks)
  getWebhook = this.hooks.getWebhook.bind(this.hooks)
  createWebhook = this.hooks.createWebhook.bind(this.hooks)
  updateWebhook = this.hooks.updateWebhook.bind(this.hooks)
  deleteWebhook = this.hooks.deleteWebhook.bind(this.hooks)
  rotateWebhookSecret = this.hooks.rotateWebhookSecret.bind(this.hooks)
  getWebhookEvents = this.hooks.getWebhookEvents.bind(this.hooks)

  // ============= AI METHODS =============
  getAutofillStats = this.ai.getAutofillStats.bind(this.ai)
  getAutofillTimeline = this.ai.getAutofillTimeline.bind(this.ai)
  getAutofillLeaderboard = this.ai.getAutofillLeaderboard.bind(this.ai)

  // ============= KPI METHODS =============
  getKPIs = this.kpis.getKPIs.bind(this.kpis)
  getKPI = this.kpis.getKPI.bind(this.kpis)
  createKPI = this.kpis.createKPI.bind(this.kpis)
  updateKPI = this.kpis.updateKPI.bind(this.kpis)
  deleteKPI = this.kpis.deleteKPI.bind(this.kpis)

  // ============= DASHBOARD METHODS =============
  getGlobalDashboardStats = this.dash.getGlobalDashboardStats.bind(this.dash)
  getOrganisationStats = this.dash.getOrganisationStats.bind(this.dash)
  getMonthlyAggregateStats = this.dash.getMonthlyAggregateStats.bind(this.dash)
  getYearlyAggregateStats = this.dash.getYearlyAggregateStats.bind(this.dash)

  // ============= INTEGRATIONS METHODS =============
  outlookAuthorize = this.integs.outlookAuthorize.bind(this.integs)
  outlookCallback = this.integs.outlookCallback.bind(this.integs)
  outlookSync = this.integs.outlookSync.bind(this.integs)
  outlookGetSignatures = this.integs.outlookGetSignatures.bind(this.integs)
  outlookDisconnect = this.integs.outlookDisconnect.bind(this.integs)
  outlookDeleteData = this.integs.outlookDeleteData.bind(this.integs)
  outlookGetProfile = this.integs.outlookGetProfile.bind(this.integs)
}

// ============= EXPORTS =============

// LEGACY EXPORT (Backward compatibility - OLD WAY)
export const apiClient = new ApiClient()

// NEW MODULAR EXPORTS (Recommended for new code)
export {
  authAPI,
  organisationsAPI,
  peopleAPI,
  mandatsAPI,
  produitsAPI,
  tasksAPI,
  emailAPI,
  webhooksAPI,
  aiAPI,
  kpiAPI,
  dashboardAPI,
  integrationsAPI,
  searchAPI,
}

// Export module classes for advanced usage
export {
  AuthAPI,
  OrganisationsAPI,
  PeopleAPI,
  MandatsAPI,
  ProduitsAPI,
  TasksAPI,
  EmailAPI,
  WebhooksAPI,
  AIAPI,
  KPIAPI,
  DashboardAPI,
  IntegrationsAPI,
  SearchAPI,
}

// Export base client for custom extensions
export { BaseHttpClient } from './core/client'
