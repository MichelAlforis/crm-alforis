-- Script pour créer 20 workflows templates plug-and-play
-- Usage: psql -U crm_user -d crm_dev -f scripts/seed_workflow_templates.sql

-- Nettoyer les anciens templates (optionnel)
-- DELETE FROM workflows WHERE is_template = true;

-- 1. Bienvenue nouveau client
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Bienvenue nouveau client',
  'Envoie un email de bienvenue et crée une tâche de suivi lorsqu''une organisation est créée',
  'organisation_created',
  '{}',
  '[
    {"type": "send_email", "config": {"template": "welcome", "subject": "Bienvenue chez Alforis Finance"}},
    {"type": "create_task", "config": {"title": "Appeler nouveau client", "due_days": 1}}
  ]',
  'active',
  true,
  0,  0,
  NOW(),
  NOW()
);

-- 2. Relance deal inactif
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Relance deal inactif',
  'Notifie le commercial si un deal est inactif depuis 7 jours',
  'inactivity_delay',
  '{"delay_days": 7, "entity_type": "deal"}',
  '[
    {"type": "send_notification", "config": {"message": "Deal inactif depuis 7 jours"}},
    {"type": "create_task", "config": {"title": "Relancer le prospect", "due_days": 1}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 3. Deal gagné - Félicitations
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Deal gagné - Félicitations',
  'Envoie des félicitations et crée les tâches d''onboarding quand un deal passe en "Gagné"',
  'deal_stage_changed',
  '{"stage_name": "Gagné"}',
  '[
    {"type": "send_notification", "config": {"message": "🎉 Félicitations ! Deal gagné !"}},
    {"type": "create_task", "config": {"title": "Préparer documents contractuels", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Planifier kick-off meeting", "due_days": 3}},
    {"type": "add_tag", "config": {"tag": "Client"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 4. Deal perdu - Analyse
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Deal perdu - Analyse',
  'Crée une tâche d''analyse et tag le contact pour suivi futur',
  'deal_stage_changed',
  '{"stage_name": "Perdu"}',
  '[
    {"type": "create_task", "config": {"title": "Analyser raisons de la perte", "due_days": 1}},
    {"type": "add_tag", "config": {"tag": "À recontacter"}},
    {"type": "update_field", "config": {"field": "next_contact_date", "value": "+3 months"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 5. Nouveau contact - Qualification
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Nouveau contact - Qualification',
  'Lance le processus de qualification d''un nouveau contact',
  'organisation_created',
  '{}',
  '[
    {"type": "create_task", "config": {"title": "Qualifier le besoin", "due_days": 1}},
    {"type": "send_email", "config": {"template": "qualification", "subject": "Découvrons vos besoins"}},
    {"type": "add_tag", "config": {"tag": "À qualifier"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 6. Rappel rendez-vous J-1
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Rappel rendez-vous J-1',
  'Envoie un rappel automatique 1 jour avant un rendez-vous',
  'scheduled',
  '{"cron": "0 10 * * *", "check": "appointments_tomorrow"}',
  '[
    {"type": "send_email", "config": {"template": "reminder", "subject": "Rappel rendez-vous demain"}},
    {"type": "send_notification", "config": {"message": "Rendez-vous demain"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 7. Deal en négociation - Support
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Deal en négociation - Support',
  'Assigne le support technique quand un deal passe en négociation',
  'deal_stage_changed',
  '{"stage_name": "Négociation"}',
  '[
    {"type": "assign_user", "config": {"role": "support_technique"}},
    {"type": "create_task", "config": {"title": "Préparer démonstration technique", "due_days": 2}},
    {"type": "send_notification", "config": {"message": "Deal en négociation - support requis"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 8. Suivi post-vente J+7
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Suivi post-vente J+7',
  'Crée une tâche de satisfaction client 7 jours après la signature',
  'deal_stage_changed',
  '{"stage_name": "Gagné", "delay_days": 7}',
  '[
    {"type": "create_task", "config": {"title": "Sondage satisfaction client", "due_days": 0}},
    {"type": "send_email", "config": {"template": "satisfaction", "subject": "Comment se passe votre expérience ?"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 9. Renouvellement contrat J-30
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Renouvellement contrat J-30',
  'Alerte 30 jours avant la fin d''un contrat pour préparer le renouvellement',
  'scheduled',
  '{"cron": "0 9 * * *", "check": "contracts_expiring_30days"}',
  '[
    {"type": "create_task", "config": {"title": "Préparer proposition de renouvellement", "due_days": 7}},
    {"type": "send_notification", "config": {"message": "Contrat expire dans 30 jours"}},
    {"type": "add_tag", "config": {"tag": "Renouvellement"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 10. Lead scoring - Hot lead
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Lead scoring - Hot lead',
  'Actions prioritaires quand un lead atteint un score élevé',
  'organisation_updated',
  '{"condition": "score >= 80"}',
  '[
    {"type": "add_tag", "config": {"tag": "🔥 Hot Lead"}},
    {"type": "assign_user", "config": {"role": "senior_sales"}},
    {"type": "create_task", "config": {"title": "Contacter ASAP", "due_days": 0, "priority": "high"}},
    {"type": "send_notification", "config": {"message": "🔥 Hot lead détecté !", "priority": "high"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 11. Onboarding client J+0
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Onboarding client - Jour 0',
  'Lance le processus d''onboarding dès la signature du contrat',
  'deal_stage_changed',
  '{"stage_name": "Gagné"}',
  '[
    {"type": "send_email", "config": {"template": "onboarding_welcome", "subject": "Bienvenue ! Vos prochaines étapes"}},
    {"type": "create_task", "config": {"title": "Créer accès client", "due_days": 1}},
    {"type": "create_task", "config": {"title": "Planifier formation initiale", "due_days": 3}},
    {"type": "add_tag", "config": {"tag": "En onboarding"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 12. Escalade deal bloqué
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Escalade deal bloqué',
  'Escalade au manager si un deal reste bloqué trop longtemps',
  'inactivity_delay',
  '{"delay_days": 14, "entity_type": "deal", "stage": "Proposition"}',
  '[
    {"type": "assign_user", "config": {"role": "sales_manager"}},
    {"type": "send_notification", "config": {"message": "Deal bloqué depuis 14 jours - escalade manager"}},
    {"type": "create_task", "config": {"title": "Débloquer situation avec client", "due_days": 2}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 13. Enrichissement données
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Enrichissement données contact',
  'Demande d''enrichir les informations manquantes d''un nouveau contact',
  'organisation_created',
  '{}',
  '[
    {"type": "create_task", "config": {"title": "Compléter fiche entreprise (CA, effectif, secteur)", "due_days": 2}},
    {"type": "create_task", "config": {"title": "Identifier décisionnaires clés", "due_days": 3}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 14. Cross-sell opportunité
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Cross-sell - Opportunité détectée',
  'Alerte pour proposition de services complémentaires aux clients existants',
  'organisation_updated',
  '{"condition": "is_client = true AND months_since_last_purchase >= 6"}',
  '[
    {"type": "create_task", "config": {"title": "Identifier besoins cross-sell", "due_days": 5}},
    {"type": "add_tag", "config": {"tag": "Cross-sell"}},
    {"type": "send_notification", "config": {"message": "Opportunité cross-sell détectée"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 15. Rapport mensuel automatique
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Rapport mensuel commercial',
  'Génère et envoie le rapport d''activité mensuel le 1er de chaque mois',
  'scheduled',
  '{"cron": "0 8 1 * *"}',
  '[
    {"type": "send_email", "config": {"template": "monthly_report", "subject": "Rapport mensuel", "recipients": "sales_team"}},
    {"type": "send_notification", "config": {"message": "Rapport mensuel disponible"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 16. Abandon panier - Relance
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Abandon devis - Relance',
  'Relance automatique si un devis n''a pas été signé sous 3 jours',
  'deal_stage_changed',
  '{"stage_name": "Proposition", "delay_days": 3}',
  '[
    {"type": "send_email", "config": {"template": "quote_reminder", "subject": "Votre devis vous attend"}},
    {"type": "create_task", "config": {"title": "Appel de relance devis", "due_days": 1}},
    {"type": "add_tag", "config": {"tag": "Devis non signé"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 17. NPS après livraison
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'NPS après livraison projet',
  'Envoie le questionnaire NPS 2 semaines après la fin d''un projet',
  'deal_stage_changed',
  '{"stage_name": "Livré", "delay_days": 14}',
  '[
    {"type": "send_email", "config": {"template": "nps_survey", "subject": "Notez votre expérience"}},
    {"type": "create_task", "config": {"title": "Analyser retour NPS", "due_days": 7}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 18. Affectation round-robin
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Affectation automatique leads',
  'Distribue équitablement les nouveaux leads entre commerciaux (round-robin)',
  'organisation_created',
  '{}',
  '[
    {"type": "assign_user", "config": {"method": "round_robin", "team": "sales"}},
    {"type": "send_notification", "config": {"message": "Nouveau lead assigné"}},
    {"type": "create_task", "config": {"title": "Premier contact lead", "due_days": 1}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 19. Alerte budget dépassé
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Alerte dépassement budget',
  'Notifie le manager si un deal dépasse le budget autorisé',
  'deal_updated',
  '{"condition": "amount > budget_limit"}',
  '[
    {"type": "send_notification", "config": {"message": "⚠️ Deal dépasse le budget autorisé", "recipients": "managers"}},
    {"type": "create_task", "config": {"title": "Valider conditions commerciales", "due_days": 0, "priority": "high"}},
    {"type": "add_tag", "config": {"tag": "Validation requise"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- 20. Anniversaire client
INSERT INTO workflows (name, description, trigger_type, trigger_config, actions, status, is_template, execution_count, created_at, updated_at)
VALUES (
  'Anniversaire relation client',
  'Envoie un message personnalisé pour l''anniversaire du début de la relation client',
  'scheduled',
  '{"cron": "0 9 * * *", "check": "client_anniversaries"}',
  '[
    {"type": "send_email", "config": {"template": "anniversary", "subject": "Joyeux anniversaire ! 🎉"}},
    {"type": "create_task", "config": {"title": "Appel courtoisie anniversaire", "due_days": 0}},
    {"type": "add_tag", "config": {"tag": "Anniversaire"}}
  ]',
  'active',
  true,
  0,
  NOW()
);

-- Vérification
SELECT
  name,
  trigger_type,
  status,
  is_template,
  jsonb_array_length(actions) as nb_actions
FROM workflows
WHERE is_template = true
ORDER BY created_at DESC;
