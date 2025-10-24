# 🐛 Guide de Debugging Docker

## 🎯 Règle d'or

**Toujours démarrer avec `docker compose up` (sans `-d`) la première fois ou après des changements importants!**

---

## 🔍 Pourquoi?

### ❌ Avec `-d` (detached) - Mode "aveugle"
```bash
docker compose up -d
[+] Running 3/3
 ✔ Container v1-api-1  Started

# Tout semble OK...
# Mais l'API peut crasher en boucle en arrière-plan! 😱
```

### ✅ Sans `-d` (attached) - Mode "debug"
```bash
docker compose up

# Vous voyez TOUT en temps réel:
api-1  | ✅ Application startup complete  (OK!)
api-1  | ❌ Error: ...                    (Problème visible!)
api-1  | 🔄 Reloading...                  (Boucle détectée!)
```

---

## 🛠️ Workflow de Debug Recommandé

### 1️⃣ Premier démarrage / Après modifications
```bash
docker compose up

# Attendez 30-60 secondes
# Vérifiez:
# - ✅ "Application startup complete"
# - ✅ Pas de reload en boucle
# - ✅ Pas d'erreur récurrente
# - ✅ Services healthy

# Si tout OK:
Ctrl+C
docker compose up -d
```

### 2️⃣ Démarrage quotidien (tout fonctionne)
```bash
docker compose up -d
docker compose ps
```

### 3️⃣ Problème détecté?
```bash
# Voir tous les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f api

# Dernières lignes
docker compose logs --tail=50 api

# Redémarrer avec logs visibles
docker compose restart api
docker compose logs -f api
```

---

## 🚨 Problèmes Détectables avec `docker compose up`

### Reload en boucle
```
api-1  | WARNING:  StatReload detected changes in 'routers/help.py'. Reloading...
api-1  | INFO:     Shutting down
api-1  | WARNING:  StatReload detected changes in 'routers/help.py'. Reloading...
api-1  | INFO:     Shutting down
# ↑ Boucle infinie! Avec -d, invisible!
```

**Solution:** Volumes `:cached`, `--reload-delay`

---

### Crash 137 (RAM)
```
api-1  | INFO:     Application startup complete.
api-1 exited with code 137
api-1  | INFO:     Will watch for changes...
# ↑ Tué par manque de RAM! Invisible avec -d!
```

**Solution:** Augmenter RAM Docker

---

### Erreur au démarrage
```
api-1  | ⚠️ Erreur lors du chargement des routes : Attribute name 'metadata' is reserved
api-1  | Traceback (most recent call last):
# ↑ Erreur visible immédiatement! Invisible avec -d!
```

**Solution:** Corriger le code

---

### Port occupé
```
api-1  | Error: bind: address already in use
# ↑ Port 8000 déjà utilisé! Invisible avec -d!
```

**Solution:** `lsof -nP -iTCP:8000 -sTCP:LISTEN`

---

## 📊 Commandes Utiles

### Voir l'état des services
```bash
# État rapide
docker compose ps

# État détaillé avec ressources
docker stats

# État d'un service
docker compose ps api
```

### Logs
```bash
# Tous les services
docker compose logs -f

# Un service
docker compose logs -f api

# Dernières N lignes
docker compose logs --tail=100 api

# Depuis un timestamp
docker compose logs --since 5m api

# Sans follow (snapshot)
docker compose logs api > logs.txt
```

### Debugging interactif
```bash
# Shell dans un container
docker compose exec api /bin/bash

# Exécuter une commande
docker compose exec api python -c "import main; print('test')"

# Voir les variables d'env
docker compose exec api env

# Voir les processus
docker compose exec api ps aux
```

### Restart & Rebuild
```bash
# Restart un service
docker compose restart api

# Rebuild puis restart
docker compose up -d --build api

# Force recreate
docker compose up -d --force-recreate api

# Rebuild complet sans cache
docker compose build --no-cache api
docker compose up -d api
```

### Nettoyage
```bash
# Arrêter tout
docker compose down

# Arrêter + supprimer volumes
docker compose down -v

# Nettoyer Docker système
docker system prune -f

# Nettoyer images inutilisées
docker image prune -a
```

---

## 🎯 Checklist de Debug

Quand quelque chose ne fonctionne pas:

- [ ] `docker compose up` pour voir les logs en direct
- [ ] Vérifier qu'il n'y a pas de boucle de reload
- [ ] Vérifier qu'il n'y a pas d'erreur récurrente
- [ ] `docker compose ps` → Tous healthy?
- [ ] `docker stats` → RAM/CPU normaux?
- [ ] `docker compose logs -f api` → Erreurs?
- [ ] `lsof -nP -iTCP:8000` → Port libre?

---

## 💡 Astuces

### Voir uniquement les erreurs
```bash
docker compose logs api | grep -i error
docker compose logs api | grep -E "ERROR|CRITICAL|Exception"
```

### Suivre un fichier de log
```bash
docker compose exec api tail -f /app/logs/app.log
```

### Comparer avant/après rebuild
```bash
# Avant
docker compose logs api --tail=100 > before.log

# Rebuild
docker compose up -d --build api

# Après
docker compose logs api --tail=100 > after.log

# Diff
diff before.log after.log
```

### Timeout de démarrage
```bash
# Attendre que l'API soit prête
timeout 60s bash -c 'until curl -f http://localhost:8000/api/v1/health; do sleep 2; done'
```

---

## 🚀 Scripts de Debug Rapides

### check-health.sh
```bash
#!/bin/bash
services="api frontend postgres redis"

for svc in $services; do
  status=$(docker compose ps $svc --format json | jq -r '.Health')
  if [[ "$status" == "healthy" ]]; then
    echo "✅ $svc"
  else
    echo "❌ $svc ($status)"
    docker compose logs --tail=20 $svc
  fi
done
```

### watch-logs.sh
```bash
#!/bin/bash
# Surveiller les logs avec highlighting
docker compose logs -f api | grep --color=auto -E 'ERROR|WARNING|CRITICAL|Exception|$'
```

---

## 📚 Ressources

- [Docker Compose logs](https://docs.docker.com/compose/reference/logs/)
- [Docker stats](https://docs.docker.com/engine/reference/commandline/stats/)
- [Healthcheck](https://docs.docker.com/compose/compose-file/05-services/#healthcheck)

---

**Dernière mise à jour:** 24 octobre 2025
**Auteur:** Session d'optimisation Docker
