'use client'

import { useCallback, useMemo } from 'react'
import { useWorkflows } from './useWorkflows'

// Métadonnées enrichies pour les templates (côté frontend)
export interface WorkflowTemplateMetadata {
  category: 'appels' | 'reunions' | 'mailing' | 'relations' | 'reporting' | 'prospection' | 'contrats' | 'conformite' | 'collaboration' | 'partenariats' | 'formation'
  tags: string[]
  useCases: string[]
  difficulty: 'facile' | 'intermediaire' | 'avance'
  estimatedSetupTime: number // minutes
  prerequisites?: string
  icon: string
}

// Map ID workflow → métadonnées
const TEMPLATE_METADATA: Record<number, WorkflowTemplateMetadata> = {
  // === APPELS / RÉUNIONS ===
  21: {
    category: 'appels',
    tags: ['compte-rendu', 'automatisation', 'suivi'],
    useCases: ['Automatiser le suivi après chaque appel client', 'Ne jamais oublier d\'envoyer un CR'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    prerequisites: 'Webhook call_completed (ou exécution manuelle)',
    icon: '📞',
  },
  22: {
    category: 'appels',
    tags: ['prospection', 'qualification', 'relance'],
    useCases: ['Standardiser le suivi des appels prospects', 'Envoyer documentation automatiquement'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📞',
  },
  23: {
    category: 'reunions',
    tags: ['preparation', 'rappel', 'checklist'],
    useCases: ['Préparer réunions importantes', 'Ne jamais arriver non préparé'],
    difficulty: 'facile',
    estimatedSetupTime: 3,
    icon: '📅',
  },
  24: {
    category: 'reunions',
    tags: ['relance', 'suivi', 'inactivite'],
    useCases: ['Éviter les réunions sans suite', 'Relancer automatiquement après 7j'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '⏰',
  },

  // === MAILING / NEWSLETTERS ===
  25: {
    category: 'mailing',
    tags: ['engagement', 'newsletter', 'opportunite'],
    useCases: ['Identifier contacts engagés', 'Transformer ouvertures en opportunités'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    prerequisites: 'Webhook Resend configuré',
    icon: '📧',
  },
  26: {
    category: 'mailing',
    tags: ['hot-lead', 'newsletter', 'action-rapide'],
    useCases: ['Action commerciale rapide sur clics newsletter', 'Prioriser contacts très engagés'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    prerequisites: 'Webhook Resend configuré',
    icon: '🔥',
  },
  27: {
    category: 'mailing',
    tags: ['analyse', 'reporting', 'campagne'],
    useCases: ['Analyser performance campagnes', 'Identifier meilleurs contacts'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📊',
  },
  28: {
    category: 'mailing',
    tags: ['reactivation', 'inactivite', 'nurturing'],
    useCases: ['Réactiver contacts dormants', 'Éviter la perte de contacts inactifs'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🔄',
  },

  // === RELATIONS CLIENT / ONE-TO-ONE ===
  29: {
    category: 'relations',
    tags: ['vip', 'premium', 'suivi-renforce'],
    useCases: ['Suivi personnalisé clients à forte valeur', 'Routine VIP automatisée'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '⭐',
  },
  30: {
    category: 'relations',
    tags: ['anniversaire', 'fidelisation', 'satisfaction'],
    useCases: ['Célébrer anniversaires clients', 'Identifier opportunités upsell'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🎉',
  },
  31: {
    category: 'relations',
    tags: ['alerte', 'changement', 'decisionnaire'],
    useCases: ['Détecter changements de poste', 'Maintenir relations à jour'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    prerequisites: 'Intégration LinkedIn ou mise à jour manuelle',
    icon: '🔔',
  },
  32: {
    category: 'relations',
    tags: ['bilan', 'satisfaction', 'trimestriel'],
    useCases: ['Points réguliers clients', 'Satisfaction et opportunités'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📋',
  },

  // === PROSPECTION / NOUVEAUX CONTACTS ===
  33: {
    category: 'prospection',
    tags: ['onboarding', 'bienvenue', 'qualification'],
    useCases: ['Accueillir nouveaux contacts', 'Segmenter automatiquement'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '👋',
  },
  34: {
    category: 'prospection',
    tags: ['enrichissement', 'donnees', 'linkedin'],
    useCases: ['Compléter fiches contacts', 'Cartographier organisations'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '📝',
  },
  35: {
    category: 'prospection',
    tags: ['lead-scoring', 'priorisation', 'hot-lead'],
    useCases: ['Prioriser contacts chauds', 'Actions rapides sur forte engagement'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    prerequisites: 'Système de scoring configuré',
    icon: '🎯',
  },

  // === REPORTING / GESTION INTERNE ===
  36: {
    category: 'reporting',
    tags: ['rapport', 'hebdomadaire', 'statistiques'],
    useCases: ['Suivi activité hebdomadaire', 'KPIs automatiques'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📈',
  },
  37: {
    category: 'reporting',
    tags: ['taches', 'rappel', 'retard'],
    useCases: ['Éviter les tâches oubliées', 'Priorisation quotidienne'],
    difficulty: 'facile',
    estimatedSetupTime: 3,
    icon: '⚠️',
  },
  38: {
    category: 'reporting',
    tags: ['planification', 'organisation', 'lundi'],
    useCases: ['Démarrer semaine organisé', 'Définir priorités'],
    difficulty: 'facile',
    estimatedSetupTime: 3,
    icon: '🗓️',
  },
  39: {
    category: 'reporting',
    tags: ['alerte', 'opportunite', 'inactivite'],
    useCases: ['Éviter perte opportunités', 'Relances automatiques'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '⚠️',
  },
  40: {
    category: 'reporting',
    tags: ['bilan', 'mensuel', 'cloture'],
    useCases: ['Clôture mois automatique', 'Objectifs et KPIs'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📊',
  },

  // === NOUVEAUX TEMPLATES 41-100 (60 templates Finance B2B) ===

  41: {
    category: 'appels',
    tags: ['preparation', 'checklist', 'decouverte'],
    useCases: ['Préparer calls découverte'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📞',
  },
  42: {
    category: 'appels',
    tags: ['relance', 'multi-tentatives', 'persistance'],
    useCases: ['Suivre prospects difficiles à joindre'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '📞',
  },
  43: {
    category: 'reunions',
    tags: ['debriefing', 'compte-rendu', 'bant'],
    useCases: ['Standardiser process post-réunion'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    prerequisites: 'Webhook meeting_completed',
    icon: '📅',
  },
  44: {
    category: 'reunions',
    tags: ['rappel', 'visio', 'confirmation'],
    useCases: ['Confirmer RDV avec lien visio'],
    difficulty: 'facile',
    estimatedSetupTime: 3,
    icon: '📅',
  },
  45: {
    category: 'reunions',
    tags: ['escalade', 'annulation', 'urgence'],
    useCases: ['Gérer annulations dernière minute'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '⚠️',
  },
  46: {
    category: 'appels',
    tags: ['courtoisie', 'satisfaction', 'post-signature'],
    useCases: ['Maintenir relation post-vente'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '☎️',
  },
  47: {
    category: 'mailing',
    tags: ['segmentation', 'preparation', 'rgpd'],
    useCases: ['Préparer campagnes newsletter'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '📧',
  },
  48: {
    category: 'mailing',
    tags: ['ab-testing', 'analyse', 'optimisation'],
    useCases: ['Optimiser campagnes email'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    icon: '📊',
  },
  49: {
    category: 'mailing',
    tags: ['relance', 'non-ouvert', 'engagement'],
    useCases: ['Améliorer taux ouverture'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📨',
  },
  50: {
    category: 'mailing',
    tags: ['nettoyage', 'bounces', 'hygiene'],
    useCases: ['Maintenir qualité base emails'],
    difficulty: 'facile',
    estimatedSetupTime: 10,
    icon: '🧹',
  },
  51: {
    category: 'mailing',
    tags: ['scoring', 'engagement', 'segmentation'],
    useCases: ['Prioriser contacts engagés'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🎯',
  },
  52: {
    category: 'mailing',
    tags: ['winback', 'reactivation', 'churned'],
    useCases: ['Réactiver clients perdus'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🔄',
  },
  53: {
    category: 'relations',
    tags: ['onboarding', 'j30', 'satisfaction'],
    useCases: ['Valider onboarding client'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '✅',
  },
  54: {
    category: 'relations',
    tags: ['churn', 'alerte', 'retention'],
    useCases: ['Prévenir pertes clients'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    icon: '🚨',
  },
  55: {
    category: 'relations',
    tags: ['upsell', 'usage', 'upgrade'],
    useCases: ['Détecter opportunités upsell'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '⬆️',
  },
  56: {
    category: 'relations',
    tags: ['nps', 'detracteur', 'urgence'],
    useCases: ['Traiter détracteurs NPS'],
    difficulty: 'avance',
    estimatedSetupTime: 15,
    icon: '🚨',
  },
  57: {
    category: 'relations',
    tags: ['celebration', 'milestone', 'success'],
    useCases: ['Célébrer succès clients'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🎉',
  },
  58: {
    category: 'relations',
    tags: ['fidelite', 'paliers', 'programme'],
    useCases: ['Gérer programme fidélité'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '⭐',
  },
  59: {
    category: 'prospection',
    tags: ['qualification', 'bant', 'checklist'],
    useCases: ['Qualifier leads méthodique'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '✔️',
  },
  60: {
    category: 'prospection',
    tags: ['nurturing', 'maturation', 'lead-froid'],
    useCases: ['Maturer leads non qualifiés'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '🌱',
  },
  61: {
    category: 'prospection',
    tags: ['lead-chaud', 'scoring', 'priorite'],
    useCases: ['Action rapide leads chauds'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 5,
    icon: '🔥',
  },
  62: {
    category: 'prospection',
    tags: ['classification', 'source', 'tagging'],
    useCases: ['Identifier sources leads'],
    difficulty: 'facile',
    estimatedSetupTime: 3,
    icon: '🏷️',
  },
  63: {
    category: 'prospection',
    tags: ['linkedin', 'reseau', 'social-selling'],
    useCases: ['Gérer prospection LinkedIn'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    prerequisites: 'Intégration LinkedIn',
    icon: '💼',
  },
  64: {
    category: 'prospection',
    tags: ['evenement', 'salon', 'followup'],
    useCases: ['Suivre leads événements'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🎪',
  },
  65: {
    category: 'prospection',
    tags: ['round-robin', 'affectation', 'equitable'],
    useCases: ['Distribuer leads équitablement'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🔄',
  },
  66: {
    category: 'reporting',
    tags: ['dashboard', 'temps-reel', 'kpis'],
    useCases: ['Suivre KPIs en temps réel'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '📊',
  },
  67: {
    category: 'reporting',
    tags: ['objectifs', 'alerte', 'mensuel'],
    useCases: ['Alertes objectifs mensuels'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🎯',
  },
  68: {
    category: 'reporting',
    tags: ['forecast', 'previsions', 'pipeline'],
    useCases: ['Actualiser prévisions CA'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '📈',
  },
  69: {
    category: 'reporting',
    tags: ['analyse', 'echecs', 'amelioration'],
    useCases: ['Analyser deals perdus'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    icon: '📉',
  },
  70: {
    category: 'reporting',
    tags: ['manager', 'equipe', 'performance'],
    useCases: ['Piloter performance équipe'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '👥',
  },
  71: {
    category: 'contrats',
    tags: ['preparation', 'accord-verbal', 'documents'],
    useCases: ['Préparer contrats rapidement'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '📄',
  },
  72: {
    category: 'contrats',
    tags: ['signature', 'electronique', 'relance'],
    useCases: ['Accélérer signatures'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '✍️',
  },
  73: {
    category: 'contrats',
    tags: ['renouvellement', 'j-60', 'anticipation'],
    useCases: ['Anticiper renouvellements'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '🔄',
  },
  74: {
    category: 'contrats',
    tags: ['avenant', 'modification', 'validation'],
    useCases: ['Gérer avenants contractuels'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '📝',
  },
  75: {
    category: 'contrats',
    tags: ['resiliation', 'urgence', 'retention'],
    useCases: ['Traiter résiliations'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    icon: '🚨',
  },
  76: {
    category: 'contrats',
    tags: ['archivage', 'expiration', 'classement'],
    useCases: ['Archiver contrats expirés'],
    difficulty: 'facile',
    estimatedSetupTime: 10,
    icon: '📦',
  },
  77: {
    category: 'contrats',
    tags: ['conditions-speciales', 'validation', 'exception'],
    useCases: ['Valider conditions hors-standard'],
    difficulty: 'avance',
    estimatedSetupTime: 15,
    icon: '⚠️',
  },
  78: {
    category: 'contrats',
    tags: ['commissions', 'calcul', 'automatique'],
    useCases: ['Calculer commissions auto'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '💰',
  },
  79: {
    category: 'conformite',
    tags: ['rgpd', 'consentements', 'annuel'],
    useCases: ['Revalider consentements'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🔒',
  },
  80: {
    category: 'conformite',
    tags: ['dsar', 'acces-donnees', 'droit-personne'],
    useCases: ['Traiter demandes RGPD'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    prerequisites: 'DPO désigné',
    icon: '📋',
  },
  81: {
    category: 'conformite',
    tags: ['purge', 'inactifs', 'suppression'],
    useCases: ['Nettoyer données inactives'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🧹',
  },
  82: {
    category: 'conformite',
    tags: ['audit-trail', 'tracabilite', 'logging'],
    useCases: ['Tracer modifications'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '📝',
  },
  83: {
    category: 'conformite',
    tags: ['desabonnement', 'opt-out', 'marketing'],
    useCases: ['Gérer désabonnements'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🚫',
  },
  84: {
    category: 'conformite',
    tags: ['rapport', 'trimestriel', 'dpo'],
    useCases: ['Rapports conformité'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    prerequisites: 'DPO désigné',
    icon: '📊',
  },
  85: {
    category: 'collaboration',
    tags: ['passation', 'transfert', 'dossier'],
    useCases: ['Transférer dossiers'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🔄',
  },
  86: {
    category: 'collaboration',
    tags: ['support-technique', 'escalade', 'expertise'],
    useCases: ['Escalader questions techniques'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🛠️',
  },
  87: {
    category: 'collaboration',
    tags: ['validation', 'remise', 'manager'],
    useCases: ['Valider remises > 15%'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '✅',
  },
  88: {
    category: 'collaboration',
    tags: ['partage', 'best-practice', 'learning'],
    useCases: ['Partager succès équipe'],
    difficulty: 'facile',
    estimatedSetupTime: 10,
    icon: '🎓',
  },
  89: {
    category: 'collaboration',
    tags: ['review', 'compte-strategique', 'trimestriel'],
    useCases: ['Reviewer comptes clés'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 20,
    icon: '📋',
  },
  90: {
    category: 'collaboration',
    tags: ['absence', 'backup', 'continuite'],
    useCases: ['Gérer absences longues'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🔄',
  },
  91: {
    category: 'partenariats',
    tags: ['onboarding', 'partenaire', 'formation'],
    useCases: ['Accueillir nouveaux partenaires'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🤝',
  },
  92: {
    category: 'partenariats',
    tags: ['recommandation', 'apporteur', 'suivi'],
    useCases: ['Suivre leads partenaires'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '🎁',
  },
  93: {
    category: 'partenariats',
    tags: ['commissions', 'apporteur', 'calcul'],
    useCases: ['Rémunérer apporteurs'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '💰',
  },
  94: {
    category: 'partenariats',
    tags: ['temoignage', 'case-study', 'marketing'],
    useCases: ['Récolter témoignages'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '⭐',
  },
  95: {
    category: 'partenariats',
    tags: ['evenement', 'networking', 'invitation'],
    useCases: ['Organiser événements réseau'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 20,
    icon: '🎉',
  },
  96: {
    category: 'formation',
    tags: ['formation-client', 'onboarding', 'produit'],
    useCases: ['Former nouveaux clients'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 15,
    icon: '🎓',
  },
  97: {
    category: 'formation',
    tags: ['webinar', 'prospects', 'demonstration'],
    useCases: ['Organiser webinars'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 20,
    icon: '🖥️',
  },
  98: {
    category: 'formation',
    tags: ['progression', 'evaluation', 'competences'],
    useCases: ['Suivre progression formation'],
    difficulty: 'intermediaire',
    estimatedSetupTime: 10,
    icon: '📈',
  },
  99: {
    category: 'formation',
    tags: ['ressources', 'self-service', 'autonomie'],
    useCases: ['Partager ressources'],
    difficulty: 'facile',
    estimatedSetupTime: 5,
    icon: '📚',
  },
  100: {
    category: 'formation',
    tags: ['certification', 'avance', 'expertise'],
    useCases: ['Certifier utilisateurs'],
    difficulty: 'avance',
    estimatedSetupTime: 20,
    icon: '🏆',
  },
}

export const useWorkflowTemplates = () => {
  const { workflows, isLoading, error, duplicateWorkflow, operation } = useWorkflows()

  // Filtrer uniquement les templates avec métadonnées enrichies
  const templates = useMemo(() => {
    if (!workflows) return []

    return workflows
      .filter(w => w.is_template && TEMPLATE_METADATA[w.id])
      .map(w => ({
        ...w,
        metadata: TEMPLATE_METADATA[w.id],
      }))
  }, [workflows])

  // Fonction de recherche fulltext
  const searchTemplates = useCallback((query: string) => {
    if (!query.trim()) return templates

    const lowerQuery = query.toLowerCase()

    return templates.filter(t => {
      const metadata = t.metadata
      return (
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        metadata.useCases.some(uc => uc.toLowerCase().includes(lowerQuery)) ||
        metadata.category.toLowerCase().includes(lowerQuery) ||
        t.trigger_type.toLowerCase().includes(lowerQuery)
      )
    })
  }, [templates])

  // Filtrage par catégorie
  const filterByCategory = useCallback((category: string | null) => {
    if (!category || category === 'all') return templates
    return templates.filter(t => t.metadata.category === category)
  }, [templates])

  // Filtrage par trigger
  const filterByTrigger = useCallback((trigger: string | null) => {
    if (!trigger || trigger === 'all') return templates
    return templates.filter(t => t.trigger_type === trigger)
  }, [templates])

  // Filtrage par difficulté
  const filterByDifficulty = useCallback((difficulty: string | null) => {
    if (!difficulty || difficulty === 'all') return templates
    return templates.filter(t => t.metadata.difficulty === difficulty)
  }, [templates])

  // Filtrage combiné
  const filterTemplates = useCallback((filters: {
    search?: string
    category?: string | null
    trigger?: string | null
    difficulty?: string | null
  }) => {
    let result = templates

    if (filters.search) {
      result = searchTemplates(filters.search)
    }

    if (filters.category && filters.category !== 'all') {
      result = result.filter(t => t.metadata.category === filters.category)
    }

    if (filters.trigger && filters.trigger !== 'all') {
      result = result.filter(t => t.trigger_type === filters.trigger)
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      result = result.filter(t => t.metadata.difficulty === filters.difficulty)
    }

    return result
  }, [templates, searchTemplates])

  // Statistiques
  const stats = useMemo(() => {
    const categories = templates.reduce((acc, t) => {
      acc[t.metadata.category] = (acc[t.metadata.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const triggers = templates.reduce((acc, t) => {
      acc[t.trigger_type] = (acc[t.trigger_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const difficulties = templates.reduce((acc, t) => {
      acc[t.metadata.difficulty] = (acc[t.metadata.difficulty] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: templates.length,
      categories,
      triggers,
      difficulties,
    }
  }, [templates])

  return {
    templates,
    isLoading,
    error,
    searchTemplates,
    filterByCategory,
    filterByTrigger,
    filterByDifficulty,
    filterTemplates,
    duplicateTemplate: duplicateWorkflow,
    operation,
    stats,
  }
}
