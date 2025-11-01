# Script de Seed E2E - Documentation

## Vue d'ensemble

Le script `seed_e2e.py` crée de manière **idempotente** les données minimales requises pour les tests E2E Playwright.

## Données créées

Le script crée automatiquement (si elles n'existent pas déjà) :

1. **Rôle par défaut** : `User` (role standard)
2. **Équipe de test** : `E2E Test Team`
3. **Utilisateur de test** :
   - Email: `test@alforis.fr`
   - Password: `test123`
   - Rattaché au rôle et à l'équipe créés
4. **Organisation de test** : `Alforis E2E Test Org`
   - Type: Client
   - Industrie: Finance
   - Propriétaire: utilisateur de test

## Utilisation

### En local

```bash
cd crm-backend
export DATABASE_URL="postgresql://crm_user:crm_test_password@localhost:5432/crm_test"
python scripts/seed_e2e.py
```

### En CI/CD

Le script est automatiquement appelé dans le workflow GitHub Actions avant de lancer les tests Playwright :

```yaml
- name: 🌱 Seed E2E data (idempotent)
  env:
    DATABASE_URL: postgresql://crm_user:crm_test_password@localhost:5432/crm_test
  run: |
    cd crm-backend
    python scripts/seed_e2e.py
```

## Idempotence

Le script vérifie l'existence de chaque entité avant de la créer :
- Peut être exécuté plusieurs fois sans erreur
- Ne crée pas de doublons
- Affiche un message informatif si l'entité existe déjà

## Dépendances

- SQLAlchemy
- `core.security.hash_password` (pour hasher le mot de passe)
- Base de données PostgreSQL avec les tables initialisées (`init_base_tables.sql` + migrations Alembic)

## Tables requises

Le script requiert que ces tables existent au préalable :
- `roles`
- `teams`
- `users`
- `organisations`

Ces tables sont créées par :
1. `alembic/init_base_tables.sql`
2. `alembic upgrade head` (migrations)

## Troubleshooting

### Erreur : "no such table: users"

➡️ Assurez-vous d'avoir exécuté :
```bash
psql -f alembic/init_base_tables.sql
alembic upgrade head
```

### Erreur : "cannot import name 'hash_password'"

➡️ Vérifiez que `core/security.py` existe et exporte `hash_password`.

### Le script plante en CI

➡️ Vérifiez que :
1. PostgreSQL est prêt (`pg_isready`)
2. Les migrations ont été appliquées
3. Les tables requises existent (étape "Verify required tables" dans le workflow)

## Intégration avec Playwright

Le global setup Playwright (`playwright/global-setup.ts`) vérifie que l'API backend est healthy avant de lancer les tests, garantissant que :
- Le backend est démarré
- La DB est prête
- Les données de seed sont présentes
