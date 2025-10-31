#!/bin/bash
# Script pour créer l'utilisateur test@alforis.fr pour les tests E2E Playwright
# Usage: ./scripts/create-test-user.sh

set -e

echo "🔐 Création de l'utilisateur de test pour Playwright E2E..."

# Vérifier que Docker est démarré
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas démarré. Démarrez Docker et réessayez."
    exit 1
fi

# Vérifier que le container PostgreSQL est running
if ! docker compose ps postgres | grep -q "running"; then
    echo "❌ Le container PostgreSQL n'est pas démarré."
    echo "Démarrez-le avec: docker compose up -d postgres"
    exit 1
fi

# Exécuter le script SQL
echo "📝 Exécution du script SQL..."
docker compose exec -T postgres psql -U crm_user -d crm_db << 'EOF'
-- Script pour créer l'utilisateur test@alforis.fr pour les tests E2E Playwright

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
EOF

echo ""
echo "✅ User test@alforis.fr créé avec succès!"
echo ""
echo "Credentials:"
echo "  Email: test@alforis.fr"
echo "  Password: test123"
echo ""
echo "Vous pouvez maintenant exécuter les 39 tests E2E:"
echo "  cd crm-frontend && npm run test:e2e"
