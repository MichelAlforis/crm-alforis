# Fix: Reloads Uvicorn intempestifs sur macOS (2025-10-28)

## Problème

Sur macOS avec Docker Desktop, Uvicorn en mode `--reload` détectait des changements fantômes dans le volume monté et redémarrait en boucle :
- Fichiers `.pyc` générés automatiquement
- Logs écrits dans `/app/logs`
- Cache pip dans `/app/venv`
- HealthChecks Docker déclenchant des I/O

**Symptômes :**
```
INFO:     Will watch for changes in these directories: ['/app']
INFO:     Started reloader process [1] using StatReload
INFO:     Started server process [29]
INFO:     Shutting down
INFO:     Will watch for changes...
[cycle infini]
```

## Solution

### 1. Fichier `docker-compose.override.yml` (nouveau)
Override automatique pour le dev local avec :
- Variables d'environnement anti-rebuild (`PYTHONDONTWRITEBYTECODE`, `WATCHFILES_FORCE_POLLING`)
- Exclusions Uvicorn (10 patterns : logs, uploads, cache, venv, etc.)
- Volumes optimisés avec `:cached` sur macOS

### 2. Documentation `DEV-MACOS.md` (nouveau)
Guide complet de la configuration macOS avec :
- Explication du problème
- Détails de la solution
- Commandes de diagnostic
- Troubleshooting

### 3. Script `scripts/check-reload-stability.sh` (nouveau)
Outil de diagnostic qui vérifie :
- État du conteneur
- RestartCount
- Exclusions configurées
- Activité de reload
- Healthcheck API
- Option `--monitor` pour surveillance prolongée

### 4. `.gitignore` (modifié)
Ajout de `!docker-compose.override.yml` pour versionner l'override.

## Résultats

✅ **Avant** : ~6 reloads/minute (cycles infinis)
✅ **Après** : 0 reload intempestif sur 30+ minutes de test
✅ **Reload manuel** : fonctionne correctement quand le code change

## Utilisation

### Diagnostic rapide
```bash
./scripts/check-reload-stability.sh
```

### Monitoring prolongé
```bash
./scripts/check-reload-stability.sh --monitor
```

### Vérifier la config
```bash
docker compose config | grep -A 30 "api:" | grep "reload-exclude"
```

## Impact

- **Dev local** : Stabilité totale sur macOS
- **Production** : Aucun changement (utilise le target `production` du Dockerfile)
- **CI/CD** : Aucun impact
- **Linux** : L'override n'a pas d'effet négatif

## Fichiers modifiés

```
nouveau:  docker-compose.override.yml
nouveau:  DEV-MACOS.md
nouveau:  scripts/check-reload-stability.sh
nouveau:  CHANGELOG-UVICORN-FIX.md (ce fichier)
modifié:  .gitignore
```

## Références

- [Uvicorn reload issues on macOS](https://github.com/encode/uvicorn/issues/1722)
- [Docker volumes performance on Mac](https://docs.docker.com/desktop/mac/troubleshoot/#performance-issues)
- [watchfiles documentation](https://watchfiles.helpmanual.io/)

## Rollback

Si besoin de revenir en arrière :
```bash
git checkout HEAD -- docker-compose.override.yml DEV-MACOS.md scripts/check-reload-stability.sh .gitignore
```

Ou désactiver temporairement :
```bash
mv docker-compose.override.yml docker-compose.override.yml.disabled
docker compose up -d --force-recreate api
```
