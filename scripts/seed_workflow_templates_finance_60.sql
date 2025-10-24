-- 60 Templates Workflows Finance B2B supplémentaires
-- Pour atteindre 80 templates au total (20 existants + 60 nouveaux)
-- Usage: psql -U crm_user -d crm_db -f scripts/seed_workflow_templates_finance_60.sql

-- ========================================
-- APPELS / RÉUNIONS (+6 templates)
-- ========================================

-- 41. Préparation appel découverte
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Préparation appel découverte prospect',
  'Checklist automatique avant premier appel avec nouveau prospect qualifié',
  'ORGANISATION_UPDATED',
  '{"condition": "tag = ''Prospect qualifié''"}',
  '[
    {"type": "create_task", "config": {"title": "Rechercher LinkedIn profil décisionnaire", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Analyser site web et actualités entreprise", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Préparer 3 questions de découverte", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Appel découverte à préparer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 42. Suivi multi-tentatives appel
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Suivi multi-tentatives appel infructueux',
  'Relance progressive après 3 tentatives d''appel sans réponse',
  'INACTIVITY_DELAY',
  '{"delay_days": 3, "entity_type": "organisation", "condition": "call_attempts >= 3"}',
  '[
    {"type": "send_email", "config": {"template": "call_followup", "subject": "Plusieurs tentatives pour vous joindre"}},
    {"type": "create_task", "config": {"title": "Essayer horaire alternatif (8h ou 18h)", "due_days": 1}},
    {"type": "add_tag", "config": {"tag": "Difficile à joindre"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 43. Debriefing réunion commerciale
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Debriefing post-réunion commerciale',
  'Actions standardisées immédiatement après réunion commerciale importante',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "meeting_completed", "filter": {"meeting_type": "commercial"}}',
  '[
    {"type": "create_task", "config": {"title": "Rédiger compte-rendu (BANT, objections, timeline)", "due_days": 0, "priority": "high"}},
    {"type": "create_task", "config": {"title": "Envoyer CR et prochaines étapes au prospect", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Mettre à jour prévisions pipeline", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Débriefing réunion requis"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 44. Confirmation RDV J-1 avec visio link
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Confirmation RDV J-1 avec lien visio',
  'Rappel automatique avec lien visioconférence 24h avant rendez-vous',
  'SCHEDULED',
  '{"cron": "0 10 * * *", "check": "meetings_tomorrow"}',
  '[
    {"type": "send_email", "config": {"template": "meeting_reminder_visio", "subject": "Demain : RDV avec lien visio"}},
    {"type": "send_notification", "config": {"message": "RDV demain - Lien visio envoyé"}},
    {"type": "create_task", "config": {"title": "Vérifier fonctionnement caméra/micro", "due_days": 0}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 45. Escalade rendez-vous annulé dernière minute
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Escalade RDV annulé dernière minute',
  'Gestion proactive si prospect annule < 24h avant rendez-vous',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "meeting_cancelled", "filter": {"hours_before": 24}}',
  '[
    {"type": "send_email", "config": {"template": "reschedule_asap", "subject": "Replanifions rapidement"}},
    {"type": "create_task", "config": {"title": "Appeler pour comprendre raison annulation", "due_days": 0, "priority": "high"}},
    {"type": "send_notification", "config": {"message": "⚠️ RDV annulé dernière minute", "priority": "high"}},
    {"type": "add_tag", "config": {"tag": "Annulation tardive"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 46. Appel de courtoisie post-signature
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Appel courtoisie J+7 après signature',
  'Prise de température satisfaction client 7 jours après signature contrat',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed", "delay_days": 7}',
  '[
    {"type": "create_task", "config": {"title": "Appel courtoisie - Tout se passe bien ?", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Identifier besoins complémentaires", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Appel courtoisie J+7 à programmer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- MAILING / NEWSLETTERS (+6 templates)
-- ========================================

-- 47. Segmentation automatique newsletter
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Segmentation auto avant envoi newsletter',
  'Vérification et mise à jour segments avant campagne newsletter mensuelle',
  'SCHEDULED',
  '{"cron": "0 9 25 * *"}',
  '[
    {"type": "create_task", "config": {"title": "Vérifier segments newsletter (actifs/VIP/prospects)", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Exclure contacts inactifs 180j+", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Valider conformité RGPD segments", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Préparation newsletter J-5"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 48. A/B Testing analyse résultats
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Analyse A/B testing campagne email',
  'Analyse comparative automatique des variantes A/B après envoi',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "campaign_completed", "filter": {"has_ab_test": true}}',
  '[
    {"type": "create_task", "config": {"title": "Analyser taux ouverture A vs B", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Analyser taux clic A vs B", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Choisir variante gagnante pour prochaine campagne", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Résultats A/B test disponibles"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 49. Relance email non ouvert J+3
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Relance automatique email non ouvert J+3',
  'Renvoie email avec objet différent si pas ouvert après 3 jours',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "email_not_opened", "delay_days": 3}',
  '[
    {"type": "send_email", "config": {"template": "resend_different_subject", "subject": "On essaie différemment..."}},
    {"type": "add_tag", "config": {"tag": "Nécessite relance"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 50. Nettoyage bounces et désabonnements
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Nettoyage hebdo bounces et désabonnements',
  'Mise à jour automatique statuts contacts avec emails invalides',
  'SCHEDULED',
  '{"cron": "0 8 * * 1"}',
  '[
    {"type": "create_task", "config": {"title": "Marquer bounces permanents comme inactifs", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Vérifier conformité désabonnements RGPD", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Nettoyage hebdo emails requis"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 51. Scoring engagement email
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Scoring automatique engagement email',
  'Attribution score engagement basé sur historique interactions emails',
  'SCHEDULED',
  '{"cron": "0 2 1 * *"}',
  '[
    {"type": "create_task", "config": {"title": "Calculer score engagement (opens + clicks)", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Segmenter : Très engagés / Moyens / Faibles", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Scoring engagement mensuel terminé"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 52. Campagne réactivation churned
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Campagne win-back clients perdus',
  'Tentative réactivation clients inactifs depuis 12+ mois',
  'INACTIVITY_DELAY',
  '{"delay_days": 365, "entity_type": "organisation", "condition": "was_client = true"}',
  '[
    {"type": "send_email", "config": {"template": "winback", "subject": "On vous a manqué ?"}},
    {"type": "create_task", "config": {"title": "Proposer offre de retour exclusive", "due_days": 3}},
    {"type": "add_tag", "config": {"tag": "Winback campaign"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- RELATIONS CLIENT (+6 templates)
-- ========================================

-- 53. Onboarding J+30 check-in
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Check-in onboarding J+30',
  'Point satisfaction et besoins 30 jours après début collaboration',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed", "delay_days": 30}',
  '[
    {"type": "create_task", "config": {"title": "Appel check-in onboarding J+30", "due_days": 0}},
    {"type": "send_email", "config": {"template": "satisfaction_30d", "subject": "Comment se passent vos 30 premiers jours ?"}},
    {"type": "create_task", "config": {"title": "Recueillir feedback et ajuster si nécessaire", "due_days": 1}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 54. Détection risque churn
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Alerte risque churn client',
  'Détection proactive signaux faibles churn (baisse interactions, plaintes)',
  'ORGANISATION_UPDATED',
  '{"condition": "churn_score > 70 OR complaints_count > 2"}',
  '[
    {"type": "send_notification", "config": {"message": "⚠️ Risque churn client détecté", "priority": "high"}},
    {"type": "create_task", "config": {"title": "Appel urgence - Comprendre insatisfaction", "due_days": 0, "priority": "high"}},
    {"type": "create_task", "config": {"title": "Proposer plan action rétention", "due_days": 1}},
    {"type": "add_tag", "config": {"tag": "Risque churn"}},
    {"type": "assign_user", "config": {"role": "customer_success_manager"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 55. Upsell automatique basé usage
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Opportunité upsell détectée',
  'Proposition upgrade quand client atteint 80% capacité offre actuelle',
  'ORGANISATION_UPDATED',
  '{"condition": "usage_percentage >= 80"}',
  '[
    {"type": "send_notification", "config": {"message": "Opportunité upsell - Client proche limite"}},
    {"type": "create_task", "config": {"title": "Contacter pour proposer offre supérieure", "due_days": 2}},
    {"type": "send_email", "config": {"template": "upsell_offer", "subject": "Passez à l''offre Premium"}},
    {"type": "add_tag", "config": {"tag": "Opportunité upsell"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 56. Suivi satisfaction NPS
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Suivi réponse NPS - Détracteurs',
  'Action immédiate si client donne score NPS ≤ 6',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "nps_response", "filter": {"score": "0-6"}}',
  '[
    {"type": "send_notification", "config": {"message": "🚨 Détracteur NPS - Action urgente", "priority": "high"}},
    {"type": "create_task", "config": {"title": "Appel immédiat pour comprendre insatisfaction", "due_days": 0, "priority": "high"}},
    {"type": "create_task", "config": {"title": "Proposer plan amélioration", "due_days": 1}},
    {"type": "assign_user", "config": {"role": "account_manager"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 57. Célébration milestone client
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Célébration milestone client',
  'Reconnaissance automatique succès client (CA atteint, 1 an collab, etc.)',
  'ORGANISATION_UPDATED',
  '{"condition": "milestone_achieved = true"}',
  '[
    {"type": "send_email", "config": {"template": "milestone_congrats", "subject": "🎉 Félicitations pour ce succès !"}},
    {"type": "create_task", "config": {"title": "Envoyer cadeau/attention personnalisée", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Demander témoignage/case study", "due_days": 5}},
    {"type": "add_tag", "config": {"tag": "Success story"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 58. Programme fidélité - Paliers
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Progression programme fidélité',
  'Notification passage palier supérieur programme fidélité (Bronze/Argent/Or)',
  'ORGANISATION_UPDATED',
  '{"condition": "loyalty_tier_changed = true"}',
  '[
    {"type": "send_email", "config": {"template": "loyalty_tier_upgrade", "subject": "Bienvenue au niveau supérieur !"}},
    {"type": "create_task", "config": {"title": "Débloquer avantages tier supérieur", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Client upgraded tier fidélité"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- PROSPECTION / LEADS (+7 templates)
-- ========================================

-- 59. Qualification BANT automatique
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Checklist qualification BANT',
  'Guide qualification structurée Budget/Authority/Need/Timeline pour nouveau lead',
  'ORGANISATION_CREATED',
  '{}',
  '[
    {"type": "create_task", "config": {"title": "BUDGET - Vérifier budget disponible", "due_days": 1}},
    {"type": "create_task", "config": {"title": "AUTHORITY - Identifier décisionnaire", "due_days": 1}},
    {"type": "create_task", "config": {"title": "NEED - Comprendre besoin/douleur", "due_days": 1}},
    {"type": "create_task", "config": {"title": "TIMELINE - Définir échéance décision", "due_days": 1}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 60. Lead froid vers nurturing
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Passage lead froid en nurturing',
  'Automatisation nurturing pour leads non qualifiés ou pas matures',
  'ORGANISATION_UPDATED',
  '{"condition": "status = ''cold_lead''"}',
  '[
    {"type": "add_tag", "config": {"tag": "Nurturing"}},
    {"type": "create_task", "config": {"title": "Ajouter à séquence email nurturing 6 mois", "due_days": 0}},
    {"type": "send_email", "config": {"template": "nurturing_start", "subject": "Restons en contact"}},
    {"type": "send_notification", "config": {"message": "Lead ajouté programme nurturing"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 61. Détection lead chaud via scoring
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Lead chaud détecté - Action rapide',
  'Priorisation immédiate si lead atteint score critique',
  'ORGANISATION_UPDATED',
  '{"condition": "lead_score >= 85"}',
  '[
    {"type": "add_tag", "config": {"tag": "🔥 HOT Lead"}},
    {"type": "send_notification", "config": {"message": "🔥 Lead très chaud - Contacter sous 4h", "priority": "high"}},
    {"type": "create_task", "config": {"title": "Appel prioritaire lead chaud", "due_days": 0, "priority": "high"}},
    {"type": "assign_user", "config": {"role": "senior_sales"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 62. Lead inbound vs outbound tagging
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Classification source lead',
  'Tagging automatique et workflow adapté selon source (inbound/outbound)',
  'ORGANISATION_CREATED',
  '{}',
  '[
    {"type": "create_task", "config": {"title": "Identifier source (formulaire/téléphone/LinkedIn/event)", "due_days": 0}},
    {"type": "add_tag", "config": {"tag": "Source à qualifier"}},
    {"type": "send_notification", "config": {"message": "Nouveau lead - Source à identifier"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 63. Prospection LinkedIn - Suivi connexion
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Suivi connexion LinkedIn acceptée',
  'Actions après acceptation demande connexion LinkedIn',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "linkedin_connection_accepted"}',
  '[
    {"type": "create_task", "config": {"title": "Envoyer message personnalisé LinkedIn J+1", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Proposer call découverte après 3-5 échanges", "due_days": 7}},
    {"type": "add_tag", "config": {"tag": "LinkedIn connecté"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 64. Lead salon/événement - Follow-up
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Follow-up lead rencontré en salon',
  'Suivi structuré contacts récoltés lors événements professionnels',
  'ORGANISATION_CREATED',
  '{"source": "event"}',
  '[
    {"type": "send_email", "config": {"template": "event_followup", "subject": "Ravi de notre échange au salon"}},
    {"type": "create_task", "config": {"title": "Envoyer support/documentation évoqué", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Proposer RDV de suivi", "due_days": 3}},
    {"type": "add_tag", "config": {"tag": "Lead événement"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 65. Répartition leads round-robin
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Affectation équitable leads entrants',
  'Distribution automatique round-robin des leads entre commerciaux',
  'ORGANISATION_CREATED',
  '{"source": "inbound"}',
  '[
    {"type": "assign_user", "config": {"method": "round_robin", "team": "sales"}},
    {"type": "send_notification", "config": {"message": "Nouveau lead assigné"}},
    {"type": "create_task", "config": {"title": "Premier contact sous 24h", "due_days": 0, "priority": "high"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- REPORTING / PILOTAGE (+5 templates)
-- ========================================

-- 66. Dashboard commercial temps réel
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Mise à jour dashboard commercial',
  'Actualisation KPIs commerciaux toutes les heures en journée',
  'SCHEDULED',
  '{"cron": "0 9-18 * * 1-5"}',
  '[
    {"type": "create_task", "config": {"title": "Refresh métriques pipeline", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Dashboard actualisé"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 67. Alerte objectifs mensuels
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Alerte avancement objectifs J-7',
  'Notification si objectifs mensuels pas en voie d''être atteints',
  'SCHEDULED',
  '{"cron": "0 9 24 * *"}',
  '[
    {"type": "create_task", "config": {"title": "Analyser écart objectifs vs réalisé", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "⚠️ J-7 fin mois - Check objectifs", "priority": "high"}},
    {"type": "create_task", "config": {"title": "Plan action sprint final si nécessaire", "due_days": 0}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 68. Forecast pipeline actualisé
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Actualisation forecast pipeline',
  'Mise à jour prévisionnelle CA chaque lundi matin',
  'SCHEDULED',
  '{"cron": "0 9 * * 1"}',
  '[
    {"type": "create_task", "config": {"title": "Mettre à jour probabilités deals", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Actualiser dates closes estimées", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Forecast hebdo à jour"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 69. Analyse perdus récurrents
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Analyse raisons échecs récurrents',
  'Review mensuelle patterns deals perdus pour amélioration',
  'SCHEDULED',
  '{"cron": "0 10 5 * *"}',
  '[
    {"type": "create_task", "config": {"title": "Analyser motifs perdus du mois (prix/concurrent/timing)", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Identifier actions correctives", "due_days": 3}},
    {"type": "send_notification", "config": {"message": "Review deals perdus mensuelle"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 70. Tableau de bord manager
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Rapport manager - Vue équipe',
  'Synthèse hebdomadaire performance équipe commerciale',
  'SCHEDULED',
  '{"cron": "0 17 * * 5"}',
  '[
    {"type": "create_task", "config": {"title": "Compiler KPIs individuels équipe", "due_days": 0}},
    {"type": "send_email", "config": {"template": "team_report", "subject": "Rapport hebdo équipe", "recipients": "managers"}},
    {"type": "send_notification", "config": {"message": "Rapport équipe généré"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- CONTRATS / MANDATS (+8 templates) ⭐ NEW
-- ========================================

-- 71. Préparation contrat après accord verbal
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Préparation contrat post-accord',
  'Checklist documents après accord de principe client',
  'ORGANISATION_UPDATED',
  '{"condition": "status = ''verbal_agreement''"}',
  '[
    {"type": "create_task", "config": {"title": "Rédiger contrat personnalisé", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Préparer annexes techniques", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Soumettre à validation juridique interne", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Préparation contrat à lancer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 72. Suivi signature électronique
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Relance signature électronique',
  'Rappels progressifs si contrat envoyé mais pas signé',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_sent", "delay_days": 3}',
  '[
    {"type": "send_email", "config": {"template": "signature_reminder", "subject": "Votre contrat attend signature"}},
    {"type": "create_task", "config": {"title": "Appel si pas signé J+5", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Contrat non signé - Relance requise"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 73. Renouvellement automatique J-60
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Process renouvellement J-60',
  'Lancement automatique process renouvellement 60j avant échéance',
  'SCHEDULED',
  '{"cron": "0 9 * * *", "check": "contracts_expiring_60days"}',
  '[
    {"type": "create_task", "config": {"title": "Préparer proposition renouvellement", "due_days": 7}},
    {"type": "create_task", "config": {"title": "Analyser usage année écoulée", "due_days": 5}},
    {"type": "create_task", "config": {"title": "Identifier opportunités upsell", "due_days": 5}},
    {"type": "send_notification", "config": {"message": "Renouvellement J-60 à traiter"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 74. Avenant contrat - Workflow validation
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Demande avenant contrat',
  'Circuit validation avenants contractuels',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "amendment_requested"}',
  '[
    {"type": "create_task", "config": {"title": "Analyser impact avenant demandé", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Soumettre validation juridique", "due_days": 2}},
    {"type": "assign_user", "config": {"role": "legal"}},
    {"type": "send_notification", "config": {"message": "Demande avenant à traiter"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 75. Alerte résiliation client
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Alerte résiliation contrat client',
  'Actions urgentes si client notifie volonté résiliation',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "cancellation_notice"}',
  '[
    {"type": "send_notification", "config": {"message": "🚨 Résiliation notifiée - Action urgente", "priority": "high"}},
    {"type": "create_task", "config": {"title": "Appel immédiat - Comprendre raisons", "due_days": 0, "priority": "high"}},
    {"type": "create_task", "config": {"title": "Proposer solutions rétention", "due_days": 0}},
    {"type": "assign_user", "config": {"role": "retention_manager"}},
    {"type": "add_tag", "config": {"tag": "Résiliation en cours"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 76. Archivage contrats expirés
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Archivage automatique contrats expirés',
  'Classement et archivage contrats 30j après expiration',
  'SCHEDULED',
  '{"cron": "0 3 1 * *", "check": "contracts_expired_30days"}',
  '[
    {"type": "create_task", "config": {"title": "Archiver contrats expirés", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Mettre à jour statut clients", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Archivage mensuel contrats"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 77. Validation conditions particulières
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Validation conditions particulières',
  'Circuit approbation si demande conditions hors standard',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "special_terms_requested"}',
  '[
    {"type": "create_task", "config": {"title": "Analyser impact marge conditions spéciales", "due_days": 1}},
    {"type": "assign_user", "config": {"role": "sales_director"}},
    {"type": "send_notification", "config": {"message": "Conditions particulières à valider", "priority": "high"}},
    {"type": "create_task", "config": {"title": "Décision Go/NoGo direction", "due_days": 2}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 78. Calcul automatique commissions
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Calcul commissions signature',
  'Déclenchement calcul commissions après signature confirmée',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed"}',
  '[
    {"type": "create_task", "config": {"title": "Calculer commissions commerciales", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Envoyer récap commission au commercial", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Signature confirmée - Commissions à calculer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- CONFORMITÉ / RGPD (+6 templates) ⭐ NEW
-- ========================================

-- 79. Consentement RGPD - Revalidation annuelle
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Revalidation consentements RGPD',
  'Demande renouvellement consentements marketing annuelle',
  'SCHEDULED',
  '{"cron": "0 9 1 1 *"}',
  '[
    {"type": "create_task", "config": {"title": "Préparer campagne revalidation consentements", "due_days": 7}},
    {"type": "create_task", "config": {"title": "Mettre à jour registre traitements", "due_days": 10}},
    {"type": "send_notification", "config": {"message": "Campagne RGPD annuelle à lancer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 80. Droit accès données (DSAR)
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Traitement demande accès données',
  'Process standardisé pour répondre demandes RGPD (accès, rectification, suppression)',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "dsar_request"}',
  '[
    {"type": "create_task", "config": {"title": "Extraire toutes données personne concernée", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Vérifier identité demandeur", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Envoyer réponse sous 30j maximum", "due_days": 25}},
    {"type": "assign_user", "config": {"role": "dpo"}},
    {"type": "send_notification", "config": {"message": "⚠️ Demande DSAR reçue - 30j délai", "priority": "high"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 81. Suppression données inactives
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Purge données contacts inactifs 3 ans',
  'Suppression automatique données prospects inactifs depuis 36 mois',
  'SCHEDULED',
  '{"cron": "0 2 1 */3 *"}',
  '[
    {"type": "create_task", "config": {"title": "Identifier contacts inactifs 36+ mois", "due_days": 5}},
    {"type": "create_task", "config": {"title": "Envoyer email dernière chance réactivation", "due_days": 7}},
    {"type": "create_task", "config": {"title": "Supprimer données sans réponse J+30", "due_days": 35}},
    {"type": "send_notification", "config": {"message": "Purge trimestrielle RGPD"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 82. Audit trail modifications
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Audit trail modifications sensibles',
  'Traçabilité automatique modifications données critiques',
  'ORGANISATION_UPDATED',
  '{"condition": "sensitive_field_changed = true"}',
  '[
    {"type": "create_task", "config": {"title": "Logger modification dans audit trail", "due_days": 0}},
    {"type": "send_notification", "config": {"message": "Modification donnée sensible tracée"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 83. Gestion désabonnements mailing
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Process désabonnement marketing',
  'Traitement immédiat et conforme désabonnements emailing',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "email_unsubscribe"}',
  '[
    {"type": "create_task", "config": {"title": "Retirer de toutes listes marketing", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Mettre à jour préférences contact", "due_days": 0}},
    {"type": "send_email", "config": {"template": "unsubscribe_confirmation", "subject": "Désabonnement confirmé"}},
    {"type": "send_notification", "config": {"message": "Désabonnement traité"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 84. Rapport conformité trimestriel
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Rapport conformité RGPD trimestriel',
  'Génération rapport conformité pour DPO chaque trimestre',
  'SCHEDULED',
  '{"cron": "0 10 5 */3 *"}',
  '[
    {"type": "create_task", "config": {"title": "Compiler stats demandes RGPD trimestre", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Vérifier registre traitements à jour", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Générer rapport DPO", "due_days": 5}},
    {"type": "send_notification", "config": {"message": "Rapport RGPD trimestriel"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- COLLABORATION INTERNE (+6 templates) ⭐ NEW
-- ========================================

-- 85. Passation dossier entre commerciaux
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Passation dossier client',
  'Process structuré transfert dossier entre commerciaux (départ, réorganisation)',
  'ORGANISATION_UPDATED',
  '{"condition": "owner_changed = true"}',
  '[
    {"type": "create_task", "config": {"title": "Ancien owner : Rédiger briefing complet", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Nouvel owner : Appel découverte avec ancien", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Nouvel owner : Appel présentation au client", "due_days": 5}},
    {"type": "send_notification", "config": {"message": "Passation dossier en cours"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 86. Demande support technique
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Escalade support technique',
  'Workflow escalade questions techniques commerciales vers support',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "support_request"}',
  '[
    {"type": "assign_user", "config": {"role": "technical_support"}},
    {"type": "create_task", "config": {"title": "Analyser question technique", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Répondre au commercial sous 24h", "due_days": 1}},
    {"type": "send_notification", "config": {"message": "Question technique à traiter"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 87. Validation manager - Remise exceptionnelle
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Validation remise commerciale > 15%',
  'Circuit approbation remises dépassant seuil autorisé',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "discount_approval_needed", "filter": {"discount_percentage": ">15"}}',
  '[
    {"type": "assign_user", "config": {"role": "sales_manager"}},
    {"type": "create_task", "config": {"title": "Analyser justification remise", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Décision Go/NoGo manager", "due_days": 1}},
    {"type": "send_notification", "config": {"message": "⚠️ Validation remise > 15% requise", "priority": "high"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 88. Partage best practice équipe
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Partage succès équipe',
  'Diffusion automatique success stories et best practices',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "deal_won", "filter": {"amount": ">50000"}}',
  '[
    {"type": "create_task", "config": {"title": "Rédiger case study deal gagné", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Partager learning à l''équipe", "due_days": 5}},
    {"type": "send_notification", "config": {"message": "🎉 Gros deal gagné - Partage équipe"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 89. Revue compte stratégique
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Review compte stratégique trimestrielle',
  'Session review comptes clés avec équipe élargie',
  'SCHEDULED',
  '{"cron": "0 14 15 */3 *"}',
  '[
    {"type": "create_task", "config": {"title": "Préparer présentation comptes stratégiques", "due_days": 5}},
    {"type": "create_task", "config": {"title": "Organiser réunion review équipe", "due_days": 7}},
    {"type": "send_notification", "config": {"message": "Review comptes stratégiques trimestre"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 90. Absence commercial - Réassignation urgences
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Gestion absence commercial',
  'Réassignation automatique tâches urgentes si absence > 5j',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "user_out_of_office", "filter": {"days": ">5"}}',
  '[
    {"type": "create_task", "config": {"title": "Identifier tâches urgentes à réassigner", "due_days": 0}},
    {"type": "create_task", "config": {"title": "Notifier clients de l''intérim", "due_days": 0}},
    {"type": "assign_user", "config": {"role": "backup_sales"}},
    {"type": "send_notification", "config": {"message": "Absence longue - Réassignation requise"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- PARTENARIATS / RÉSEAU (+5 templates) ⭐ NEW
-- ========================================

-- 91. Onboarding nouveau partenaire
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Onboarding partenaire commercial',
  'Checklist accueil et formation nouveau partenaire référent',
  'ORGANISATION_CREATED',
  '{"source": "partner"}',
  '[
    {"type": "create_task", "config": {"title": "Envoyer kit partenaire (supports, tarifs)", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Planifier formation produits", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Créer accès portail partenaires", "due_days": 2}},
    {"type": "send_email", "config": {"template": "partner_welcome", "subject": "Bienvenue en tant que partenaire !"}},
    {"type": "add_tag", "config": {"tag": "Partenaire"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 92. Suivi recommandation partenaire
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Suivi lead apporté par partenaire',
  'Tracking et feedback systématique sur leads partenaires',
  'ORGANISATION_CREATED',
  '{"source": "partner_referral"}',
  '[
    {"type": "create_task", "config": {"title": "Contacter lead sous 24h", "due_days": 0, "priority": "high"}},
    {"type": "create_task", "config": {"title": "Envoyer feedback qualité lead au partenaire", "due_days": 3}},
    {"type": "send_notification", "config": {"message": "Lead partenaire à traiter priorité"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 93. Calcul commissions partenaires
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Calcul commissions partenaires',
  'Déclenchement calcul commissions apporteur d''affaires',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed", "source": "partner_referral"}',
  '[
    {"type": "create_task", "config": {"title": "Calculer commission partenaire", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Envoyer notification commission au partenaire", "due_days": 3}},
    {"type": "send_notification", "config": {"message": "Commission partenaire à calculer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 94. Demande témoignage client
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Demande témoignage client satisfait',
  'Sollicitation témoignage après 6 mois collaboration réussie',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed", "delay_days": 180}',
  '[
    {"type": "create_task", "config": {"title": "Identifier si client éligible témoignage", "due_days": 1}},
    {"type": "send_email", "config": {"template": "testimonial_request", "subject": "Votre retour d''expérience ?"}},
    {"type": "create_task", "config": {"title": "Faciliter rédaction témoignage", "due_days": 7}},
    {"type": "send_notification", "config": {"message": "Demande témoignage à envoyer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 95. Invitation événement réseau
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Invitation événement networking',
  'Invitation ciblée clients/prospects à événements professionnels',
  'SCHEDULED',
  '{"cron": "0 10 * * *", "check": "upcoming_events"}',
  '[
    {"type": "create_task", "config": {"title": "Identifier invités cibles pour événement", "due_days": 21}},
    {"type": "send_email", "config": {"template": "event_invitation", "subject": "Vous êtes invité à notre événement"}},
    {"type": "create_task", "config": {"title": "Relancer non-répondants J-7", "due_days": 14}},
    {"type": "send_notification", "config": {"message": "Invitations événement à envoyer"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- ========================================
-- FORMATION / ONBOARDING (+5 templates) ⭐ NEW
-- ========================================

-- 96. Formation produit nouveau client
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Formation initiale nouveau client',
  'Programme formation structuré premières semaines après signature',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed"}',
  '[
    {"type": "create_task", "config": {"title": "Planifier session formation J+7", "due_days": 2}},
    {"type": "send_email", "config": {"template": "training_schedule", "subject": "Votre parcours de formation"}},
    {"type": "create_task", "config": {"title": "Envoyer supports formation avant session", "due_days": 5}},
    {"type": "create_task", "config": {"title": "Follow-up J+14 post-formation", "due_days": 14}},
    {"type": "send_notification", "config": {"message": "Formation client à planifier"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 97. Webinar automatique prospects
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Invitation webinar découverte produit',
  'Séquence invitation webinar mensuel pour prospects',
  'SCHEDULED',
  '{"cron": "0 10 20 * *"}',
  '[
    {"type": "create_task", "config": {"title": "Identifier prospects cibles webinar", "due_days": 5}},
    {"type": "send_email", "config": {"template": "webinar_invitation", "subject": "Webinar découverte gratuit"}},
    {"type": "create_task", "config": {"title": "Relance J-2 avant webinar", "due_days": 8}},
    {"type": "send_notification", "config": {"message": "Webinar mensuel - Invitations"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 98. Suivi progression formation
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Suivi progression formation client',
  'Check-points réguliers maîtrise produit par client',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "training_completed"}',
  '[
    {"type": "create_task", "config": {"title": "Envoyer quiz évaluation connaissances", "due_days": 3}},
    {"type": "create_task", "config": {"title": "Identifier lacunes formation complémentaire", "due_days": 7}},
    {"type": "send_email", "config": {"template": "training_followup", "subject": "Comment vous sentez-vous avec le produit ?"}},
    {"type": "send_notification", "config": {"message": "Suivi formation client"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 99. Bibliothèque ressources self-service
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Envoi ressources formation self-service',
  'Mise à disposition automatique base connaissance et tutoriels',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "contract_signed"}',
  '[
    {"type": "send_email", "config": {"template": "resources_library", "subject": "Votre bibliothèque de ressources"}},
    {"type": "create_task", "config": {"title": "Envoyer accès plateforme e-learning", "due_days": 1}},
    {"type": "send_notification", "config": {"message": "Ressources formation envoyées"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- 100. Certification utilisateur avancé
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Programme certification utilisateur',
  'Proposition certification avancée clients expérimentés',
  'WEBHOOK_RECEIVED',
  '{"webhook_type": "usage_milestone", "filter": {"months_active": 6}}',
  '[
    {"type": "send_email", "config": {"template": "certification_invite", "subject": "Devenez utilisateur certifié"}},
    {"type": "create_task", "config": {"title": "Planifier session certification", "due_days": 7}},
    {"type": "create_task", "config": {"title": "Envoyer badge certification après réussite", "due_days": 14}},
    {"type": "send_notification", "config": {"message": "Client éligible certification"}}
  ]',
  'ACTIVE',
  true,
  0,
  NOW(),
  NOW()
);

-- Vérification finale
SELECT COUNT(*) as total_templates FROM workflows WHERE is_template = true;
SELECT
  id,
  name,
  trigger_type,
  status
FROM workflows
WHERE is_template = true
ORDER BY id;
