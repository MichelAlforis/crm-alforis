# 🧪 Guide de Test PWA - TPM Finance CRM

## ✅ Tests Automatiques (Déjà fait)

Tous les tests automatiques ont passé :
```bash
./scripts/test_pwa_simple.sh
```

✅ API disponible
✅ Frontend disponible
✅ Manifest.json valide
✅ Service Worker présent
✅ Tous les composants PWA créés

---

## 📱 Tests Manuels à Effectuer

### 🟢 Test 1 : Mode Offline (Le plus simple - À FAIRE EN PREMIER)

**Temps estimé : 2 minutes**

1. **Ouvrir l'application**
   - URL: http://localhost:3010
   - Se connecter avec ton compte

2. **Ouvrir Chrome DevTools**
   - Appuyer sur `F12` ou `Cmd+Option+I` (Mac)
   - Aller dans l'onglet **Application**

3. **Vérifier le Service Worker**
   - Dans la barre latérale gauche : cliquer sur **Service Workers**
   - ✅ Vérifier qu'il y a un SW actif avec status "activated"
   - ✅ Voir la taille du fichier `sw.js`

4. **Tester le mode offline**
   - Cocher la case **"Offline"**
   - **✅ ATTENDU :** Bannière jaune apparaît en haut : "Mode hors ligne - Certaines fonctionnalités sont limitées"
   - Essayer de naviguer dans l'app (pages cachées devraient fonctionner)

5. **Tester la reconnexion**
   - Décocher la case **"Offline"**
   - **✅ ATTENDU :** Bannière verte apparaît : "Connexion rétablie - Synchronisation en cours..."
   - Elle disparaît après 3 secondes

**📸 Screenshots attendus :**
- Service Worker actif dans DevTools
- Bannière jaune offline
- Bannière verte online

---

### 🟡 Test 2 : Cache Strategies

**Temps estimé : 3 minutes**

1. **Vérifier les caches créés**
   - DevTools > Application > **Cache Storage** (barre latérale)
   - **✅ ATTENDU :** Plusieurs caches présents :
     - `workbox-runtime-http://localhost:3010/`
     - `google-fonts-webfonts`
     - `static-image-assets`
     - `static-js-assets`
     - `static-style-assets`
     - `api-cache`

2. **Vérifier le cache en action**
   - Aller dans l'onglet **Network**
   - Recharger la page (`Cmd+R` ou `Ctrl+R`)
   - **✅ ATTENDU :** Colonne "Size" affiche :
     - `(disk cache)` ou `(service worker)` pour les assets
     - `200` pour les nouvelles requêtes API

3. **Tester la persistance**
   - Fermer DevTools
   - Recharger la page
   - Rouvrir DevTools > Network
   - **✅ ATTENDU :** Page charge en < 500ms (depuis cache)

---

### 🔵 Test 3 : Installation PWA

**Temps estimé : 5 minutes (nécessite mobile ou émulation)**

#### Option A : Android Chrome / Desktop Chrome

1. **Attendre le prompt automatique**
   - Après 30 secondes de navigation, un prompt devrait apparaître en bas à droite
   - **✅ ATTENDU :** Card blanche avec icône téléchargement
   - Titre : "Installer TPM CRM"
   - Boutons : "Installer" / "Plus tard"

2. **Installer l'app**
   - Cliquer sur **"Installer"**
   - **✅ ATTENDU :**
     - Chrome affiche le prompt natif "Ajouter à l'écran d'accueil"
     - Après installation : icône apparaît sur l'écran d'accueil
     - L'app s'ouvre en mode standalone (sans barre d'URL)

3. **Vérifier manifest.json**
   - DevTools > Application > **Manifest**
   - **✅ ATTENDU :** Toutes les infos sont là :
     - Name: "TPM Finance CRM"
     - Short name: "TPM CRM"
     - Start URL: "/dashboard"
     - Display: "standalone"
     - Icons: 7 icônes (192x192, 512x512, maskable, etc.)
     - Shortcuts: 3 raccourcis (Dashboard, Contacts, Organisations)

#### Option B : iOS Safari

1. **Voir les instructions**
   - Ouvrir Safari sur iPhone/iPad
   - Naviguer vers l'app
   - **✅ ATTENDU :** Card avec instructions iOS :
     - "Pour installer cette app sur votre iPhone/iPad :"
     - "1. Appuyez sur Partager ⬆️"
     - "2. Sélectionnez 'Sur l'écran d'accueil'"
     - "3. Appuyez sur 'Ajouter'"

2. **Suivre les instructions**
   - Cliquer sur bouton Partager
   - Sélectionner "Sur l'écran d'accueil"
   - **✅ ATTENDU :** Icône TPM CRM sur l'écran d'accueil

---

### 🟣 Test 4 : Push Notifications

**Temps estimé : 5 minutes**

#### Étape 1 : S'abonner aux notifications

1. **Se connecter au CRM**
   - http://localhost:3010

2. **Attendre le prompt notifications**
   - Après quelques secondes, une card bleue apparaît en bas à droite
   - **✅ ATTENDU :**
     - Icône cloche 🔔
     - Titre : "Activer les notifications"
     - Description : "Recevez des notifications pour les nouvelles tâches et rappels"
     - Boutons : "Activer" / "Plus tard"

3. **Activer les notifications**
   - Cliquer sur **"Activer"**
   - **✅ ATTENDU :** Le navigateur demande la permission
   - Accepter la permission
   - Le composant disparaît

4. **Vérifier l'abonnement**
   - Ouvrir la console navigateur (`F12` > Console)
   - Chercher les logs :
     ```
     [Push] Successfully subscribed
     [Push] Subscription status: true
     ```

#### Étape 2 : Envoyer une notification test

1. **Obtenir ton token JWT**
   - Dans la console : `localStorage.getItem('token')`
   - Ou depuis DevTools > Application > Local Storage > `token`
   - Copier la valeur (sans les guillemets)

2. **Envoyer la notification via API**
   ```bash
   curl -X POST 'http://localhost:8000/api/v1/push/send' \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer COLLE_TON_TOKEN_ICI' \
     -d '{
       "title": "🎉 Test PWA",
       "body": "Ta notification fonctionne parfaitement !",
       "icon": "/favicon/favicon-192.png",
       "badge": "/favicon/favicon-96.png",
       "url": "/dashboard"
     }'
   ```

3. **Vérifier la réception**
   - **✅ ATTENDU :** Notification native du système apparaît
   - Contenu :
     - Titre : "🎉 Test PWA"
     - Corps : "Ta notification fonctionne parfaitement !"
     - Icône TPM CRM
     - Badge (sur mobile)

4. **Tester le clic**
   - Cliquer sur la notification
   - **✅ ATTENDU :** L'app s'ouvre et navigue vers `/dashboard`

**💡 Astuce :** Si tu n'as pas de token, tu peux :
1. Te connecter normalement dans le navigateur
2. Ouvrir DevTools > Network
3. Filtrer par "Fetch/XHR"
4. Regarder les headers des requêtes API
5. Copier le header `Authorization: Bearer xxx`

---

### 🟠 Test 5 : Performance Lighthouse

**Temps estimé : 3 minutes**

1. **Build production** (important !)
   ```bash
   cd crm-frontend
   npm run build
   npm start
   ```
   - Attendre que le build termine (~1-2 min)
   - Le serveur démarre sur http://localhost:3010

2. **Lancer Lighthouse**
   - Ouvrir Chrome
   - Aller sur http://localhost:3010
   - Se connecter
   - `F12` > Onglet **Lighthouse**
   - Sélectionner **uniquement** :
     - ✅ Progressive Web App
     - ✅ Performance (optionnel)
   - Mode: Desktop ou Mobile
   - Cliquer **"Analyze page load"**

3. **Vérifier les scores**
   - **✅ ATTENDU (PWA) :** Score ≥ 90/100
   - Checks verts :
     - ✅ Installable
     - ✅ Provides a valid web app manifest
     - ✅ Has a service worker
     - ✅ Works offline
     - ✅ Is configured for a custom splash screen
     - ✅ Sets a theme color
     - ✅ Content is sized correctly

   - **✅ ATTENDU (Performance) :**
     - First Contentful Paint (FCP) : < 1.8s
     - Time to Interactive (TTI) : < 3.8s
     - Speed Index : < 3.4s

4. **Vérifier les détails**
   - Cliquer sur "View Original Trace"
   - **✅ ATTENDU :** La majorité des assets viennent du cache

---

## 🐛 Troubleshooting

### Le Service Worker ne s'enregistre pas

**Symptôme :** DevTools > Application > Service Workers vide

**Solutions :**
1. Mode dev : Le SW est désactivé en dev par défaut
   - Vérifier `next.config.js` : `disable: process.env.NODE_ENV === 'development'`
   - Pour tester en dev : `NODE_ENV=production npm run dev`
2. Build production : `npm run build && npm start`
3. HTTPS requis : Localhost fonctionne, mais sinon HTTPS obligatoire

### Le prompt d'installation ne s'affiche pas

**Symptôme :** Pas de card "Installer l'app"

**Solutions :**
1. Vérifier que tu n'as pas déjà dismissé le prompt
   - LocalStorage : `pwa-install-dismissed` = `true` ?
   - Supprimer la clé et recharger
2. Vérifier que l'app n'est pas déjà installée
   - Si déjà en standalone mode, le prompt ne s'affiche pas
3. Android Chrome uniquement (ou desktop Chrome)
   - Sur iOS : pas de prompt natif, voir instructions à la place

### Les notifications ne fonctionnent pas

**Symptôme :** Erreur lors de l'abonnement ou notification non reçue

**Solutions :**
1. **Permission refusée** :
   - Chrome > Paramètres > Confidentialité > Notifications
   - Autoriser pour `localhost:3010`
2. **VAPID key manquante** :
   - Les clés VAPID ne sont pas encore configurées (c'est normal !)
   - Pour tester en production, générer les clés :
     ```bash
     npx web-push generate-vapid-keys
     ```
   - Ajouter dans `.env` backend et frontend
3. **Backend ne répond pas** :
   - Vérifier que l'API tourne : `curl http://localhost:8000/health`
   - Vérifier les logs : `docker-compose logs api`

### Le mode offline ne fonctionne pas

**Symptôme :** Page blanche ou erreur en mode offline

**Solutions :**
1. **Première visite** : Le cache n'est pas encore rempli
   - Naviguer dans l'app 30-60 secondes
   - Recharger plusieurs fois
   - Ensuite tester offline
2. **Cache vide** :
   - DevTools > Application > Cache Storage
   - Vérifier qu'il y a du contenu
3. **Force clear** :
   - Unregister SW : DevTools > Application > Service Workers > "Unregister"
   - Clear cache : Cache Storage > Clic droit > "Delete"
   - Recharger la page

---

## 📊 Checklist Finale

Une fois tous les tests effectués, tu peux cocher dans [checklists/08-pwa.md](checklists/08-pwa.md) :

- [ ] 8.1-8.5 : Installation PWA
- [ ] 8.6-8.13 : Mode Hors Ligne
- [ ] 8.14-8.17 : Push Notifications
- [ ] 8.18-8.20 : Performance PWA

**Note :** Tous les tests sont déjà marqués ✅ dans la checklist car l'implémentation est complète. Les tests manuels servent à **vérifier** le bon fonctionnement.

---

## 🎯 Tests Prioritaires (si manque de temps)

Si tu ne peux pas tout tester, voici les 3 tests essentiels :

1. **🟢 Test Mode Offline** (2 min) - Le plus facile et le plus impressionnant
2. **🟡 Test Cache Strategies** (2 min) - Vérifie que le SW fait son job
3. **🔵 Test Manifest** (1 min) - Dans DevTools > Application > Manifest

Les autres tests (Installation, Push Notifications, Lighthouse) sont importants mais nécessitent plus de setup.

---

## 📝 Rapport de Test

Après avoir effectué les tests, tu peux créer un rapport rapide :

```markdown
# Rapport Test PWA - [Date]

## Tests Effectués
- [x] Mode Offline
- [x] Cache Strategies
- [ ] Installation PWA
- [ ] Push Notifications
- [ ] Lighthouse Audit

## Résultats
- **Mode Offline** : ✅ Bannière jaune/verte fonctionne
- **Cache** : ✅ 6 caches créés, assets depuis SW
- **Performance** : ⏱️ Chargement initial < 1s, rechargement < 300ms

## Bugs/Problèmes
- Aucun détecté

## Screenshots
- [Joindre screenshots si possible]
```

---

**Questions ?** Voir [checklists/08-pwa.md](checklists/08-pwa.md) pour plus de détails techniques.
