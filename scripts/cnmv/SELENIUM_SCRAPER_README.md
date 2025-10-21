# Selenium Google Scraper - Espagne (CNMV)

## 📋 Vue d'ensemble

Scraper Selenium basé sur la **méthode Luxembourg** qui a atteint **99% d'enrichissement**.

Extrait automatiquement pour les 117 sociétés SGIIC espagnoles:
- 🌐 **Websites** (sites officiels)
- 📧 **Emails** (contacts généraux, pas directs)
- 📞 **Téléphones** (standards, pas directs)

## 🚀 Utilisation

### Lancer le scraper (mode automatique)

```bash
cd scripts/cnmv
python3 selenium_google_scraper.py --headless
```

**Le script va:**
1. Charger le cache existant (reprend où il s'est arrêté)
2. Scraper Google pour chaque société (4 secondes entre chaque recherche)
3. Sauvegarder automatiquement tous les 10 sociétés
4. Générer un CSV final à la fin

**Temps total estimé:** ~15-20 minutes pour 117 sociétés

### Suivre la progression

```bash
# Méthode 1: Monitor en temps réel
cd scripts/cnmv
chmod +x monitor_progress.sh
./monitor_progress.sh
```

```bash
# Méthode 2: Check manuel
cd scripts/cnmv
python3 << 'EOF'
import json
with open("output/selenium_cache.json", "r") as f:
    data = json.load(f)
total = len(data)
with_web = sum(1 for v in data.values() if v.get('website'))
with_email = sum(1 for v in data.values() if v.get('email'))
with_phone = sum(1 for v in data.values() if v.get('phone'))
print(f"Progression: {total}/117 sociétés")
print(f"  Websites: {with_web}/{total} ({with_web/total*100:.0f}%)")
print(f"  Emails: {with_email}/{total} ({with_email/total*100:.0f}%)")
print(f"  Phones: {with_phone}/{total} ({with_phone/total*100:.0f}%)")
EOF
```

### Sauvegarder les résultats

Pendant que le scraper tourne, vous pouvez sauvegarder l'état actuel:

```bash
cd scripts/cnmv
python3 save_selenium_results.py
```

Cela va:
- Merger le cache avec les données CNMV
- Générer `output/cnmv_selenium_enriched.csv`
- Créer un backup avec timestamp

## 📂 Fichiers

### Scripts principaux

| Fichier | Description |
|---------|-------------|
| `selenium_google_scraper.py` | Scraper principal (méthode Luxembourg) |
| `save_selenium_results.py` | Sauvegarde intermédiaire des résultats |
| `monitor_progress.sh` | Monitor temps réel de progression |

### Fichiers de données

| Fichier | Description |
|---------|-------------|
| `output/selenium_cache.json` | Cache des résultats Google (clé: nom société) |
| `output/selenium_progress.json` | Sauvegarde tous les 10 sociétés |
| `output/cnmv_selenium_enriched.csv` | CSV final enrichi |
| `output/selenium_scraper.log` | Logs d'exécution |

## 🎯 Stratégie d'enrichissement

### 1. Recherche Google

Pour chaque société, le scraper effectue:

```
Query: "{nom société} España gestora contacto email telefono"
```

**Extraction:**
- **Website:** Premier lien valide (excluant LinkedIn, Wikipedia, CNMV, etc.)
- **Email:** Regex pattern, préférence pour `contact@`, `info@`
- **Phone:** Pattern `+34 XXX XXX XXX`

### 2. Fallback: Query simplifiée

Si website non trouvé:
```
Query: "{nom société} España"
```

### 3. Fallback: Domain depuis email

Si toujours pas de website mais email trouvé:
```
Email: info@metagestion.com
→ Website: https://www.metagestion.com
```

### 4. Anti-détection

- User-Agent: Chrome MacOS
- Désactivation flags automation Selenium
- Délai 4 secondes entre recherches
- Acceptation automatique cookies
- Headless mode

## 📊 Taux d'enrichissement attendu

Basé sur la méthode Luxembourg:

| Champ | Taux attendu |
|-------|--------------|
| Websites | **95-99%** |
| Emails | **95-99%** |
| Phones | **60-80%** |

## 🔧 Dépendances

```bash
pip install selenium
brew install chromedriver
```

## 📈 Progression actuelle

```bash
cd scripts/cnmv && python3 -c "
import json
with open('output/selenium_cache.json') as f:
    data = json.load(f)
print(f'{len(data)}/117 sociétés enrichies')
"
```

## 🛑 Arrêter le scraper

```bash
pkill -f selenium_google_scraper.py
```

Le cache est automatiquement sauvegardé, donc vous pouvez reprendre plus tard sans perdre de données.

## ✅ Validation des résultats

Une fois terminé, vérifier:

```bash
cd scripts/cnmv
python3 save_selenium_results.py
```

Le fichier `output/cnmv_selenium_enriched.csv` contiendra:
- 117 lignes (toutes les SGIIC)
- Colonnes: name, email, phone, website, address, city, postal_code, country, type, register_number, aum, tier, etc.

## 🎯 Objectif final

**Atteindre 99% d'enrichissement** comme le Luxembourg pour pouvoir importer dans le CRM avec des données complètes.
