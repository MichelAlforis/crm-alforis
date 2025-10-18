# 🔧 Troubleshooting - Scripts de développement

Ce guide vous aide à résoudre les problèmes courants avec les scripts de développement.

## 🐳 Problèmes Docker

### ❌ Erreur : Port 5433 déjà utilisé (POSTGRES)

**Symptôme :**
```
⚠️  Le port POSTGRES 5433 est occupé par: com.docke (PID 74864)
⚠️  Le port 5433 est tenu par Docker Desktop.
```

**Cause :** Un ancien conteneur Postgres utilise déjà le port 5433.

**Solution rapide :**
```bash
# Solution 1 : Utiliser la commande kill-ports du script
cd /path/to/V1
bash scripts/dev.sh kill-ports

# Solution 2 : Supprimer manuellement les conteneurs
docker ps -a | grep 5433
docker rm -f <container-name>

# Solution 3 : Redémarrer Docker Desktop
# macOS : Cmd+Q sur Docker Desktop, puis relancer
# Windows : Clic droit sur l'icône Docker → Quit, puis relancer
```

**Prévention :**
Le script a été amélioré pour automatiquement nettoyer les conteneurs sur ce port.

---

### ❌ Erreur : Port 8000 déjà utilisé (API)

**Symptôme :**
```
⚠️  Le port API 8000 est occupé par: python (PID 12345)
```

**Solution :**
```bash
# Le script gère automatiquement ce cas
bash scripts/dev.sh up

# Ou manuellement :
lsof -ti:8000 | xargs kill -9
```

---

### ❌ Erreur : "Docker daemon not running"

**Symptôme :**
```
❌ Docker injoignable après 60s
```

**Solution :**

**macOS :**
```bash
open -a Docker
# Attendre quelques secondes que Docker démarre
bash scripts/dev.sh up
```

**Linux :**
```bash
sudo systemctl start docker
bash scripts/dev.sh up
```

**Windows :**
- Démarrer Docker Desktop depuis le menu Démarrer
- Attendre l'icône Docker dans la barre des tâches
- Relancer le script

---

### ❌ Services en état "inconnu"

**Symptôme :**
```
⚠️  postgres : état inconnu ()
⚠️  api : état inconnu ()
```

**Cause :** Les conteneurs n'existent pas ou ont été supprimés.

**Solution :**
```bash
# Le script va maintenant automatiquement les recréer
bash scripts/dev.sh up

# Ou forcer un rebuild complet :
bash scripts/dev.sh rebuild
```

---

### ❌ Base de données Postgres ne démarre pas

**Symptôme :**
```
postgres: exited/crashed
```

**Solution :**
```bash
# 1. Vérifier les logs
bash scripts/dev.sh logs

# 2. Nettoyer et redémarrer
bash scripts/dev.sh clean
bash scripts/dev.sh up

# 3. Si le problème persiste, supprimer le volume
docker volume ls | grep postgres
docker volume rm <volume-name>
bash scripts/dev.sh up
```

---

## 🌐 Problèmes Frontend

### ❌ Erreur : EADDRINUSE port 3010

**Symptôme :**
```
Error: listen EADDRINUSE: address already in use :::3010
```

**Solution :**
```bash
# Utiliser le script de démarrage propre
cd crm-frontend
npm run dev:clean

# Ou tuer manuellement le port
npm run kill-port
```

---

### ❌ Module non trouvé

**Symptôme :**
```
Module not found: Can't resolve '@/components/...'
```

**Solution :**
```bash
cd crm-frontend
rm -rf node_modules .next
npm install
npm run dev:clean
```

---

## 🔍 Commandes de diagnostic

### Doctor - Diagnostic complet
```bash
cd /path/to/V1
bash scripts/dev.sh doctor
```

Affiche :
- Context Docker actuel
- Informations Docker
- Ports en écoute
- Conteneurs actifs
- Services compose

### Vérifier les ports
```bash
# Vérifier qui utilise un port
lsof -nP -iTCP:3010 -sTCP:LISTEN
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:5433 -sTCP:LISTEN

# Tuer un processus sur un port
lsof -ti:3010 | xargs kill -9
```

### Vérifier Docker
```bash
# Docker est-il lancé ?
docker info

# Lister tous les conteneurs
docker ps -a

# Lister les conteneurs utilisant un port
docker ps -a --filter "publish=5433"

# Nettoyer tous les conteneurs arrêtés
docker container prune
```

---

## 📋 Checklist de résolution

Avant de signaler un bug, vérifiez :

1. ✅ Docker Desktop est lancé et fonctionne
2. ✅ Aucun conteneur zombie ne bloque les ports : `bash scripts/dev.sh kill-ports`
3. ✅ Les dépendances sont installées : `npm install`
4. ✅ Le cache est propre : `npm run dev:clean`
5. ✅ Les logs ne montrent pas d'erreur évidente : `bash scripts/dev.sh logs`

---

## 🆘 Réinitialisation complète

Si rien ne fonctionne, réinitialisation totale :

```bash
# 1. Arrêter tout
cd /path/to/V1
bash scripts/dev.sh down

# 2. Nettoyer Docker
docker system prune -a --volumes -f

# 3. Tuer les ports
bash scripts/dev.sh kill-ports

# 4. Frontend : nettoyer
cd crm-frontend
rm -rf node_modules .next
npm install

# 5. Redémarrer tout
cd ..
bash scripts/dev.sh up
cd crm-frontend
npm run dev:clean
```

---

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. Exécutez : `bash scripts/dev.sh doctor > diagnostic.txt`
2. Partagez le fichier `diagnostic.txt`
3. Incluez les logs : `bash scripts/dev.sh logs > logs.txt`

---

## 🎯 Scénarios fréquents

### "J'ai redémarré mon Mac et rien ne marche"
```bash
# Docker Desktop s'est arrêté
open -a Docker
# Attendre 10 secondes
bash scripts/dev.sh up
cd crm-frontend && npm run dev:clean
```

### "J'ai fait Cmd+C mais le port est toujours occupé"
```bash
bash scripts/dev.sh kill-ports
npm run kill-port  # Pour le frontend
```

### "Les modifications du code ne sont pas prises en compte"
```bash
# Backend : redémarrer les conteneurs
bash scripts/dev.sh restart

# Frontend : nettoyer le cache
npm run dev:clean
```

### "Je veux tout recommencer de zéro"
Voir la section "Réinitialisation complète" ci-dessus.
