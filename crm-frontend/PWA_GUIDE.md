# 📱 Guide PWA - TPM Finance CRM

Votre application CRM est maintenant une **Progressive Web App (PWA)** complète !

## ✨ Fonctionnalités PWA

### 🚀 Installation sur mobile et desktop
- **iOS/Safari** : Bouton "Partager" → "Sur l'écran d'accueil"
- **Android/Chrome** : Prompt d'installation automatique ou Menu → "Installer l'application"
- **Desktop/Chrome** : Icône d'installation dans la barre d'adresse

### 📡 Mode hors ligne
- Cache automatique des pages visitées
- Cache des assets statiques (images, CSS, JS)
- Cache intelligent de l'API (5 minutes)
- Indicateur de statut en ligne/hors ligne
- Synchronisation automatique au retour en ligne

### ⚡ Performance optimisée
- **Cache des polices** : Google Fonts mise en cache (365 jours)
- **Cache des images** : Stratégie StaleWhileRevalidate (24h)
- **Cache des données API** : NetworkFirst avec fallback (5 min)
- **Cache des assets** : CSS, JS optimisés (24h)

### 🎯 Raccourcis rapides
Une fois installée, l'app propose des raccourcis vers :
- 📊 Tableau de bord
- 👥 Contacts
- 🏢 Organisations

## 🛠️ Configuration technique

### Fichiers clés

#### [`next.config.js`](next.config.js)
Configuration PWA avec stratégies de cache :
```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // ... stratégies de cache
});
```

#### [`public/manifest.json`](public/manifest.json)
Métadonnées de l'application :
- Nom, description, icônes
- Couleurs de thème
- Mode d'affichage (standalone)
- Raccourcis d'application

#### Composants PWA

##### [`components/pwa/InstallPrompt.tsx`](components/pwa/InstallPrompt.tsx)
- Détecte si l'app peut être installée
- Affiche un prompt élégant après 30s
- Support iOS avec instructions spécifiques
- Mémorisation du refus utilisateur

##### [`components/pwa/OfflineIndicator.tsx`](components/pwa/OfflineIndicator.tsx)
- Détecte le statut en ligne/hors ligne
- Affiche un indicateur discret
- Messages de reconnexion

##### [`hooks/useOnlineStatus.ts`](hooks/useOnlineStatus.ts)
- Hook React pour détecter le statut réseau
- Écoute les événements `online` et `offline`

## 📦 Stratégies de cache

### 1. **CacheFirst** (Priorité au cache)
Utilisé pour : Polices, audio, vidéo
```
Cache → Si absent → Réseau → Met en cache
```

### 2. **StaleWhileRevalidate** (Rapide + Frais)
Utilisé pour : Images, CSS, JS, données Next.js
```
Cache immédiatement → Rafraîchit en arrière-plan
```

### 3. **NetworkFirst** (Priorité au réseau)
Utilisé pour : API calls
```
Réseau (10s timeout) → Si échec → Cache
```

## 🔧 Commandes de développement

### Build de production
```bash
npm run build
```
Génère automatiquement :
- `public/sw.js` - Service Worker
- Cache manifest

### Développement local
```bash
npm run dev
```
⚠️ **PWA désactivée en dev** pour faciliter le développement

### Test de la PWA
```bash
npm run build && npm start
```
Puis ouvrir http://localhost:3010

## 📱 Comment tester l'installation

### Sur mobile (iOS/Safari)

1. Ouvrir l'app dans Safari
2. Cliquer sur le bouton "Partager" (carré avec flèche vers le haut)
3. Scroller et sélectionner "Sur l'écran d'accueil"
4. Confirmer

**Résultat** : Icône TPM CRM sur l'écran d'accueil

### Sur mobile (Android/Chrome)

1. Ouvrir l'app dans Chrome
2. Attendre le prompt d'installation (30s) OU
3. Menu (⋮) → "Installer l'application"

**Résultat** : App installée comme une app native

### Sur desktop (Chrome/Edge)

1. Ouvrir l'app
2. Icône d'installation dans la barre d'adresse (➕)
3. Cliquer → "Installer"

**Résultat** : App standalone dans le dock/barre des tâches

## 🧪 Vérification PWA

### Chrome DevTools

1. Ouvrir DevTools (F12)
2. Onglet "Application"
3. Sections à vérifier :
   - **Manifest** : Vérifier les icônes et métadonnées
   - **Service Workers** : Vérifier l'état "activated"
   - **Cache Storage** : Voir les caches créés
   - **Offline** : Tester le mode hors ligne

### Lighthouse Audit

1. DevTools → Lighthouse
2. Catégories : PWA
3. "Generate report"

**Score attendu** : 90-100/100

### Test mode hors ligne

1. DevTools → Network tab
2. Throttling → "Offline"
3. Rafraîchir la page
4. ✅ L'app doit fonctionner

## 🎨 Personnalisation

### Changer les couleurs du thème

**Fichier** : [`public/manifest.json`](public/manifest.json)

```json
{
  "theme_color": "#E39F70",
  "background_color": "#FEFBF7"
}
```

### Modifier les raccourcis

**Fichier** : [`public/manifest.json`](public/manifest.json)

```json
{
  "shortcuts": [
    {
      "name": "Mon raccourci",
      "url": "/dashboard/ma-page",
      "icons": [...]
    }
  ]
}
```

### Ajuster le cache

**Fichier** : [`next.config.js`](next.config.js)

Modifier `maxAgeSeconds` pour chaque type de ressource.

## 📊 Métriques et monitoring

### Service Worker stats

```javascript
// Dans la console du navigateur
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('SW actifs:', regs.length);
  regs.forEach(reg => console.log('Scope:', reg.scope));
});
```

### Cache size

```javascript
// Taille totale du cache
caches.keys().then(names => {
  names.forEach(async name => {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    console.log(`${name}: ${keys.length} entrées`);
  });
});
```

## 🚨 Dépannage

### L'app ne s'installe pas

1. ✅ Vérifier HTTPS (requis en production)
2. ✅ Vérifier le manifest.json (DevTools → Application)
3. ✅ Build de production (PWA désactivée en dev)

### Le service worker ne s'active pas

1. Vérifier les erreurs dans DevTools → Console
2. Désinscrire les anciens SW :
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```
3. Clear cache et rafraîchir

### Les données ne se mettent pas à jour

1. Le cache API est configuré à 5 minutes
2. Forcer un refresh : Ctrl+Shift+R
3. Ou modifier `maxAgeSeconds` dans next.config.js

## 📖 Ressources

- [Next PWA Documentation](https://ducanh2912.github.io/next-pwa/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 🎉 Prochaines étapes

### Phase 2 : Fonctionnalités avancées (optionnel)

- [ ] **Push notifications** : Notifications natives
- [ ] **Background sync** : Synchronisation en arrière-plan
- [ ] **Share API** : Partage natif de contenu
- [ ] **Badging API** : Badges sur l'icône d'app

### Phase 3 : Capacitor (optionnel)

Si vous avez besoin d'accès à :
- 📷 Caméra native
- 📍 Géolocalisation précise
- 📁 Système de fichiers
- 🔔 Notifications push natives avancées

→ Migration vers Capacitor recommandée

---

**Votre app est maintenant installable et fonctionne hors ligne !** 🚀
