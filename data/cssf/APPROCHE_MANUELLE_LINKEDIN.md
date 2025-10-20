# Extraction Contacts Luxembourg - Approche Manuelle

## Pourquoi manuel ?

Le scraping automatique LinkedIn est bloqué par leurs protections anti-bot.

## Méthode recommandée (CNMV-style)

### Option 1: Sales Navigator LinkedIn (Payant mais efficace)

**Recherche type:**
```
Head of Sales OR Sales Director OR Business Development
AND (BlackRock OR Amundi OR DWS OR "J.P. Morgan")
AND Luxembourg
```

**Avantages:**
- Pas de blocage
- Données vérifiées
- Exports CSV directs
- Filtres avancés

### Option 2: Recherche manuelle ciblée

Pour chaque société TOP 5, chercher sur LinkedIn:

**1. BlackRock Luxembourg (9,500 Mds€)**
- Recherche: `BlackRock Luxembourg Sales Director`
- Site: www.blackrock.com/lu → équipe commerciale

**2. Vanguard Luxembourg (8,500 Mds€)**
- Recherche: `Vanguard Luxembourg Head of Sales`
- Site: www.vanguard.com

**3. State Street Luxembourg (4,200 Mds€)**
- Recherche: `State Street Luxembourg Client Director`

**4. J.P. Morgan Luxembourg (2,800 Mds€)**
- Recherche: `JPMorgan Asset Management Luxembourg Sales`

**5. Capital Group Luxembourg (2,600 Mds€)**
- Recherche: `Capital Group Luxembourg Business Development`

### Option 3: Hunter.io pour emails

Une fois les noms trouvés manuellement:

```bash
# Exemple
curl "https://api.hunter.io/v2/email-finder?domain=blackrock.com&first_name=John&last_name=Doe&api_key=YOUR_KEY"
```

## Workflow recommandé

1. **TOP 5 sociétés manuellement** (2-3 contacts par société = 10-15 contacts)
2. **Import dans CRM** via CSV
3. **Qualification** et priorisation
4. **Actions commerciales** ciblées

## Template CSV pour import manuel

```csv
first_name,last_name,email,job_title,company_name,company_tier,linkedin_url
John,Doe,john.doe@blackrock.com,Head of Sales EMEA,BlackRock Luxembourg,Tier 1,https://linkedin.com/in/johndoe
Jane,Smith,jane.smith@vanguard.com,Sales Director,Vanguard Luxembourg,Tier 1,https://linkedin.com/in/janesmith
```

## Qualité > Quantité

**Mieux vaut:**
- 10 contacts qualifiés et vérifiés
- Avec email direct et LinkedIn
- Des TOP 5 sociétés

**Plutôt que:**
- 100 contacts automatiques bloqués
- Sans vérification
- Données incomplètes

---

**Note:** C'est exactement comme pour CNMV Espagne - l'approche manuelle + Hunter.io est la plus efficace pour ce type de prospection B2B haut de gamme.
