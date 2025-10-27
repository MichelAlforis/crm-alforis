# 🪞 Docker Registry Mirrors - Configuration et Optimisation

Guide complet sur les registry mirrors Docker pour contourner les pannes de Docker Hub et optimiser les téléchargements d'images.

---

## 📖 Qu'est-ce qu'un Registry Mirror ?

Un **registry mirror** est un serveur qui cache les images Docker depuis Docker Hub (ou d'autres registries) et les sert plus rapidement depuis un emplacement géographiquement proche ou plus fiable.

### Principe de fonctionnement

```
┌──────────────┐    ❌ Panne     ┌──────────────┐
│ Votre Serveur│  ────────────>  │ Docker Hub   │
│              │                  │ (registry.   │
│              │                  │  docker.io)  │
└──────┬───────┘                  └──────────────┘
       │
       │ ✅ Fallback sur mirror
       │
       ▼
┌──────────────┐                  ┌──────────────┐
│ Registry     │  ──── Cache ──>  │ Google Cloud │
│ Mirror       │                  │ Registry     │
│ (GCR)        │                  │ (GCR)        │
└──────────────┘                  └──────────────┘
```

### Avantages

1. **Haute disponibilité** : Si Docker Hub tombe, le mirror peut servir les images en cache
2. **Performance** : Téléchargement plus rapide depuis un serveur géographiquement proche
3. **Économie de bande passante** : Les images sont mises en cache
4. **Pas de rate limiting** : Certains mirrors n'ont pas les limites de Docker Hub (100 pulls/6h pour anonymous)

### Limitations

- ⚠️ **Pas de garantie de disponibilité** : Si une image n'est pas en cache, le mirror doit aller la chercher sur Docker Hub
- ⚠️ **Dépendance externe** : Vous dépendez d'un service tiers (Google, Azure, etc.)
- ⚠️ **Images privées non supportées** : Les mirrors ne peuvent cacher que les images publiques

---

## 🔧 Configuration Actuelle (Serveur Alforis)

### Fichier `/etc/docker/daemon.json`

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://registry-1.docker.io"
  ]
}
```

### Problèmes avec cette configuration

❌ **Erreur de configuration** : `registry-1.docker.io` n'est **pas un mirror**, c'est Docker Hub lui-même !

**Conséquence** : Si Docker Hub est en panne, Docker essaiera d'abord GCR (qui peut ne pas avoir l'image en cache), puis Docker Hub (en panne), ce qui ne résout rien.

---

## ✅ Configuration Optimale Recommandée

### Option 1 : Mirrors Publics Multiples (Recommandé)

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://dockerhub.azk8s.cn",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "log-level": "warn"
}
```

**Mirrors testés et fiables :**

| Mirror | Provider | Localisation | Performance |
|--------|----------|--------------|-------------|
| `mirror.gcr.io` | Google Cloud | Global | ⭐⭐⭐⭐⭐ |
| `dockerhub.azk8s.cn` | Azure China | Asie | ⭐⭐⭐⭐ |
| `docker.mirrors.ustc.edu.cn` | USTC China | Asie | ⭐⭐⭐ |

### Option 2 : Mirror Privé (Pour Production Critique)

Si vous avez des besoins critiques de haute disponibilité, vous pouvez héberger votre propre registry mirror.

```bash
# 1. Créer un registry Docker local qui miroir Docker Hub
docker run -d \
  --name docker-registry-mirror \
  --restart=always \
  -p 5000:5000 \
  -v /var/lib/registry-mirror:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  registry:2
```

Puis configurer `/etc/docker/daemon.json` :

```json
{
  "registry-mirrors": [
    "http://localhost:5000",
    "https://mirror.gcr.io"
  ]
}
```

**Avantages :**
- ✅ Contrôle total
- ✅ Cache local permanent
- ✅ Pas de dépendance externe

**Inconvénients :**
- ❌ Nécessite de la bande passante serveur
- ❌ Nécessite de l'espace disque (50-200GB+)
- ❌ Maintenance supplémentaire

### Option 3 : Sans Mirror (Mode Dégradé)

Si aucun mirror n'est fiable, vous pouvez désactiver complètement les mirrors :

```json
{
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "log-level": "warn"
}
```

Dans ce cas, Docker ira directement sur Docker Hub. Utilisez cette option uniquement si Docker Hub est stable.

---

## 🚀 Appliquer la Configuration Recommandée

### Sur le serveur Alforis

```bash
# 1. Se connecter au serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# 2. Sauvegarder la config actuelle
cp /etc/docker/daemon.json /etc/docker/daemon.json.backup

# 3. Éditer la configuration
nano /etc/docker/daemon.json
```

**Copier cette configuration :**

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "log-level": "warn",
  "storage-driver": "overlay2",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Explication des paramètres :**

- `registry-mirrors` : Liste des mirrors (on garde uniquement GCR, le plus fiable)
- `max-concurrent-downloads` : Télécharge 10 layers en parallèle (accélère les pulls)
- `max-concurrent-uploads` : Upload 5 layers en parallèle (pour les pushs)
- `log-level` : Réduit les logs verbeux
- `storage-driver` : Utilise overlay2 (meilleure performance)
- `log-opts` : Limite la taille des logs (évite de remplir le disque)

```bash
# 4. Valider le JSON
cat /etc/docker/daemon.json | jq .

# 5. Redémarrer Docker
systemctl restart docker

# 6. Vérifier que Docker a redémarré
systemctl status docker

# 7. Vérifier la config
docker info | grep -A 5 "Registry Mirrors"
```

**Sortie attendue :**
```
Registry Mirrors:
  https://mirror.gcr.io/
```

---

## 🧪 Tester les Mirrors

### Test de performance

```bash
# Test 1 : Pull d'une petite image
time docker pull alpine:latest

# Test 2 : Pull d'une grosse image
time docker pull python:3.11-slim

# Test 3 : Vérifier depuis quel mirror l'image vient
docker pull -v alpine:latest 2>&1 | grep -i "pulling from"
```

### Test de fallback

```bash
# Simuler une panne de Docker Hub en bloquant registry-1.docker.io
iptables -A OUTPUT -d registry-1.docker.io -j DROP

# Essayer de pull une image
docker pull nginx:alpine

# Si ça fonctionne, le mirror a pris le relais !

# Restaurer l'accès à Docker Hub
iptables -D OUTPUT -d registry-1.docker.io -j DROP
```

---

## 📊 Monitoring des Mirrors

### Vérifier les téléchargements

```bash
# Logs Docker pour voir d'où viennent les pulls
journalctl -u docker -f | grep -i "pull"

# Exemple de sortie :
# pulling from mirror.gcr.io/library/alpine
# pulling from registry-1.docker.io/library/nginx
```

### Statistiques Docker

```bash
# Voir les images téléchargées
docker images

# Voir l'espace utilisé
docker system df

# Statistiques détaillées
docker system df -v
```

---

## 🐛 Troubleshooting

### Problème : "manifest unknown" avec un mirror

**Symptôme :**
```
Error response from daemon: manifest for <image> not found: manifest unknown
```

**Cause :** Le mirror n'a pas l'image en cache et ne peut pas la récupérer depuis Docker Hub.

**Solution :**
```bash
# 1. Retirer temporairement le mirror
nano /etc/docker/daemon.json
# Supprimer la ligne du mirror problématique

# 2. Redémarrer Docker
systemctl restart docker

# 3. Pull l'image directement
docker pull <image>

# 4. Restaurer le mirror
nano /etc/docker/daemon.json
# Remettre le mirror

# 5. Redémarrer Docker
systemctl restart docker
```

### Problème : Docker ne démarre plus après changement de config

**Symptôme :**
```
systemctl status docker
● docker.service - Docker Application Container Engine
   Active: failed
```

**Cause :** Erreur de syntaxe JSON dans `daemon.json`

**Solution :**
```bash
# 1. Vérifier les logs
journalctl -u docker -n 50

# 2. Valider le JSON
cat /etc/docker/daemon.json | jq .

# 3. Restaurer le backup
cp /etc/docker/daemon.json.backup /etc/docker/daemon.json

# 4. Redémarrer
systemctl restart docker
```

### Problème : Pulls très lents même avec mirror

**Causes possibles :**
1. Bande passante serveur saturée
2. Mirror lui-même lent
3. Trop de downloads concurrents

**Solution :**
```bash
# 1. Tester la bande passante
curl -o /dev/null http://speedtest.wdc01.softlayer.com/downloads/test500.zip

# 2. Changer de mirror
# Éditer /etc/docker/daemon.json et essayer un autre mirror

# 3. Réduire les downloads concurrents
# Dans daemon.json :
{
  "max-concurrent-downloads": 3
}
```

---

## 📈 Best Practices

### Pour un serveur de production

1. **Utiliser un seul mirror fiable** (ex: Google Cloud Registry)
   - Évite les conflits entre mirrors
   - Plus simple à débugger

2. **Configurer des logs limités**
   ```json
   "log-opts": {
     "max-size": "10m",
     "max-file": "3"
   }
   ```

3. **Monitoring régulier**
   - Vérifier l'espace disque (`docker system df`)
   - Nettoyer régulièrement (`docker system prune`)

4. **Backups des images critiques**
   ```bash
   # Sauvegarder une image localement
   docker save postgres:16-alpine | gzip > postgres-16-alpine.tar.gz

   # Restaurer en cas de problème
   docker load < postgres-16-alpine.tar.gz
   ```

5. **Utiliser des tags spécifiques**
   - ❌ `FROM python:3` (tag mutable)
   - ✅ `FROM python:3.11-slim` (tag plus stable)
   - ⭐ `FROM python@sha256:abc123...` (immutable)

### Pour le développement local

1. **Pas de mirror nécessaire** (votre connexion est probablement plus rapide)
2. **Rate limiting Docker Hub** : Authentifiez-vous pour avoir 200 pulls/6h
   ```bash
   docker login
   ```

---

## 🎯 Recommandation Finale pour Alforis CRM

### Configuration optimale `/etc/docker/daemon.json`

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "log-level": "warn",
  "storage-driver": "overlay2",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
```

### Pourquoi cette configuration ?

1. **Un seul mirror (GCR)** : Google Cloud Registry est le plus fiable et performant
2. **Concurrent downloads** : Accélère les builds multi-stage
3. **Log rotation** : Évite de remplir le disque avec les logs
4. **live-restore** : Permet de redémarrer Docker sans tuer les containers

### Application

```bash
# Script d'application automatique
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 << 'EOF'
# Backup
cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d)

# Nouvelle config
cat > /etc/docker/daemon.json << 'JSON'
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "log-level": "warn",
  "storage-driver": "overlay2",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
JSON

# Validation
jq . /etc/docker/daemon.json

# Redémarrage
systemctl restart docker

# Vérification
docker info | grep -A 5 "Registry Mirrors"
echo "✅ Configuration appliquée"
EOF
```

---

## 📚 Ressources

- **Docker Registry Documentation** : https://docs.docker.com/registry/
- **Docker Daemon Config** : https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file
- **Google Container Registry** : https://cloud.google.com/container-registry
- **Rate Limiting Docker Hub** : https://docs.docker.com/docker-hub/download-rate-limit/

---

## 📝 Résumé

### ❌ Configuration actuelle (à corriger)

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://registry-1.docker.io"  // ❌ Pas un mirror !
  ]
}
```

### ✅ Configuration recommandée

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io"  // ✅ Seul mirror fiable
  ],
  "max-concurrent-downloads": 10,
  "log-level": "warn",
  "storage-driver": "overlay2",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
```

### 🎯 Action recommandée

**Appliquer la configuration optimale dès maintenant** pour éviter les futurs problèmes avec Docker Hub.
