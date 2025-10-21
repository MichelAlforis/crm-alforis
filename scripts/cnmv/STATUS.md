# ✅ SELENIUM GOOGLE SCRAPER - ESPAGNE (CNMV)

## 🎯 Objectif

Enrichir **117 sociétés SGIIC espagnoles** avec la méthode Luxembourg (99% de succès) via recherches Google automatiques:
- 🌐 Websites
- 📧 Emails
- 📞 Téléphones

## 📊 État actuel

### Scraper en cours d'exécution

```bash
# Vérifier si le scraper tourne
ps aux | grep selenium_google_scraper.py | grep -v grep

# Suivre la progression
cd scripts/cnmv
python3 generate_final_report.py
```

### Progression attendue

| Champ | Objectif | Actuel |
|-------|----------|--------|
| Websites | 95-99% | ~60-80% (en cours) |
| Emails | 95-99% | ~94% ✅ |
| Téléphones | 60-80% | ~15% (normal, peu publiés) |

## 🚀 Fichiers créés

### Scripts principaux

1. **[selenium_google_scraper.py](selenium_google_scraper.py)**
   - Scraper principal basé sur méthode Luxembourg
   - Exécution automatique pour 117 sociétés
   - Cache automatique (reprend où il s'arrête)
   - Durée: ~15-20 minutes

2. **[save_selenium_results.py](save_selenium_results.py)**
   - Sauvegarde intermédiaire pendant l'exécution
   - Génère CSV enrichi
   - Crée backups automatiques

3. **[generate_final_report.py](generate_final_report.py)**
   - Rapport détaillé avec statistiques
   - Comparaison avec objectif Luxembourg (99%)
   - Contrôles qualité

4. **[monitor_progress.sh](monitor_progress.sh)**
   - Monitor temps réel de progression
   - Rafraîchissement auto toutes les 10s

### Fichiers de données

- `output/selenium_cache.json` - Cache Google (clé: nom société)
- `output/selenium_progress.json` - Sauvegarde tous les 10 sociétés
- `output/cnmv_selenium_enriched.csv` - **CSV FINAL** pour import CRM
- `output/selenium_scraper.log` - Logs d'exécution

## 📋 Commandes utiles

### Vérifier la progression

```bash
cd scripts/cnmv

# Méthode 1: Rapport complet
python3 generate_final_report.py

# Méthode 2: Monitor temps réel
./monitor_progress.sh

# Méthode 3: Quick check
python3 -c "import json; data=json.load(open('output/selenium_cache.json')); print(f'{len(data)}/117 sociétés')"
```

### Sauvegarder l'état actuel

```bash
cd scripts/cnmv
python3 save_selenium_results.py
```

Génère:
- `output/cnmv_selenium_enriched.csv` - État actuel
- `output/backups/cnmv_enriched_YYYYMMDD_HHMMSS.csv` - Backup

### Arrêter le scraper

```bash
pkill -f selenium_google_scraper.py
```

Le cache est sauvegardé automatiquement, donc vous pouvez reprendre plus tard.

### Relancer le scraper

```bash
cd scripts/cnmv
python3 selenium_google_scraper.py --headless &
```

Il reprendra automatiquement où il s'est arrêté grâce au cache.

## 🎓 Méthode d'enrichissement

### 1. Recherche Google

Pour chaque société:

```
Query 1: "{nom société} España gestora contacto email telefono"
→ Extract: website, email, phone depuis résultats Google
```

Si website non trouvé:
```
Query 2: "{nom société} España"
→ Retry extraction website
```

### 2. Fallback: Email→Domain

Si toujours pas de website mais email trouvé:
```
Email: info@metagestion.com
→ Website: https://metagestion.com
```

### 3. Anti-détection Google

- ✅ User-Agent Chrome MacOS
- ✅ Flags automation désactivés
- ✅ Délai 4s entre recherches
- ✅ Gestion cookies automatique
- ✅ Headless mode

### 4. Extraction intelligente

**Websites:**
- Multiples sélecteurs CSS (fallback si Google change structure)
- Exclusion LinkedIn, Wikipedia, CNMV, médias
- Nettoyage URL (query params, anchors)

**Emails:**
- Regex pattern standard
- Préférence: `contact@`, `info@`, `atencion@`
- Exclusion: noreply, admin, webmaster
- Validation domaine

**Téléphones:**
- Pattern Espagne: `+34 XXX XXX XXX`
- Formats: +34, 0034, (34)

## 🔄 Comparaison avec l'ancien système

| Aspect | Ancien (auto_enrich_google.py) | Nouveau (selenium_google_scraper.py) |
|--------|--------------------------------|-------------------------------------|
| Méthode | Hardcoded data | Google scraping réel |
| Taux enrichissement | 26% (30/117) | ~90-95% attendu |
| Emails | Pré-validés seulement | Extraction automatique |
| Websites | Pré-validés seulement | Extraction + fallback domain |
| Source | Base de données manuelle | Google Search live |

## 📈 Résultats attendus

Basé sur Luxembourg (266 sociétés, 99% de succès):

**Avant Selenium:**
- 30/117 sociétés (26%)
- Tier 1+2: 100% enrichi (données manuelles)
- Tier 3: 9% enrichi

**Après Selenium (attendu):**
- 115/117 sociétés (~99%)
- Tous tiers: 95%+ enrichi
- Prêt pour import CRM

## ✅ Prochaines étapes

1. **Attendre fin du scraping** (~10-15 minutes restantes)

2. **Vérifier les résultats:**
   ```bash
   cd scripts/cnmv
   python3 generate_final_report.py
   ```

3. **Générer CSV final:**
   ```bash
   python3 save_selenium_results.py
   ```

4. **Import dans CRM:**
   - Fichier: `output/cnmv_selenium_enriched.csv`
   - Format: Standard import CRM
   - Colonnes: name, email, phone, website, address, city, postal_code, country, type, register_number, aum, tier, pipeline_stage

## 🐛 Troubleshooting

### Le scraper ne trouve pas de websites

**Cause:** Google peut bloquer ou retourner résultats différents

**Solution:**
```bash
# Le fallback email→domain active automatiquement
# Devrait couvrir ~80% des cas manquants
```

### Email invalides détectés

**Exemple:** `empty-light@2x.png`

**Solution:** Sera filtré automatiquement dans le CSV final par validation

### Le scraper semble bloqué

```bash
# Vérifier les logs
tail -f scripts/cnmv/output/selenium_scraper.log

# Vérifier cache progression
python3 -c "import json; print(len(json.load(open('scripts/cnmv/output/selenium_cache.json'))))"
```

Si pas de progression après 5 minutes:
```bash
pkill -f selenium_google_scraper.py
python3 scripts/cnmv/selenium_google_scraper.py --headless &
```

## 📞 Support

- Logs: `scripts/cnmv/output/selenium_scraper.log`
- Cache: `scripts/cnmv/output/selenium_cache.json`
- Documentation: `scripts/cnmv/SELENIUM_SCRAPER_README.md`
