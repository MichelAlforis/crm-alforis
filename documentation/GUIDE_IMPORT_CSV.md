# Guide d'Import CSV - CRM Alforis

## 📋 Vue d'ensemble

Le CRM Alforis offre trois modes d'import CSV pour intégrer vos données :

1. **Import Unifié** ⭐ (Recommandé)
2. Import Organisations seules
3. Import Personnes seules

## 🎯 Mode Import Unifié (Recommandé)

### Pourquoi utiliser l'import unifié ?

- ✅ Import simultané des organisations et de leurs contacts
- ✅ Création automatique des liens entre organisations et personnes
- ✅ Process simplifié en une seule étape
- ✅ Gain de temps considérable
- ✅ Cohérence des données garantie

### Comment utiliser l'import unifié ?

#### Étape 1 : Préparer vos fichiers CSV

Vous aurez besoin de **2 fichiers CSV** :

**1. Fichier Organisations (`organisations.csv`)**

Colonnes requises :
- `name` * (obligatoire) - Nom de l'organisation
- `email` - Email principal de l'organisation
- `phone` - Numéro de téléphone
- `address` - Adresse complète
- `city` - Ville
- `country` - Code pays (ISO 2 lettres : FR, US, DE, etc.)

**Exemple :**
```csv
name,email,phone,address,city,country
Acme Corporation,contact@acme.com,+33123456789,"123 rue de la Paix",Paris,FR
TechStart SAS,info@techstart.fr,+33987654321,"45 avenue des Champs",Lyon,FR
```

**2. Fichier Personnes (`people.csv`)**

Colonnes requises :
- `first name` * (obligatoire) - Prénom
- `last name` * (obligatoire) - Nom de famille
- `personal email` - Email personnel
- `email` - Email professionnel
- `personal phone` - Téléphone personnel
- `phone` - Téléphone professionnel
- `country code` - Code pays
- `language` - Langue (fr, en, de, es, etc.)
- `organisation` - **Nom exact de l'organisation** (pour créer le lien)

**Exemple :**
```csv
first name,last name,personal email,email,personal phone,phone,country code,language,organisation
Jean,Dupont,jean.dupont@gmail.com,jean.dupont@acme.com,+33612345678,+33123456789,FR,fr,Acme Corporation
Marie,Martin,marie.m@gmail.com,marie.martin@techstart.fr,+33698765432,+33987654321,FR,fr,TechStart SAS
```

#### Étape 2 : Importer dans le CRM

1. Accédez à **Paramètres > Imports**
2. Sélectionnez l'onglet **"Import Unifié"**
3. Téléchargez le template vierge si nécessaire
4. Glissez-déposez ou sélectionnez votre fichier **Organisations**
5. Glissez-déposez ou sélectionnez votre fichier **Personnes**
6. Choisissez le **type d'organisation** (Client, Fournisseur, etc.)
7. Cliquez sur **"Lancer l'import"**

#### Étape 3 : Vérifier les résultats

Le système affichera :
- ✅ Nombre d'organisations créées
- ✅ Nombre de personnes créées
- ✅ Nombre de liens créés
- ❌ Erreurs détaillées (le cas échéant)

### 🔗 Liaison automatique

Pour que les personnes soient automatiquement liées aux organisations :

1. Le nom dans la colonne `organisation` du fichier Personnes doit **correspondre exactement** au nom dans la colonne `name` du fichier Organisations
2. Sensible à la casse : "Acme Corporation" ≠ "acme corporation"
3. Les espaces comptent : "TechStart" ≠ "Tech Start"

**✅ Bon exemple :**
- Organisations.csv : `name` = "Acme Corporation"
- People.csv : `organisation` = "Acme Corporation"

**❌ Mauvais exemple :**
- Organisations.csv : `name` = "Acme Corporation"
- People.csv : `organisation` = "acme corp"

## 📦 Import Organisations seules

Utilisez ce mode si vous voulez uniquement importer des organisations sans contacts.

### Format CSV

```csv
name,email,phone,address,city,country
```

### Colonnes

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| name | ✅ Oui | Nom de l'organisation | "Acme Corporation" |
| email | Non | Email principal | "contact@acme.com" |
| phone | Non | Téléphone | "+33123456789" |
| address | Non | Adresse complète | "123 rue de la Paix" |
| city | Non | Ville | "Paris" |
| country | Non | Code pays ISO | "FR" |

## 👥 Import Personnes seules

Utilisez ce mode si vous voulez uniquement importer des contacts sans organisations.

### Format CSV

```csv
first name,last name,personal email,email,personal phone,phone,country code,language,organisation
```

### Colonnes

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| first name | ✅ Oui | Prénom | "Jean" |
| last name | ✅ Oui | Nom | "Dupont" |
| personal email | Non | Email personnel | "jean.dupont@gmail.com" |
| email | Non | Email professionnel | "jean.dupont@acme.com" |
| personal phone | Non | Tél. personnel | "+33612345678" |
| phone | Non | Tél. professionnel | "+33123456789" |
| country code | Non | Code pays | "FR" |
| language | Non | Langue | "fr" |
| organisation | Non | Nom de l'organisation | "Acme Corporation" |

## 💡 Bonnes pratiques

### Formatage des données

1. **Encodage** : UTF-8 (pour les caractères accentués)
2. **Séparateur** : Virgule (,)
3. **Guillemets** : Utilisez des guillemets pour les valeurs contenant des virgules
   - ✅ `"123, rue de la Paix"`
   - ❌ `123, rue de la Paix`

### Téléphones

- Format international recommandé : `+33123456789`
- Accepte aussi : `01 23 45 67 89` ou `01-23-45-67-89`

### Emails

- Format valide requis : `nom@domaine.com`
- Un seul email par champ

### Codes pays

Utilisez les codes ISO 3166-1 alpha-2 :
- France : `FR`
- États-Unis : `US`
- Allemagne : `DE`
- Royaume-Uni : `GB`
- Espagne : `ES`

### Langues

Codes ISO 639-1 :
- Français : `fr`
- Anglais : `en`
- Allemand : `de`
- Espagnol : `es`

## 🚨 Gestion des erreurs

### Erreurs courantes

1. **"Colonnes manquantes"**
   - Vérifiez que toutes les colonnes obligatoires sont présentes
   - Vérifiez l'orthographe exacte des en-têtes

2. **"Ligne X : name is required"**
   - La colonne `name` est vide pour une organisation
   - Ajoutez un nom ou supprimez la ligne vide

3. **"Ligne X : Invalid email format"**
   - Format d'email incorrect
   - Corrigez l'email ou laissez le champ vide

4. **"Organisation not found"**
   - Le nom dans la colonne `organisation` ne correspond à aucune organisation
   - Vérifiez l'orthographe exacte

### Import partiel

Si certaines lignes échouent :
- ✅ Les lignes valides sont importées
- ❌ Les lignes invalides sont listées avec les erreurs
- 📊 Un rapport détaillé est affiché

## 📥 Templates disponibles

Téléchargez les templates vierges depuis l'interface :

1. **Template Organisations vierge** : `/templates/import_organisations.csv`
2. **Template Personnes vierge** : `/templates/import_people.csv`
3. **Exemple complet Organisations** : `/templates/import_unified_organisations.csv`
4. **Exemple complet Personnes** : `/templates/import_unified_people.csv`

## 🎓 Exemple complet

### Fichier : organisations.csv

```csv
name,email,phone,address,city,country
Acme Corporation,contact@acme.com,+33123456789,"123 rue de la Paix",Paris,FR
TechStart SAS,info@techstart.fr,+33987654321,"45 avenue des Champs",Lyon,FR
Global Solutions,hello@globalsol.com,+14155551234,"100 Market Street",San Francisco,US
```

### Fichier : people.csv

```csv
first name,last name,personal email,email,personal phone,phone,country code,language,organisation
Jean,Dupont,jean.dupont@gmail.com,jean.dupont@acme.com,+33612345678,+33123456789,FR,fr,Acme Corporation
Marie,Martin,marie.m@gmail.com,marie.martin@techstart.fr,+33698765432,+33987654321,FR,fr,TechStart SAS
John,Smith,john.smith@gmail.com,john.smith@globalsol.com,+14155559876,+14155551234,US,en,Global Solutions
Sophie,Bernard,sophie.b@yahoo.fr,sophie.bernard@acme.com,+33687654321,+33123456789,FR,fr,Acme Corporation
```

### Résultat attendu

- ✅ 3 organisations créées
- ✅ 4 personnes créées
- ✅ 4 liens créés (Jean → Acme, Marie → TechStart, John → Global, Sophie → Acme)

## 🔧 Résolution de problèmes

### Le fichier ne se charge pas

- Vérifiez l'encodage (doit être UTF-8)
- Vérifiez qu'il y a bien une ligne d'en-tête
- Vérifiez que le fichier n'est pas corrompu

### Les caractères accentués sont mal affichés

- Enregistrez votre CSV en UTF-8
- Sous Excel : "Enregistrer sous" → Choisir "CSV UTF-8"

### Les liens ne se créent pas

- Vérifiez que les noms d'organisations correspondent exactement
- Vérifiez qu'il n'y a pas d'espaces en début/fin de nom
- Vérifiez la casse (majuscules/minuscules)

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@alforis.fr
- 📚 Documentation : [docs.alforis.fr](https://docs.alforis.fr)
- 💬 Chat : Disponible dans l'application

---

**Dernière mise à jour** : Janvier 2025
**Version** : 1.0
