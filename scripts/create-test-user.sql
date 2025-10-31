-- Script pour créer l'utilisateur test@alforis.fr pour les tests E2E Playwright
-- Usage: docker compose exec postgres psql -U crm_user -d crm_db -f /path/to/create-test-user.sql
-- OU: psql -U crm_user -d crm_db < scripts/create-test-user.sql

-- Vérifier si l'utilisateur existe déjà
DO $$
DECLARE
    user_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'test@alforis.fr') INTO user_exists;

    IF NOT user_exists THEN
        -- Créer l'utilisateur de test
        INSERT INTO users (
            email,
            hashed_password,
            full_name,
            is_active,
            is_superuser,
            created_at,
            updated_at
        ) VALUES (
            'test@alforis.fr',
            -- Password: test123 (hashed with bcrypt)
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lXQKl8Nm5vNu',
            'Test User',
            true,
            false,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'User test@alforis.fr created successfully';
    ELSE
        RAISE NOTICE 'User test@alforis.fr already exists';
    END IF;
END $$;

-- Afficher les informations du user
SELECT
    id,
    email,
    full_name,
    is_active,
    is_superuser,
    created_at
FROM users
WHERE email = 'test@alforis.fr';
