# Guide du Système de Campagnes Email

## Vue d'ensemble

Le système de campagnes email vous permet de :
- ✅ Créer des templates d'emails personnalisables avec des variables dynamiques
- ✅ Sélectionner des destinataires avec des filtres avancés (langue, pays, catégorie)
- ✅ Prévisualiser tous les emails avant l'envoi avec pagination
- ✅ Envoyer par lots (batches) de 600 emails avec délais configurables
- ✅ Suivre les performances (taux d'ouverture, de clic, échecs)

---

## 🎨 1. Créer un Template d'Email

### Navigation
1. Allez dans **Dashboard → Templates d'Email**
2. Cliquez sur **"Nouveau Template"**

### Création du template

```html
Nom: Newsletter Janvier 2025
Sujet: Bonjour {{first_name}}, découvrez nos nouveautés !

Corps HTML:
<p>Bonjour {{first_name}} {{last_name}},</p>

<p>Nous sommes ravis de vous présenter nos dernières actualités.</p>

<p>Votre organisation {{organisation_name}} fait partie de nos partenaires privilégiés.</p>

<p>Cordialement,<br>
L'équipe Alforis Finance</p>
```

### Variables disponibles

#### Pour les CONTACTS (personnes) :
- `{{first_name}}` - Prénom
- `{{last_name}}` - Nom
- `{{full_name}}` - Nom complet
- `{{email}}` - Email
- `{{language}}` - Langue (FR, EN, etc.)
- `{{organisation_name}}` - Nom de l'organisation
- `{{organisation_country}}` - Pays de l'organisation
- `{{organisation_category}}` - Catégorie de l'organisation

#### Pour les ORGANISATIONS :
- `{{organisation_name}}` - Nom
- `{{organisation_email}}` - Email
- `{{organisation_country}}` - Pays
- `{{organisation_city}}` - Ville
- `{{organisation_category}}` - Catégorie

> 💡 **Astuce** : Les variables sont automatiquement détectées et affichées sous le formulaire !

---

## 📧 2. Créer une Campagne Email

### Étape 1 : Informations de base

1. Allez dans **Dashboard → Campagnes Email**
2. Cliquez sur **"Nouvelle Campagne"**
3. Remplissez :
   - **Nom** : Ex. "Newsletter Q1 2025"
   - **Description** : Courte description de la campagne
   - **Template** : Sélectionnez le template à utiliser

### Étape 2 : Sélection des destinataires

#### Type de destinataires

**Option A : Organisations**
- Envoie à l'email principal de chaque organisation
- Idéal pour : Communications officielles, partenariats

**Option B : Contacts Principaux**
- Envoie au contact principal de chaque organisation
- Idéal pour : Communications personnalisées, newsletters

#### Filtres disponibles

1. **Langues** (uniquement pour contacts)
   - Sélectionnez une ou plusieurs langues
   - Ex: FR, EN, DE
   - Si vide = toutes les langues

2. **Pays**
   - Sélectionnez un ou plusieurs pays
   - Ex: France, Luxembourg, Belgique
   - Si vide = tous les pays

3. **Catégories d'organisations**
   - Banque, Asset Manager, Assurance, etc.
   - Si vide = toutes les catégories

#### Exemple de sélection

```
Type: Contacts Principaux
Langues: FR, EN
Pays: France, Luxembourg
Catégories: BANK, ASSET_MANAGER

→ Résultat : 1,247 destinataires trouvés
```

### Étape 3 : Configuration d'envoi

**Taille des lots (Batch Size)**
- Recommandé : **600 emails**
- Min: 1, Max: 1000
- Définit combien d'emails sont envoyés dans chaque lot

**Délai entre les lots**
- Recommandé : **60 secondes**
- Permet d'éviter les limitations des providers d'email
- Exemple : Pour 1,200 destinataires avec batch de 600 et délai de 60s
  - Lot 1 : 600 emails (immédiat)
  - Lot 2 : 600 emails (après 60s)
  - Durée totale : ~1 minute

---

## 👀 3. Prévisualiser les Emails

Avant d'envoyer, vous DEVEZ prévisualiser !

### Dans la page de détail de la campagne

1. Cliquez sur **"Prévisualiser"**
2. Naviguez entre les emails avec les flèches ← →
3. Vérifiez :
   - ✅ Le sujet est correct
   - ✅ Les variables sont bien remplacées
   - ✅ Le formatage HTML est correct
   - ✅ Les informations des destinataires sont exactes

### Pagination

- **10 emails par page**
- Naviguez entre les pages pour voir différents destinataires
- Vérifiez plusieurs emails pour vous assurer de la personnalisation

---

## 🚀 4. Envoyer la Campagne

### Processus en 3 étapes

#### 1. Préparer la campagne
```
Cliquez sur "Préparer"
→ Génère tous les emails personnalisés
→ Les range en batches
→ Statut: DRAFT → SCHEDULED
```

#### 2. Vérifier la préparation
```
Nombre d'emails préparés : 1,247
Nombre de lots : 3
Durée estimée : ~2 minutes
```

#### 3. Démarrer l'envoi
```
Cliquez sur "Démarrer"
→ Commence l'envoi par lots
→ Statut: SCHEDULED → SENDING
→ Puis COMPLETED quand terminé
```

---

## 📊 5. Suivre les Performances

### Statistiques en temps réel

**Métriques principales :**
- **Destinataires** : Nombre total
- **Envoyés** : Nombre d'emails envoyés avec succès
- **Taux d'ouverture** : % d'emails ouverts
- **Taux de clic** : % d'emails avec clics
- **Échecs** : Nombre d'échecs d'envoi

### Exemple de résultats

```
Campagne: Newsletter Q1 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Destinataires:     1,200
Envoyés:           1,195 (99.6%)
Ouverts:             478 (40.0%)
Cliqués:             143 (12.0%)
Échecs:                5 (0.4%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚙️ 6. Configuration Technique

### Variables d'environnement (Backend)

```bash
# Provider d'email (à configurer)
SENDGRID_API_KEY=your_api_key
# ou
AWS_SES_KEY=your_key
AWS_SES_SECRET=your_secret
```

### Activation de Celery (optionnel)

Pour l'envoi asynchrone en arrière-plan :

```bash
# Redis pour Celery
REDIS_URL=redis://redis:6379/0

# Démarrer le worker Celery
celery -A tasks.email_sending worker --loglevel=info
```

> ⚠️ **Note** : Sans Celery, l'envoi se fait de manière synchrone (plus lent mais fonctionnel)

---

## 🎯 7. Bonnes Pratiques

### ✅ DO

1. **Toujours prévisualiser** avant d'envoyer
2. **Tester avec un petit groupe** d'abord
3. **Vérifier les variables** dans le template
4. **Respecter les délais** entre lots (60s minimum)
5. **Monitorer les statistiques** après l'envoi
6. **Nettoyer les emails invalides** régulièrement

### ❌ DON'T

1. ❌ N'envoyez pas sans prévisualiser
2. ❌ Ne dépassez pas 1000 emails par lot
3. ❌ N'envoyez pas trop rapidement (risque de blacklist)
4. ❌ N'utilisez pas de variables inexistantes
5. ❌ Ne spammez pas (respectez les lois RGPD)

---

## 🔧 8. Troubleshooting

### Problème : "Aucun destinataire trouvé"

**Causes possibles :**
- Filtres trop restrictifs
- Aucune organisation/contact ne correspond
- Emails manquants dans la base de données

**Solutions :**
1. Élargissez les filtres
2. Vérifiez vos données dans la base
3. Assurez-vous que les contacts ont des emails

### Problème : "Emails en échec"

**Causes possibles :**
- Email invalide
- Serveur de destination rejette
- Provider d'email indisponible

**Solutions :**
1. Vérifiez les adresses email
2. Consultez l'onglet "Envois" pour les détails
3. Vérifiez la configuration du provider

### Problème : "Taux d'ouverture très bas"

**Causes possibles :**
- Sujet pas attractif
- Email considéré comme spam
- Envoi à une mauvaise audience

**Solutions :**
1. Améliorez le sujet (A/B testing)
2. Vérifiez la réputation de votre domaine
3. Segmentez mieux votre audience

---

## 📝 9. Exemples de Templates

### Template 1 : Newsletter Professionnelle

```html
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
  <h1 style="color: #2563eb;">Bonjour {{first_name}},</h1>

  <p>Nous sommes ravis de partager avec vous nos dernières actualités.</p>

  <h2>📊 Nos dernières analyses</h2>
  <p>Découvrez notre étude sur les tendances du marché...</p>

  <a href="https://votresite.com" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
    En savoir plus
  </a>

  <p>Cordialement,<br>
  L'équipe {{organisation_name}}</p>
</div>
```

### Template 2 : Invitation Événement

```html
<p>Bonjour {{first_name}},</p>

<p>{{organisation_name}} organise un événement exclusif le 15 mars 2025.</p>

<p><strong>Au programme :</strong></p>
<ul>
  <li>Keynote sur les nouvelles régulations</li>
  <li>Table ronde avec des experts</li>
  <li>Networking avec vos pairs</li>
</ul>

<p><a href="https://event.com/register">S'inscrire maintenant</a></p>

<p>À bientôt,<br>L'équipe Événements</p>
```

---

## 🎓 10. FAQ

**Q: Puis-je modifier une campagne après l'avoir démarrée ?**
R: Non, une fois démarrée, vous pouvez uniquement la mettre en pause.

**Q: Combien de temps prend l'envoi de 1000 emails ?**
R: Avec un batch de 600 et un délai de 60s : ~2 minutes.

**Q: Les variables fonctionnent-elles dans le sujet ?**
R: Oui ! Exemple : "Bonjour {{first_name}}, voici votre newsletter"

**Q: Puis-je envoyer à des personnes spécifiques ?**
R: Oui, utilisez le champ `specific_ids` dans les filtres (fonctionnalité avancée).

**Q: Comment savoir si un email a été ouvert ?**
R: Le tracking est géré par votre provider d'email (SendGrid, AWS SES, etc.).

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@alforis.com
- 📖 Documentation API : [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- 🐛 Issues : GitHub Issues

---

**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2025
