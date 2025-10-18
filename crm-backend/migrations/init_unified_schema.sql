-- ============================================================================
-- INITIALISATION BASE VIERGE - ARCHITECTURE UNIFIÉE
-- ============================================================================
-- Date: 2025-10-18
-- Description: Création de la structure unifiée Organisation + Person
--              Supprime le besoin de Investor + Fournisseur legacy
-- ============================================================================

-- Créer les ENUMS

-- Type d'organisation (unifie Investor + Fournisseur)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organisationtype') THEN
        CREATE TYPE organisationtype AS ENUM (
            'client',        -- Ancien Investor
            'fournisseur',   -- Ancien Fournisseur
            'distributeur',  -- Nouveau
            'emetteur',      -- Nouveau
            'autre'
        );
    END IF;
END
$$;

-- Pipeline stage (unifié)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipelinestage') THEN
        CREATE TYPE pipelinestage AS ENUM (
            'prospect',
            'qualification',
            'proposition',
            'negociation',
            'signe',
            'perdu',
            'inactif'
        );
    END IF;
END
$$;

-- Catégorie organisation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organisationcategory') THEN
        CREATE TYPE organisationcategory AS ENUM (
            'Institution',
            'Wholesale',
            'SDG',
            'CGPI',
            'Autres'
        );
    END IF;
END
$$;

-- ============================================================================
-- TABLE: organisations (UNIFIÉE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organisations (
    id SERIAL PRIMARY KEY,

    -- ===== CHAMPS COMMUNS =====
    nom VARCHAR(255) NOT NULL,
    type organisationtype NOT NULL DEFAULT 'autre',
    category organisationcategory,

    -- ===== CONTACT =====
    email VARCHAR(255),
    telephone VARCHAR(50),
    website VARCHAR(255),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    pays VARCHAR(100),
    country_code VARCHAR(2),

    -- ===== PIPELINE (ex-Investor) =====
    pipeline_stage pipelinestage DEFAULT 'prospect',
    montant_potentiel DECIMAL(15,2),
    date_signature DATE,
    probabilite_signature INTEGER CHECK (probabilite_signature BETWEEN 0 AND 100),

    -- ===== FINANCIER (ex-Fournisseur / Asset Manager) =====
    aum DECIMAL(20,2),  -- Assets Under Management
    aum_date DATE,
    strategies TEXT[],  -- Liste de stratégies
    domicile VARCHAR(255),  -- Domiciliation juridique
    language VARCHAR(5) DEFAULT 'FR',

    -- ===== MÉTADONNÉES =====
    notes TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,

    -- ===== TIMESTAMPS =====
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by INTEGER,  -- ID user
    assigned_to INTEGER, -- ID user responsable

    -- ===== INDEX =====
    CONSTRAINT organisations_email_unique UNIQUE (email)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_organisations_type ON organisations(type);
CREATE INDEX IF NOT EXISTS idx_organisations_pipeline_stage ON organisations(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_organisations_category ON organisations(category);
CREATE INDEX IF NOT EXISTS idx_organisations_nom ON organisations USING gin(to_tsvector('french', nom));
CREATE INDEX IF NOT EXISTS idx_organisations_email ON organisations(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organisations_active ON organisations(is_active);
CREATE INDEX IF NOT EXISTS idx_organisations_created_at ON organisations(created_at DESC);

-- Commentaires
COMMENT ON TABLE organisations IS 'Table unifiée pour tous types d''organisations (clients, fournisseurs, distributeurs, émetteurs)';
COMMENT ON COLUMN organisations.type IS 'Type: client (ex-Investor), fournisseur (ex-Fournisseur), distributeur, emetteur, autre';
COMMENT ON COLUMN organisations.pipeline_stage IS 'Étape du pipeline commercial';
COMMENT ON COLUMN organisations.montant_potentiel IS 'Montant potentiel du deal (pour type=client)';
COMMENT ON COLUMN organisations.aum IS 'Assets Under Management (pour type=fournisseur)';

-- ============================================================================
-- TABLE: people (UNIFIÉE pour contacts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,

    -- Identité
    prenom VARCHAR(100),
    nom VARCHAR(100),
    email VARCHAR(255),
    telephone VARCHAR(50),
    mobile VARCHAR(50),
    fonction VARCHAR(200),

    -- Métadonnées
    notes TEXT,
    linkedin_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT people_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_nom ON people USING gin(to_tsvector('french', coalesce(nom, '') || ' ' || coalesce(prenom, '')));
CREATE INDEX IF NOT EXISTS idx_people_active ON people(is_active);

COMMENT ON TABLE people IS 'Personnes physiques (contacts)';

-- ============================================================================
-- TABLE: person_organization_links (Relation N-N)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'personrole') THEN
        CREATE TYPE personrole AS ENUM (
            'contact_principal',
            'contact_secondaire',
            'decideur',
            'technique',
            'administratif',
            'autre'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS person_organization_links (
    id SERIAL PRIMARY KEY,

    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

    role personrole DEFAULT 'contact_secondaire',
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT person_org_unique UNIQUE (person_id, organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_person_org_person ON person_organization_links(person_id);
CREATE INDEX IF NOT EXISTS idx_person_org_organisation ON person_organization_links(organisation_id);
CREATE INDEX IF NOT EXISTS idx_person_org_primary ON person_organization_links(is_primary) WHERE is_primary = TRUE;

COMMENT ON TABLE person_organization_links IS 'Lien N-N entre personnes et organisations';

-- ============================================================================
-- TABLE: organisation_activities (Historique d'activités)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organisationactivitytype') THEN
        CREATE TYPE organisationactivitytype AS ENUM (
            'note',
            'appel',
            'email',
            'reunion',
            'tache_completee',
            'changement_stage',
            'autre'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS organisation_activities (
    id SERIAL PRIMARY KEY,

    organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    type organisationactivitytype NOT NULL,

    title VARCHAR(500),
    description TEXT,
    metadata JSONB,  -- Données structurées additionnelles

    created_by INTEGER,  -- user_id
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_activities_org ON organisation_activities(organisation_id);
CREATE INDEX IF NOT EXISTS idx_org_activities_type ON organisation_activities(type);
CREATE INDEX IF NOT EXISTS idx_org_activities_created ON organisation_activities(created_at DESC);

COMMENT ON TABLE organisation_activities IS 'Historique d''activités des organisations (timeline)';

-- ============================================================================
-- TABLE: tasks
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taskstatus') THEN
        CREATE TYPE taskstatus AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taskpriority') THEN
        CREATE TYPE taskpriority AS ENUM ('low', 'normal', 'high', 'urgent');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    status taskstatus DEFAULT 'todo',
    priority taskpriority DEFAULT 'normal',

    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    assigned_to INTEGER,  -- user_id
    created_by INTEGER,   -- user_id

    organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_organisation ON tasks(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

COMMENT ON TABLE tasks IS 'Tâches assignées aux utilisateurs';

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationtype') THEN
        CREATE TYPE notificationtype AS ENUM (
            'task_assigned',
            'task_overdue',
            'deal_won',
            'deal_lost',
            'new_contact',
            'system_error',
            'workflow_executed',
            'autre'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,
    type notificationtype NOT NULL,

    title VARCHAR(500) NOT NULL,
    message TEXT,
    data JSONB,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'Notifications temps réel pour les utilisateurs';

-- ============================================================================
-- Trigger updated_at automatique
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organisations_update_timestamp
    BEFORE UPDATE ON organisations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER people_update_timestamp
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER person_organization_links_update_timestamp
    BEFORE UPDATE ON person_organization_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_update_timestamp
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organisation_activities_update_timestamp
    BEFORE UPDATE ON organisation_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Données de test (optionnel)
-- ============================================================================

-- Organisation test type CLIENT
INSERT INTO organisations (nom, type, category, email, telephone, pipeline_stage, montant_potentiel, is_active)
VALUES
('ACME Investments', 'client', 'Institution', 'contact@acme-invest.com', '+33 1 23 45 67 89', 'qualification', 500000.00, true),
('Beta Capital', 'client', 'CGPI', 'info@betacapital.fr', '+33 1 98 76 54 32', 'prospect', 250000.00, true)
ON CONFLICT DO NOTHING;

-- Organisation test type FOURNISSEUR
INSERT INTO organisations (nom, type, category, aum, strategies, domicile, language, is_active)
VALUES
('Alforis Asset Management', 'fournisseur', 'Institution', 1500000000.00, ARRAY['Actions', 'Obligations', 'Multi-assets'], 'Luxembourg', 'FR', true),
('GlobalFund Managers', 'fournisseur', 'Wholesale', 850000000.00, ARRAY['Alternative', 'Private Equity'], 'Ireland', 'EN', true)
ON CONFLICT DO NOTHING;

-- Personnes test
INSERT INTO people (prenom, nom, email, telephone, fonction, is_active)
VALUES
('Jean', 'Dupont', 'jean.dupont@acme-invest.com', '+33 6 12 34 56 78', 'Directeur Investissements', true),
('Marie', 'Martin', 'marie.martin@betacapital.fr', '+33 6 98 76 54 32', 'Analyste Senior', true),
('Pierre', 'Bernard', 'pierre.bernard@alforis.com', '+33 6 11 22 33 44', 'Portfolio Manager', true)
ON CONFLICT DO NOTHING;

-- Liens Person <-> Organisation
INSERT INTO person_organization_links (person_id, organisation_id, role, is_primary)
SELECT p.id, o.id, 'contact_principal', true
FROM people p, organisations o
WHERE p.email = 'jean.dupont@acme-invest.com' AND o.nom = 'ACME Investments'
ON CONFLICT DO NOTHING;

INSERT INTO person_organization_links (person_id, organisation_id, role, is_primary)
SELECT p.id, o.id, 'contact_principal', true
FROM people p, organisations o
WHERE p.email = 'marie.martin@betacapital.fr' AND o.nom = 'Beta Capital'
ON CONFLICT DO NOTHING;

INSERT INTO person_organization_links (person_id, organisation_id, role, is_primary)
SELECT p.id, o.id, 'decideur', true
FROM people p, organisations o
WHERE p.email = 'pierre.bernard@alforis.com' AND o.nom = 'Alforis Asset Management'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Vérifications finales
-- ============================================================================

SELECT 'INITIALISATION TERMINÉE!' AS status;

SELECT
    'organisations' AS table_name,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE type = 'client') AS clients,
    COUNT(*) FILTER (WHERE type = 'fournisseur') AS fournisseurs
FROM organisations

UNION ALL

SELECT
    'people' AS table_name,
    COUNT(*) AS count,
    NULL,
    NULL
FROM people

UNION ALL

SELECT
    'person_organization_links' AS table_name,
    COUNT(*) AS count,
    NULL,
    NULL
FROM person_organization_links

UNION ALL

SELECT
    'tasks' AS table_name,
    COUNT(*) AS count,
    NULL,
    NULL
FROM tasks

UNION ALL

SELECT
    'notifications' AS table_name,
    COUNT(*) AS count,
    NULL,
    NULL
FROM notifications;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
