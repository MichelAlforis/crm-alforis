# 🔄 Synchronisation Base de Données Production ↔️ Local

Guide pour synchroniser votre base de données locale avec la production.

---

## 🎯 Objectif

Travailler en local avec les **mêmes données** que la production :
- Utilisateurs identiques
- Organisations et contacts de production
- Configuration complète

---

## 📋 Prérequis

- **SSH** : Accès au serveur de production (`~/.ssh/id_rsa_hetzner`)
- **Docker** : Docker Desktop lancé en local
- **PostgreSQL** : Container `crm-backend-postgres-1` configuré

---

## 📥 Importer la Base de Production en Local

### Étape 1 : Exporter depuis la production

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
./crm-backend/scripts/export_prod_db.sh
```

**Ce que fait ce script :**
1. Se connecte au serveur de production
2. Exporte la base PostgreSQL complète (pg_dump)
3. Télécharge le fichier SQL en local dans `crm-backend/crm_production.sql`

**Durée :** ~10 secondes

### Étape 2 : Importer en local

```bash
./crm-backend/scripts/import_dev_db.sh
```

**Ce que fait ce script :**
1. Vérifie que Docker est lancé
2. Vérifie que le dump existe
3. **⚠️ ÉCRASE** votre base locale avec la production
4. Affiche les statistiques (tables, nombre d'utilisateurs)

**Durée :** ~5 secondes

⚠️ **ATTENTION** : Cette opération supprime toutes les données locales actuelles !

---

## 🔑 Credentials Après Import

Une fois l'import terminé, vous pouvez vous connecter en local avec :

```
URL:      http://localhost:3000
Email:    michel.marques@alforis.fr
Password: admin123
```

C'est le **même utilisateur** que sur la production.

---

## 🔄 Synchronisation Régulière

### Quand synchroniser ?

- **Après un déploiement** : Si vous avez ajouté des données en production
- **En début de journée** : Pour avoir les dernières données
- **Avant un test** : Pour tester avec les vraies données

### Fréquence recommandée

- **Développement actif** : 1x par jour
- **Maintenance** : 1x par semaine
- **Production stable** : Sur demande

---

## 📤 Exporter les Données Locales vers Production

⚠️ **DANGEREUX** : Ne faites ceci que si vous êtes sûr !

```bash
# 1. Export de votre base locale
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
docker exec crm-backend-postgres-1 pg_dump -U crm_user -d crm_db --clean --if-exists > crm-backend/crm_local.sql

# 2. Upload vers la production
scp -i ~/.ssh/id_rsa_hetzner crm-backend/crm_local.sql root@159.69.108.234:/tmp/

# 3. Import en production (ATTENTION !)
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 << 'EOF'
cd /srv/crm-alforis

# Backup de sécurité
./scripts/deploy.sh backup-db

# Import
docker cp /tmp/crm_local.sql crm-alforis-postgres-1:/tmp/
docker compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user -d crm_db < /tmp/crm_local.sql
EOF
```

---

## 🛠️ Troubleshooting

### Problème : "Container PostgreSQL non trouvé"

**Solution :** Démarrez votre environnement Docker local

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
docker-compose up -d
```

### Problème : "Connection refused" lors de l'import

**Solution :** Attendez que PostgreSQL soit prêt

```bash
# Vérifier que PostgreSQL est démarré
docker ps | grep postgres

# Vérifier les logs
docker logs crm-backend-postgres-1
```

### Problème : "Fichier crm_production.sql non trouvé"

**Solution :** Exportez d'abord depuis la production

```bash
./crm-backend/scripts/export_prod_db.sh
```

### Problème : Erreurs SQL lors de l'import

**Causes possibles :**
- Dump incomplet
- Versions PostgreSQL différentes
- Base locale corrompue

**Solution :**

```bash
# 1. Supprimer la base locale
docker exec crm-backend-postgres-1 psql -U crm_user -d postgres -c "DROP DATABASE IF EXISTS crm_db;"

# 2. Recréer une base vide
docker exec crm-backend-postgres-1 psql -U crm_user -d postgres -c "CREATE DATABASE crm_db OWNER crm_user;"

# 3. Réimporter
./crm-backend/scripts/import_dev_db.sh
```

---

## 📊 Vérifier la Synchronisation

### Comparer les données

**En production :**
```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 \
  "cd /srv/crm-alforis && docker compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user -d crm_db -c 'SELECT COUNT(*) FROM users;'"
```

**En local :**
```bash
docker exec crm-backend-postgres-1 psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM users;"
```

Les deux commandes doivent retourner le **même nombre**.

---

## 🔐 Sécurité

### Bonnes Pratiques

1. ✅ **Ne commitez JAMAIS** `crm_production.sql` dans Git
2. ✅ Supprimez le dump après import : `rm crm-backend/crm_production.sql`
3. ✅ Utilisez des mots de passe différents en local/prod
4. ✅ Ne partagez pas vos dumps (contiennent des données sensibles)

### Gitignore

Le fichier `.gitignore` exclut déjà :
```
crm-backend/crm_production.sql
crm-backend/crm_local.sql
*.sql
```

---

## 📝 Résumé des Commandes

```bash
# SYNC PRODUCTION → LOCAL (usage courant)
./crm-backend/scripts/export_prod_db.sh    # Exporter de prod
./crm-backend/scripts/import_dev_db.sh     # Importer en local

# VÉRIFICATION
docker exec crm-backend-postgres-1 psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM users;"

# NETTOYAGE
rm crm-backend/crm_production.sql
```

---

## 🎓 Cas d'Usage

### Cas 1 : Nouveau développeur dans l'équipe

```bash
# 1. Cloner le repo
git clone <repo-url>
cd crm

# 2. Démarrer Docker
docker-compose up -d

# 3. Importer la base de production
./crm-backend/scripts/export_prod_db.sh
./crm-backend/scripts/import_dev_db.sh

# 4. Lancer l'API
cd crm-backend
python main.py

# 5. Lancer le frontend
cd ../crm-frontend
npm run dev
```

### Cas 2 : Tester une nouvelle fonctionnalité avec vraies données

```bash
# 1. Sync avant de commencer
./crm-backend/scripts/export_prod_db.sh
./crm-backend/scripts/import_dev_db.sh

# 2. Développer et tester
# ... votre code ...

# 3. Une fois validé, déployer en prod
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push
./scripts/deploy.sh deploy
```

### Cas 3 : Débugger un problème reporté en production

```bash
# 1. Reproduire l'environnement exact
./crm-backend/scripts/export_prod_db.sh
./crm-backend/scripts/import_dev_db.sh

# 2. Reproduire le bug avec les vraies données
# 3. Corriger
# 4. Tester
# 5. Déployer le fix
```

---

## 📚 Fichiers Créés

- `crm-backend/scripts/export_prod_db.sh` : Script d'export production → local
- `crm-backend/scripts/import_dev_db.sh` : Script d'import en local
- `crm-backend/crm_production.sql` : Dump SQL (généré, non versionné)

---

**Dernière mise à jour :** 2025-10-20
