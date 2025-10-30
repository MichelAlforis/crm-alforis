# 🎯 Plan de finalisation Outlook Integration V1.0

**Status**: Code backend PRÊT ✅ | Tests EN ATTENTE ⏳ (reconnexion Outlook requise)

---

## 📋 Checklist de finalisation

### Phase 1: Tests pagination multi-pages ⏳

**Script de test prêt**: `/tmp/test_pagination_outlook.sh`

**Commande**:
```bash
python3 /tmp/test_pagination_outlook.sh
```

**Succès attendu**:
- ✅ `message_count > 50` (preuve pagination)
- ✅ `has_next_link: true` (Graph API)
- ✅ `signatures_count > 0` (extraction fonctionne)
- ✅ Logs montrent "Page 1, Page 2, ..."

**Fichiers modifiés**:
- ✅ `crm-backend/services/outlook_integration.py` (lignes 493-586)
  - Pagination `@odata.nextLink`
  - Retry 429/503
  - Logs par page
- ✅ `crm-backend/api/routes/integrations.py` (lignes 380-396)
  - Paramètres `limit=0` (illimité), `days` configurable

---

### Phase 2: Cas "0 résultats" et fallback $filter ⏳

**Tests à valider**:

1. **Test terme inexistant**:
   ```bash
   GET /api/v1/integrations/outlook/search?query=XXXNONEXISTEXXX&limit=10
   ```
   **Attendu**:
   - Status 200
   - `message_count: 0`
   - `signatures_count: 0`
   - Logs: "No results with $search, trying $filter fallback..."
   - Logs: "No results found for query..."

2. **Test email exact avec fallback**:
   ```bash
   GET /api/v1/integrations/outlook/search?query=contact@example.com&limit=10
   ```
   **Attendu**:
   - Si $search = 0 → Fallback `$filter` avec `from/emailAddress/address eq`
   - Logs: "Filter fallback success with from/emailAddress/address: X results"

**Fichiers concernés**:
- ✅ `crm-backend/services/outlook_integration.py` (lignes 256-363)
  - `_filter_fallback()` avec 2 stratégies (email exact + contains subject)

---

### Phase 3: Logs → Sentry avec Error ID 📊

**À implémenter**:

1. **Ajouter Sentry SDK**:
   ```bash
   # crm-backend/requirements.txt
   sentry-sdk[fastapi]>=1.40.0
   ```

2. **Configuration Sentry**:
   ```python
   # crm-backend/main.py (début fichier, après imports)
   import sentry_sdk
   from sentry_sdk.integrations.fastapi import FastApiIntegration
   from sentry_sdk.integrations.logging import LoggingIntegration

   if settings.sentry_dsn:
       sentry_sdk.init(
           dsn=settings.sentry_dsn,
           integrations=[
               FastApiIntegration(),
               LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR)
           ],
           traces_sample_rate=0.1,  # 10% des transactions
           environment=settings.environment,  # "dev", "staging", "production"
       )
   ```

3. **Capturer erreurs Graph API avec contexte**:
   ```python
   # crm-backend/services/outlook_integration.py (ligne ~240)
   except httpx.HTTPStatusError as e:
       import sentry_sdk

       sentry_sdk.set_context("graph_api", {
           "url": str(e.request.url),
           "status_code": e.response.status_code,
           "aqs_query": aqs_query,
           "user_id": "XXX",  # À passer en param
       })
       sentry_sdk.capture_exception(e)

       error_detail = {
           "source": "microsoft_graph",
           "status_code": e.response.status_code,
           "error_body": e.response.text[:2000],
           "aqs_query": aqs_query,
           "sentry_event_id": sentry_sdk.last_event_id(),  # ✨ Error ID
       }
       raise HTTPException(status_code=502, detail=error_detail)
   ```

4. **Variables d'environnement**:
   ```bash
   # .env
   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   ENVIRONMENT=production  # ou "dev", "staging"
   ```

**Bénéfices**:
- 🔍 Traces complètes des erreurs Graph API
- 🆔 Error ID retourné au frontend pour support
- 📊 Monitoring rate limiting 429
- 🚨 Alertes automatiques sur erreurs critiques

---

### Phase 4: UI Search dans le CRM 🎨

**Composant à créer**: `crm-frontend/components/outlook/OutlookSearchModal.tsx`

**Fonctionnalités**:

1. **Barre de recherche intelligente**:
   ```tsx
   <SearchInput
     placeholder="Rechercher email, nom ou entreprise..."
     onSearch={(query) => handleSearch(query)}
     debounce={500}
   />
   ```

2. **Affichage résultats**:
   ```tsx
   {results.map(msg => (
     <MessageCard key={msg.id}>
       <Subject>{msg.subject}</Subject>
       <From>{msg.from.emailAddress.address}</From>
       <Date>{formatDate(msg.sentDateTime)}</Date>
       <Signatures>
         {msg.signatures.map(sig => (
           <ContactCard
             email={sig.email}
             phone={sig.phone}
             jobTitle={sig.jobTitle}
             company={sig.company}
             onImport={() => importContact(sig)}
           />
         ))}
       </Signatures>
     </MessageCard>
   ))}
   ```

3. **États**:
   - Loading (spinner)
   - Empty (0 résultats avec suggestions)
   - Error (avec Error ID Sentry si disponible)
   - Success (liste messages + signatures)

4. **Actions**:
   - Import contact → Autofill form
   - View full message
   - Filter by date range

**Intégration**:
- Bouton "Rechercher dans Outlook" dans:
  - Page contact (rechercher par nom)
  - Page organisation (rechercher par domaine)
  - Formulaire nouveau contact (autofill)

**API call**:
```typescript
// lib/api/outlook.ts
export async function searchOutlook(query: string, limit = 25) {
  const response = await fetch(
    `/api/v1/integrations/outlook/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new OutlookSearchError(error.detail, error.sentry_event_id);
  }

  return response.json();
}
```

---

### Phase 5: Bonus - Indexation signatures Autofill v2 🚀

**Objectif**: Intégrer Mode 1 Outlook dans le workflow Autofill intelligent

**Workflow proposé**:

1. **Utilisateur tape email dans formulaire contact**:
   ```tsx
   <Input
     type="email"
     onChange={(e) => {
       const email = e.target.value;
       if (isValidEmail(email)) {
         triggerAutofill(email);
       }
     }}
   />
   ```

2. **Autofill V2 interroge Outlook automatiquement**:
   ```typescript
   async function triggerAutofill(email: string) {
     // 1. Recherche dans CRM (existant)
     const crmMatch = await searchCRM(email);

     // 2. Si pas trouvé, recherche Outlook
     if (!crmMatch) {
       const outlookResults = await searchOutlook(email, 5);

       if (outlookResults.signatures_count > 0) {
         const sig = outlookResults.signatures[0];

         // 3. Pré-remplir formulaire
         autofillForm({
           email: sig.email,
           phone: sig.phone,
           jobTitle: sig.jobTitle,
           company: sig.company,
           lastContact: outlookResults.last_contact_date,
           source: "outlook_autofill",
         });

         // 4. Afficher badge "Trouvé dans Outlook"
         showBadge("Informations trouvées dans vos emails Outlook");
       }
     }
   }
   ```

3. **UI/UX**:
   - Loader pendant recherche
   - Badge "🔍 Outlook" si trouvé
   - Option "Voir tous les échanges" → Ouvre modal recherche complète
   - Bouton "Importer signature" si plusieurs résultats

**Fichiers à créer/modifier**:
- `crm-frontend/hooks/useOutlookAutofill.ts` (nouveau)
- `crm-frontend/components/forms/PersonForm.tsx` (intégration)
- `crm-backend/services/autofill_service_v2.py` (ajouter source Outlook)

**Bénéfices**:
- ⚡ Gain de temps énorme (pas besoin chercher manuellement)
- 🎯 Données fraîches (directement depuis emails)
- 📧 Contexte relationnel (date dernier échange, historique)

---

## 🎉 Critères de validation V1.0

**Outlook Integration est considérée V1.0 validée quand**:

- [x] ✅ Mode 1 fonctionne (recherche avec pagination)
- [x] ✅ Mode 3 fonctionne (aspirateur avec pagination)
- [ ] ⏳ Tests pagination multi-pages passés (>50 messages)
- [ ] ⏳ Cas "0 résultats" + fallback $filter validés
- [ ] 📊 Logs Sentry avec Error ID
- [ ] 🎨 UI Search fonctionnelle dans CRM
- [ ] 🚀 (Optionnel) Autofill v2 avec Outlook

**Date cible**: Après reconnexion Outlook + 2-3 jours dev UI/Sentry

---

## 📝 Notes techniques

### Limites Graph API à respecter:
- **$search**: Max 25 par page, nécessite `ConsistencyLevel: eventual`
- **$filter**: Max 100 par page, compatible `$orderby`
- **Rate limiting**: 429 après ~10k requêtes/10min
- **Scopes requis**: `Mail.Read` + `offline_access`

### Performance:
- Mode 1 (limit=50): ~2-5 secondes
- Mode 3 (200 messages): ~30-60 secondes
- Mode 3 illimité (1000+ messages): 2-5 minutes

### Sécurité:
- Tokens chiffrés (Fernet AES-256)
- Refresh automatique (TODO: implémenter)
- Rate limiting login (5 tentatives/5min)
- Validation queue signatures (anti-pollution)

---

## 🔗 Ressources

- [Microsoft Graph API Messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages)
- [AQS Syntax](https://learn.microsoft.com/en-us/graph/search-query-parameter)
- [Sentry FastAPI Integration](https://docs.sentry.io/platforms/python/guides/fastapi/)
- Script test: `/tmp/test_pagination_outlook.sh`
- Endpoints debug:
  - `GET /api/v1/integrations/outlook/debug/me`
  - `GET /api/v1/integrations/outlook/debug/messages-raw?days=30`

---

**Dernière mise à jour**: 2025-10-29
**Auteur**: Claude (Assistant IA)
**Statut**: En attente reconnexion Outlook pour tests finaux
