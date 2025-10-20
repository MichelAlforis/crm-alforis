# 🇱🇺 Guide d'enrichissement Luxembourg - 266 sociétés

## ✅ État actuel

**Fichier final:** `LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv`

- **266 sociétés** extraites du répertoire ALFI
- **37 sociétés** (13.9%) ont des AUM
- **229 sociétés** (86.1%) nécessitent enrichissement manuel

### Données disponibles par défaut:
✅ Nom de la société
✅ Ville: Luxembourg
✅ Pays: Luxembourg (LU)
✅ Catégorie (UCITS / AIFM)
✅ Tier (1/2/3)
✅ AUM pour les 37 plus grandes (BlackRock, Vanguard, etc.)

### Données à compléter:
❌ Sites web (0%)
❌ Emails (0%)
❌ Téléphones (0%)
❌ Adresses précises (0%)
❌ AUM pour 229 sociétés (86%)

---

## 📊 Méthodes d'enrichissement

### **1. Sites web + Coordonnées de base**

#### Option A - Recherche Google manuelle (rapide pour Tier 1)
```
Pour chaque société Tier 1 (37 sociétés):
1. Google: "[Nom société] Luxembourg official website"
2. Vérifier le site officiel
3. Aller sur page "Contact" ou "About"
4. Noter: website, email, phone, adresse
```

**Exemple:**
- BlackRock → https://www.blackrock.com/lu/
- Email: contactlux@blackrock.com
- Phone: +352 342 342 1
- Adresse: 35A Avenue J.F. Kennedy, L-1855 Luxembourg

#### Option B - CSSF Registry (source officielle)
```
https://supervisedentities.cssf.lu/index.html
1. Rechercher le nom de la société
2. Extraire: adresse légale, contacts officiels
```

#### Option C - ALFI Web Directory
```
https://www.alfi.lu/
1. Chercher section "Members"
2. Filtrer par "Management Companies"
3. Extraire contacts
```

---

### **2. AUM (Assets Under Management)**

#### Sources par priorité:

**Tier 1 (37 sociétés) - Déjà complétées ✓**
- AUM connus via données publiques

**Tier 2 (34 sociétés)**

Sources recommandées:
1. **Site web officiel**: section "About" / "Firm Overview"
   - Chercher "AUM", "Assets", "€XX billion"

2. **CSSF Statistics**: https://www.cssf.lu/en/statistics/
   - Publications trimestrielles par société

3. **Company filings**: Annual reports, investor presentations

4. **Financial databases**:
   - Bloomberg (si accès)
   - Reuters
   - Morningstar

**Tier 3 (195 sociétés)**
- AUM souvent non publiques (boutiques, family offices)
- Enrichissement optionnel selon priorité commerciale

---

### **3. Contacts Sales Directors**

#### LinkedIn Sales Navigator (manuel recommandé)
```
Pour chaque société prioritaire:
1. LinkedIn → Sales Navigator
2. Recherche: "[Company name]" + "Luxembourg"
3. Filtres:
   - Title: "Head of Sales", "Sales Director", "Business Development"
   - Location: Luxembourg
   - Current company
4. Extraire: Nom, Titre, Email (pattern: prenom.nom@company.com)
```

#### Hunter.io (avec API key)
```bash
# Si clé API disponible
curl "https://api.hunter.io/v2/domain-search?domain=blackrock.com&api_key=YOUR_KEY"
```

#### Sites web - Pages équipe
```
Aller sur: [website]/about/team ou /contact
Chercher: Sales, Distribution, Client Relations
```

---

## 🎯 Plan d'action recommandé

### Phase 1 - Tier 1 (37 sociétés) - PRIORITÉ HAUTE
**Objectif:** 100% enrichissement
**Temps estimé:** 2-3h

1. ✅ AUM → Déjà complétés
2. ⏳ Sites web → Recherche Google manuelle (5 min/société)
3. ⏳ Emails + Phones → Via sites web (inclus ci-dessus)
4. ⏳ Contacts Sales → LinkedIn Sales Navigator (10 min/société)

**Livrable:** 37 sociétés 100% complètes

---

### Phase 2 - Tier 2 (34 sociétés) - PRIORITÉ MOYENNE
**Objectif:** 80% enrichissement
**Temps estimé:** 2h

1. ⏳ Sites web → Google (3 min/société)
2. ⏳ AUM → Sites web + CSSF stats
3. ⏳ Contacts → LinkedIn (si AUM > 100Bn€)

**Livrable:** 34 sociétés avec données principales

---

### Phase 3 - Tier 3 (195 sociétés) - PRIORITÉ BASSE
**Objectif:** Données minimales
**Temps estimé:** Variable

1. ⏳ Sites web → Batch Google search
2. ⏳ Emails génériques → Pattern: info@[domain].com
3. ⏳ AUM → Optionnel (si disponible publiquement)

**Livrable:** 195 sociétés avec minimum viable

---

## 🛠️ Outils disponibles

### Scripts Python créés:

1. **enrich_companies_web.py** (nécessite ajustements pour contourner blocages)
2. **enrich_aum.py** ✅ Utilisé - 37 AUM ajoutés
3. **cssf_import.py** - Import final dans CRM

### APIs externes (optionnelles):

- **Hunter.io**: Emails
  - Free tier: 25 requests/mois
  - Paid: 100€/mois pour 1000 searches

- **Clearbit**: Company data enrichment
  - Free trial disponible

- **LinkedIn API**: Contacts (via Sales Navigator)
  - Accès manuel uniquement (API fermée)

---

## 📝 Template d'enrichissement manuel

### Format CSV attendu:

```csv
name,email,phone,website,address,city,country,country_code,category,type,notes,aum,aum_date,tier,pipeline_stage,priority,aum_source
BlackRock,contactlux@blackrock.com,+352 342342 1,https://blackrock.com/lu,"35A Avenue JF Kennedy, L-1855",Luxembourg,Luxembourg,LU,Luxembourg UCITS Management Company,Société de gestion,Extracted from ALFI member directory,10000000,2024-12-31,Tier 1,Prospect,High,Public data
```

### Checklist par société:

```markdown
- [ ] Website trouvé
- [ ] Email contact général
- [ ] Téléphone Luxembourg
- [ ] Adresse complète
- [ ] AUM (si disponible)
- [ ] Date AUM
- [ ] Source AUM
- [ ] Contact Sales (optionnel)
```

---

## 📊 Tracking progression

Utiliser Google Sheets ou Excel:

| Société | Tier | Website | Email | Phone | Address | AUM | Sales Contact | Status |
|---------|------|---------|-------|-------|---------|-----|---------------|--------|
| BlackRock | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ⏳ | 85% |
| Amundi | 1 | ✓ | ✓ | ⏳ | ⏳ | ✓ | ⏳ | 60% |

---

## 🚀 Import dans CRM

Une fois enrichissement terminé:

```bash
# Vérifier le fichier
head -5 LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv

# Dry-run (test sans modification DB)
python3 scripts/cssf/cssf_import.py \
  --input LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv \
  --dry-run

# Import réel
python3 scripts/cssf/cssf_import.py \
  --input LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv
```

---

## 📞 Besoin d'aide?

Sources officielles:
- **CSSF**: https://www.cssf.lu/en/supervision/supervised-entities/
- **ALFI**: https://www.alfi.lu/
- **Luxembourg for Finance**: https://www.luxembourgforfinance.com/

Questions techniques:
- Modifier scripts Python si needed
- API integrations
- Data validation
