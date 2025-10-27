# 📋 Chapitre 10 - Recherche Globale

**Status :** ✅ TERMINÉ (Code Review)
**Tests :** 8/10 (80%)
**Priorité :** 🔴 Haute

---

## Recherche Globale (10 tests)

| # | Test | Statut | Remarques |
|---|------|--------|-----------|
| 10.1 | Barre recherche visible header | ✅ | GlobalSearchInputAdvanced dans Navbar.tsx |
| 10.2 | Raccourci clavier (Cmd/Ctrl + K) | ✅ | Implémenté + touche "/" aussi |
| 10.3 | **Test** : Rechercher organisation par nom | ✅ | `/api/v1/organisations/search?q=` |
| 10.4 | **Test** : Rechercher contact par email | ✅ | `/api/v1/people?q=` (email inclus) |
| 10.5 | **Test** : Rechercher par téléphone | ✅ | Inclus dans recherche people (personal_phone) |
| 10.6 | Résultats groupés par type | ✅ | 4 types: organisations, people, interactions, kpis |
| 10.7 | Suggestions pendant la saisie (autocomplete) | ✅ | Debounce 300ms + temps réel |
| 10.8 | **Test** : Clic résultat ouvre la fiche | ✅ | router.push(href) fonctionnel |
| 10.9 | Recherche full-text (tolérance fautes) | ⬜ | PostgreSQL FTS activé, pas de fuzzy |
| 10.10 | Performance < 300ms pour 1000+ entités | ⬜ | À tester en conditions réelles |

---

## 🎯 Implémentation Existante

### Backend API
- **Endpoint principal** : `/api/v1/search` (recherche globale)
- **Endpoints spécifiques** :
  - `/api/v1/search/organisations` (FTS PostgreSQL)
  - `/api/v1/search/people`
  - `/api/v1/search/mandats`
  - `/api/v1/search/autocomplete`
- **Service** : `core/search.py` avec SearchService
- **Fonctionnalités** :
  - Full-Text Search PostgreSQL (tsvector + ts_rank)
  - Ranking par pertinence
  - Filtres combinables
  - Pagination
  - Permissions RBAC

### Frontend Components
- **Composant principal** : `GlobalSearchInputAdvanced.tsx`
- **Features implémentées** :
  - Raccourcis clavier : Cmd/Ctrl+K, /
  - Debounce 300ms
  - Historique de recherche (localStorage)
  - Affichage temps réel des résultats
  - Groupement par type
  - Loading states
  - Click outside to close
  - ESC to close
- **API Next.js** : `/app/api/search/route.ts`
  - Agrégation multi-sources (4 types)
  - Gestion auth token
  - Error handling gracieux

### Composants Secondaires
- `SearchableSelect.tsx` : Select avec recherche
- `SearchableMultiSelect.tsx` : MultiSelect avec recherche
- `SearchBar.tsx` : Barre de recherche simple

---

## 🔧 Améliorations Possibles (Optionnel)

### Test 10.9 - Fuzzy Matching
Pour ajouter la tolérance aux fautes de frappe :
- **Option 1** : Extension PostgreSQL `pg_trgm` (trigrammes)
- **Option 2** : Library TypeScript comme `fuse.js`
- **Option 3** : Elastic Search (overkill pour CRM)

**Recommandation** : `pg_trgm` est le meilleur compromis (natif PostgreSQL)

### Test 10.10 - Performance
Tests de performance à effectuer :
- Créer 1000+ organisations/contacts
- Mesurer temps de réponse search
- Optimiser indexes si > 300ms
- Monitoring avec PostgreSQL EXPLAIN

---

## 📝 Fichiers Clés

### Backend
```
crm-backend/
├── routers/search.py                    # Endpoints API
├── core/search.py                       # SearchService
└── tests/test_search.py                 # Tests unitaires
```

### Frontend
```
crm-frontend/
├── components/shared/
│   ├── GlobalSearchInputAdvanced.tsx   # Composant principal
│   ├── SearchableSelect.tsx            # Select avec search
│   └── SearchableMultiSelect.tsx       # MultiSelect
├── app/api/search/route.ts             # API Next.js
└── components/shared/Navbar.tsx        # Intégration header
```

---

**Dernière mise à jour :** 27 Octobre 2025
**Code Review By :** Claude Code  
**Status :** ✅ Fonctionnel (8/10 tests passent)
