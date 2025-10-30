# Configuration macOS pour dev local

## Problèmes résolus

### 1. Reloads Uvicorn intempestifs (Backend)

Sur macOS, le bind-mount Docker avec Uvicorn `--reload` peut déclencher des cycles de reload infinis à cause de :
- Changements fantômes détectés dans les volumes montés
- Fichiers `.pyc` générés automatiquement
- Logs écrits dans `/app/logs`
- Cache pip dans `/app/venv`

### 2. CSS parsing errors avec Turbopack (Frontend)

Turbopack et PostCSS peuvent mal gérer les `@import` placés après `@tailwind`, causant :
- Duplication de contenu CSS (fichier gonflant à 4000+ lignes)
- Erreur "@ import rules must precede all rules"
- Erreurs 500 au démarrage

## Solution : docker-compose.override.yml + PostCSS

Le fichier `docker-compose.override.yml` est automatiquement chargé par Docker Compose et contient des optimisations pour macOS :

### 1. Variables d'environnement
```yaml
PYTHONDONTWRITEBYTECODE: "1"     # Empêche création de .pyc
WATCHFILES_FORCE_POLLING: "true"  # Polling au lieu de inotify
```

### 2. Exclusions de reload
La commande Uvicorn exclut les dossiers qui changent fréquemment :
- `logs/*` - Logs de l'application
- `uploads/*` - Fichiers uploadés
- `backups/*` - Backups DB
- `.venv/*`, `venv/*` - Dépendances Python
- `**/__pycache__/*`, `**/*.pyc` - Cache Python
- `alembic/versions/*.pyc` - Migrations compilées
- `supervisord.conf` - Config supervisord

### 3. Volumes optimisés
Les dossiers sensibles utilisent des volumes nommés au lieu de bind-mounts :
```yaml
volumes:
  - ./crm-backend:/app:cached      # Code source seulement
  - api-venv:/app/venv             # Volume nommé
  - api-uploads:/app/uploads       # Volume nommé
  - api-backups:/app/backups       # Volume nommé
  - api-logs:/app/logs             # Volume nommé
```

Le flag `:cached` améliore les performances sur macOS en relaxant la cohérence du cache.

### 4. PostCSS Configuration
Le fichier `crm-frontend/postcss.config.js` active `postcss-import` AVANT `tailwindcss` :
```js
module.exports = {
  plugins: {
    'postcss-import': {},      // 1. Résout les @import
    tailwindcss: {},           // 2. Injecte Tailwind
    autoprefixer: {},          // 3. Autoprefixer
  },
}
```

### 5. CSS Import Order
Dans `crm-frontend/styles/global.css`, tous les `@import` sont placés AVANT les `@tailwind` :
```css
/* Imports AVANT Tailwind */
@import './variables.css';
@import './components.css';
@import './utilities.css';

/* Puis Tailwind */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. Frontend Optimizations
- Turbopack activé par défaut (`npm run dev` utilise `--turbo`)
- Lint et typecheck désactivés en dev (faits en CI)
- Volumes optimisés : `node_modules` et `.next` en volumes nommés

## Vérification

### Tester la stabilité
```bash
# Vérifier qu'il n'y a qu'un seul démarrage
docker compose logs api | grep "Started server process"

# Vérifier le RestartCount (doit être 0)
docker inspect v1-api-1 --format='{{.RestartCount}}'

# Voir la commande réelle
docker inspect -f '{{json .Config.Cmd}}' v1-api-1 | jq -r .
```

### Logs en temps réel
```bash
docker compose logs -f api
```

### Tester le reload manuel
```bash
# Modifier un fichier Python dans crm-backend/
echo "# test" >> crm-backend/main.py

# Observer le reload dans les logs (devrait apparaître une fois)
docker compose logs --tail=10 api
```

## Désactiver temporairement l'override

Si tu veux revenir à la config de base :
```bash
# Renommer l'override
mv docker-compose.override.yml docker-compose.override.yml.disabled

# Rebuild
docker compose up -d --force-recreate api

# Réactiver
mv docker-compose.override.yml.disabled docker-compose.override.yml
docker compose up -d --force-recreate api
```

## Production

L'override n'affecte que le dev local. En production, le Dockerfile cible `production` qui utilise supervisord sans `--reload` :

```dockerfile
# Dockerfile ligne 72-97
FROM base AS production
...
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

La production reste stable et optimisée.

## Troubleshooting

### Reload encore présent
```bash
# Vérifier que l'override est chargé
docker compose config | grep -A 30 "api:" | grep "reload-exclude"

# Vérifier les processus dans le conteneur
docker exec v1-api-1 ps aux | grep uvicorn

# Vérifier qu'il n'y a pas de supervisord qui tourne
docker exec v1-api-1 ps aux | grep supervisord
```

### Performance lente
```bash
# Augmenter la RAM/CPU de Docker Desktop
# Settings > Resources > Advanced

# Vérifier les volumes
docker volume ls
docker system df -v
```

### Nettoyer et redémarrer proprement
```bash
# Stop tout
docker compose down

# Nettoyer les volumes de cache (optionnel)
docker volume prune

# Redémarrer
docker compose up -d
```
