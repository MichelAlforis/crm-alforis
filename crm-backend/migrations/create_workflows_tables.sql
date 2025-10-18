-- Migration: Création des tables workflows
-- Date: 2025-10-18
-- Description: Tables pour le système de workflows automatisés (Phase 2.2)

-- =====================================================
-- Table: workflows
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,

    -- Informations de base
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    -- Déclencheur (trigger)
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB,

    -- Conditions
    conditions JSONB,

    -- Actions
    actions JSONB NOT NULL,

    -- Métadonnées
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_template BOOLEAN DEFAULT FALSE,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT workflow_status_check CHECK (status IN ('active', 'inactive', 'draft')),
    CONSTRAINT workflow_trigger_type_check CHECK (trigger_type IN (
        'organisation_created',
        'organisation_updated',
        'deal_created',
        'deal_updated',
        'deal_stage_changed',
        'scheduled',
        'inactivity_delay',
        'webhook_received'
    ))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_template ON workflows(is_template);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);

-- Commentaire
COMMENT ON TABLE workflows IS 'Workflows d''automatisation du CRM';
COMMENT ON COLUMN workflows.trigger_config IS 'Configuration du déclencheur (JSON)';
COMMENT ON COLUMN workflows.conditions IS 'Conditions à vérifier avant exécution (JSON)';
COMMENT ON COLUMN workflows.actions IS 'Actions à exécuter (JSON array)';
COMMENT ON COLUMN workflows.is_template IS 'Template prêt à l''emploi';

-- =====================================================
-- Table: workflow_executions
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id SERIAL PRIMARY KEY,

    -- Référence au workflow
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

    -- Statut d'exécution
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Contexte d'exécution
    trigger_entity_type VARCHAR(50),
    trigger_entity_id INTEGER,

    -- Résultats
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_logs JSONB,
    error_message TEXT,
    actions_executed JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT execution_status_check CHECK (status IN (
        'pending',
        'running',
        'success',
        'failed',
        'skipped'
    ))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_entity ON workflow_executions(trigger_entity_type, trigger_entity_id);

-- Commentaire
COMMENT ON TABLE workflow_executions IS 'Historique des exécutions de workflows';
COMMENT ON COLUMN workflow_executions.execution_logs IS 'Logs détaillés de l''exécution (JSON array)';
COMMENT ON COLUMN workflow_executions.actions_executed IS 'Détails des actions exécutées (JSON array)';

-- =====================================================
-- Trigger pour updated_at automatique
-- =====================================================
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_update_timestamp
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();

CREATE TRIGGER workflow_executions_update_timestamp
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();

-- =====================================================
-- Données de test: 3 workflows templates
-- =====================================================

-- Template 1: Relance deal inactif
INSERT INTO workflows (name, description, status, trigger_type, trigger_config, conditions, actions, is_template)
VALUES (
    'Relance automatique deal inactif',
    'Workflow automatique pour relancer les deals en PROPOSITION sans activité depuis 30 jours',
    'draft',
    'inactivity_delay',
    '{"inactivity_days": 30, "entity_type": "organisation", "pipeline_stages": ["PROPOSITION", "QUALIFICATION"]}',
    '{"operator": "AND", "rules": [{"field": "organisation.pipeline_stage", "operator": "in", "value": ["PROPOSITION", "QUALIFICATION"]}]}',
    '[
        {
            "type": "send_email",
            "config": {
                "to": "commercial@alforis.com",
                "subject": "Relancer le deal {{organisation.nom}}",
                "template": "relance_deal",
                "body": "Le deal {{organisation.nom}} est inactif depuis 30 jours. Merci de relancer le client."
            }
        },
        {
            "type": "create_task",
            "config": {
                "title": "Relancer client {{organisation.nom}}",
                "description": "Deal inactif depuis 30 jours - contacter le client",
                "assigned_to": 1,
                "due_date": "+7 days",
                "priority": "high"
            }
        },
        {
            "type": "send_notification",
            "config": {
                "user_id": 1,
                "message": "Deal {{organisation.nom}} inactif depuis 30 jours",
                "type": "warning"
            }
        }
    ]',
    true
) ON CONFLICT DO NOTHING;

-- Template 2: Onboarding nouveau client
INSERT INTO workflows (name, description, status, trigger_type, trigger_config, conditions, actions, is_template)
VALUES (
    'Onboarding nouveau client',
    'Processus automatisé d''accueil pour les nouveaux clients signés',
    'draft',
    'deal_stage_changed',
    '{"from_stage": "PROPOSITION", "to_stage": "SIGNE"}',
    NULL,
    '[
        {
            "type": "send_email",
            "config": {
                "to": "{{organisation.email}}",
                "subject": "Bienvenue chez Alforis Finance !",
                "template": "bienvenue_client",
                "body": "Bienvenue {{organisation.nom}}, nous sommes ravis de vous compter parmi nos clients."
            }
        },
        {
            "type": "create_task",
            "config": {
                "title": "Appel de bienvenue {{organisation.nom}}",
                "description": "Contacter le nouveau client pour confirmer la signature",
                "assigned_to": 1,
                "due_date": "+3 days",
                "priority": "high"
            }
        },
        {
            "type": "create_task",
            "config": {
                "title": "Envoyer documents contractuels à {{organisation.nom}}",
                "description": "Préparer et envoyer tous les documents signés",
                "assigned_to": 1,
                "due_date": "+1 day",
                "priority": "urgent"
            }
        },
        {
            "type": "send_notification",
            "config": {
                "user_id": 1,
                "message": "Nouveau client signé: {{organisation.nom}}",
                "type": "success"
            }
        }
    ]',
    true
) ON CONFLICT DO NOTHING;

-- Template 3: Alerte manager deal important
INSERT INTO workflows (name, description, status, trigger_type, trigger_config, conditions, actions, is_template)
VALUES (
    'Alerte manager - Deal > 50k€',
    'Notifie automatiquement le manager pour les deals importants',
    'draft',
    'organisation_created',
    NULL,
    '{"operator": "AND", "rules": [{"field": "organisation.montant_potentiel", "operator": ">", "value": 50000}]}',
    '[
        {
            "type": "send_email",
            "config": {
                "to": "manager@alforis.com",
                "subject": "Nouveau deal important: {{organisation.nom}} - {{organisation.montant_potentiel}}€",
                "template": "alerte_manager_deal",
                "body": "Un nouveau deal > 50k€ vient d''être créé et nécessite votre attention."
            }
        },
        {
            "type": "send_notification",
            "config": {
                "user_id": 1,
                "message": "Nouveau deal > 50k€: {{organisation.nom}} ({{organisation.montant_potentiel}}€)",
                "type": "info"
            }
        }
    ]',
    true
) ON CONFLICT DO NOTHING;

-- =====================================================
-- Vérification
-- =====================================================
SELECT 'Migration workflows terminée!' AS status;
SELECT COUNT(*) AS workflows_templates_created FROM workflows WHERE is_template = true;
