-- ============================================================================
-- INITIALISATION COMPLÈTE BASE DE DONNÉES CRM ALFORIS
-- ============================================================================
-- Date: 2025-10-18
-- Description: Script d'initialisation complet pour base vierge
--              - Architecture unifiée (Organisation + Person)
--              - Workflows automatisés
--              - Users & Permissions (RBAC)
--              - Tables support (notifications, webhooks, etc.)
-- ============================================================================

\echo '================================'
\echo '  INITIALISATION CRM ALFORIS   '
\echo '================================'

-- ============================================================================
-- 1. STRUCTURE UNIFIÉE (Organisation + Person)
-- ============================================================================

\echo ''
\echo '1/3 - Création structure unifiée Organisation + Person...'

\i init_unified_schema.sql

-- ============================================================================
-- 2. WORKFLOWS AUTOMATISÉS
-- ============================================================================

\echo ''
\echo '2/3 - Création tables workflows...'

\i create_workflows_tables.sql

-- ============================================================================
-- 3. USERS & PERMISSIONS (RBAC)
-- ============================================================================

\echo ''
\echo '3/3 - Création users & permissions RBAC...'

-- Table users (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- BCrypt hash
    nom VARCHAR(100),
    prenom VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- User admin par défaut
INSERT INTO users (email, password_hash, nom, prenom, is_active, is_admin)
VALUES (
    'admin@alforis.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyJEyYYaXd4W',  -- Password: admin123
    'Admin',
    'Alforis',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, nom, prenom, is_active, is_admin)
VALUES (
    'user@alforis.com',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zS/pXWgZ4JxyYcDQhXJWG',  -- Password: user123
    'User',
    'Test',
    true,
    false
)
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'Utilisateurs du CRM';

-- Table roles (RBAC)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rolename') THEN
        CREATE TYPE rolename AS ENUM ('admin', 'manager', 'commercial', 'viewer');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name rolename UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description)
VALUES
('admin', 'Administrateur - Accès complet'),
('manager', 'Manager - Gestion équipe + rapports'),
('commercial', 'Commercial - Gestion pipeline'),
('viewer', 'Viewer - Lecture seule')
ON CONFLICT (name) DO NOTHING;

-- Table permissions
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,  -- organisations, workflows, tasks, etc.
    action VARCHAR(50) NOT NULL,     -- create, read, update, delete, execute
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT permission_unique UNIQUE (resource, action, role_id)
);

-- Permissions Admin (tout)
INSERT INTO permissions (resource, action, role_id)
SELECT 'all', 'all', r.id FROM roles r WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Permissions Manager
INSERT INTO permissions (resource, action, role_id)
SELECT 'organisations', action, r.id
FROM roles r, UNNEST(ARRAY['create', 'read', 'update', 'delete']) AS action
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

INSERT INTO permissions (resource, action, role_id)
SELECT 'workflows', action, r.id
FROM roles r, UNNEST(ARRAY['create', 'read', 'update', 'execute']) AS action
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Permissions Commercial
INSERT INTO permissions (resource, action, role_id)
SELECT 'organisations', action, r.id
FROM roles r, UNNEST(ARRAY['create', 'read', 'update']) AS action
WHERE r.name = 'commercial'
ON CONFLICT DO NOTHING;

INSERT INTO permissions (resource, action, role_id)
SELECT 'tasks', action, r.id
FROM roles r, UNNEST(ARRAY['create', 'read', 'update']) AS action
WHERE r.name = 'commercial'
ON CONFLICT DO NOTHING;

-- Permissions Viewer (lecture seule)
INSERT INTO permissions (resource, action, role_id)
SELECT resource, 'read', r.id
FROM roles r, UNNEST(ARRAY['organisations', 'tasks', 'workflows']) AS resource
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- Table user_roles (N-N)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT user_role_unique UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- Assigner rôle admin à admin@alforis.com
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@alforis.com' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assigner rôle commercial à user@alforis.com
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'user@alforis.com' AND r.name = 'commercial'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. TABLES SUPPORT
-- ============================================================================

-- Table webhooks (pour intégrations externes)
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    event_type VARCHAR(100) NOT NULL,  -- organisation_created, deal_won, etc.
    is_active BOOLEAN DEFAULT TRUE,
    secret_key VARCHAR(255),  -- Pour HMAC signature
    retry_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

-- ============================================================================
-- 5. VUES UTILES
-- ============================================================================

-- Vue: organisations avec nombre de contacts
CREATE OR REPLACE VIEW v_organisations_with_contacts AS
SELECT
    o.*,
    COUNT(DISTINCT pol.person_id) AS nb_contacts,
    COUNT(DISTINCT oa.id) AS nb_activities,
    MAX(oa.created_at) AS last_activity_date
FROM organisations o
LEFT JOIN person_organization_links pol ON o.id = pol.organisation_id
LEFT JOIN organisation_activities oa ON o.id = oa.organisation_id
GROUP BY o.id;

COMMENT ON VIEW v_organisations_with_contacts IS 'Organisations enrichies avec stats contacts et activités';

-- Vue: tâches en retard
CREATE OR REPLACE VIEW v_tasks_overdue AS
SELECT
    t.*,
    o.nom AS organisation_nom,
    p.prenom || ' ' || p.nom AS person_name,
    NOW() - t.due_date AS delay
FROM tasks t
LEFT JOIN organisations o ON t.organisation_id = o.id
LEFT JOIN people p ON t.person_id = p.id
WHERE t.status NOT IN ('done', 'cancelled')
  AND t.due_date < NOW()
ORDER BY t.due_date ASC;

COMMENT ON VIEW v_tasks_overdue IS 'Tâches en retard avec délai calculé';

-- Vue: statistiques workflows
CREATE OR REPLACE VIEW v_workflow_stats AS
SELECT
    w.id,
    w.name,
    w.status,
    w.trigger_type,
    w.execution_count,
    COUNT(we.id) AS total_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'success') AS success_count,
    COUNT(we.id) FILTER (WHERE we.status = 'failed') AS failed_count,
    COUNT(we.id) FILTER (WHERE we.status = 'skipped') AS skipped_count,
    ROUND(
        CASE WHEN COUNT(we.id) > 0
        THEN (COUNT(we.id) FILTER (WHERE we.status = 'success')::DECIMAL / COUNT(we.id) * 100)
        ELSE 0
        END, 2
    ) AS success_rate
FROM workflows w
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
GROUP BY w.id;

COMMENT ON VIEW v_workflow_stats IS 'Statistiques temps réel des workflows';

-- ============================================================================
-- 6. FONCTIONS UTILES
-- ============================================================================

-- Fonction: Chercher organisations par texte (full-text search)
CREATE OR REPLACE FUNCTION search_organisations(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    nom VARCHAR,
    type organisationtype,
    email VARCHAR,
    pipeline_stage pipelinestage,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.nom,
        o.type,
        o.email,
        o.pipeline_stage,
        ts_rank(
            to_tsvector('french', coalesce(o.nom, '') || ' ' || coalesce(o.email, '') || ' ' || coalesce(o.notes, '')),
            plainto_tsquery('french', search_term)
        ) AS rank
    FROM organisations o
    WHERE
        to_tsvector('french', coalesce(o.nom, '') || ' ' || coalesce(o.email, '') || ' ' || coalesce(o.notes, ''))
        @@ plainto_tsquery('french', search_term)
    ORDER BY rank DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_organisations IS 'Recherche full-text dans organisations';

-- ============================================================================
-- 7. RÉSUMÉ FINAL
-- ============================================================================

\echo ''
\echo '================================'
\echo '  INITIALISATION TERMINÉE ✅   '
\echo '================================'
\echo ''

-- Afficher les stats
SELECT
    '📊 STATISTIQUES' AS info,
    '' AS detail;

SELECT
    'Organisations' AS table_name,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE type = 'client') AS clients,
    COUNT(*) FILTER (WHERE type = 'fournisseur') AS fournisseurs
FROM organisations

UNION ALL

SELECT
    'Personnes' AS table_name,
    COUNT(*) AS total,
    NULL,
    NULL
FROM people

UNION ALL

SELECT
    'Tâches' AS table_name,
    COUNT(*) AS total,
    NULL,
    NULL
FROM tasks

UNION ALL

SELECT
    'Workflows' AS table_name,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE is_template = true) AS templates,
    NULL
FROM workflows

UNION ALL

SELECT
    'Users' AS table_name,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE is_admin = true) AS admins,
    NULL
FROM users

UNION ALL

SELECT
    'Roles' AS table_name,
    COUNT(*) AS total,
    NULL,
    NULL
FROM roles

UNION ALL

SELECT
    'Permissions' AS table_name,
    COUNT(*) AS total,
    NULL,
    NULL
FROM permissions;

\echo ''
\echo '✅ USERS CRÉÉS:'
SELECT '  - ' || email || ' (' || CASE WHEN is_admin THEN 'Admin' ELSE 'User' END || ')' AS users FROM users;

\echo ''
\echo '✅ WORKFLOWS TEMPLATES:'
SELECT '  - ' || name AS workflows FROM workflows WHERE is_template = true;

\echo ''
\echo '================================'
\echo '  PRÊT À UTILISER! 🚀          '
\echo '================================'
\echo ''
\echo 'Connexion Admin:'
\echo '  Email: admin@alforis.com'
\echo '  Password: admin123'
\echo ''
\echo 'API Documentation:'
\echo '  http://localhost:8000/docs'
\echo ''
