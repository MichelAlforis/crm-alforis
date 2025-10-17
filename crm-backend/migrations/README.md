# 📁 Migrations CRM

Ce dossier contient les scripts de migration pour le CRM Alforis.

## 🗂️ Fichiers

### `unify_architecture.py`
Script principal de migration pour unifier l'architecture:
- Migre `Investor` → `Organisation` (type=CLIENT)
- Migre `Fournisseur` → `Organisation` (type=FOURNISSEUR)
- Migre `Contact` + `FournisseurContact` → `Person` + `PersonOrganizationLink`

**Usage:**
```bash
# Simulation (dry-run)
python migrations/unify_architecture.py --dry-run

# Exécution réelle
python migrations/unify_architecture.py --execute
```

### `cleanup_old_tables.py`
Script de nettoyage des anciennes tables après migration réussie.

**Usage:**
```bash
# Simulation
python migrations/cleanup_old_tables.py --dry-run

# Exécution réelle (⚠️ IRREVERSIBLE)
python migrations/cleanup_old_tables.py --execute
```

## 📖 Guide Complet

Consultez le [GUIDE_MIGRATION_ARCHITECTURE.md](../../GUIDE_MIGRATION_ARCHITECTURE.md) à la racine du projet pour un guide pas-à-pas détaillé.

## ⚠️ Important

1. **Toujours faire un backup avant de migrer!**
   ```bash
   ./scripts/backup_database.sh
   ```

2. **Toujours tester en dry-run d'abord**

3. **Vérifier l'intégrité des données après migration**

4. **Ne supprimer les anciennes tables qu'après validation complète**

## 🔄 Ordre d'Exécution

1. ✅ Backup (`./scripts/backup_database.sh`)
2. ✅ Simulation (`unify_architecture.py --dry-run`)
3. ✅ Migration (`unify_architecture.py --execute`)
4. ✅ Tests de l'application
5. ✅ Nettoyage (`cleanup_old_tables.py --execute`) - optionnel

## 📞 Support

En cas de problème, consultez la section Troubleshooting du guide de migration.
