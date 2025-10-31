# ✅ PLAN D'ACTION - Visual Architecture (CHECKLIST)

**Durée :** 3 phases - 7 à 13h total
**Objectif :** Quick wins visuels mesurables + uniformisation design

---

## 🎯 PHASE 1 : Button Unification (2-3h)

**Problème :** 2 systèmes Button incompatibles
**Objectif :** Adopter `/shared/Button` (design tokens, icons, mobile)

### Checklist

- [x] Décision prise : Adopter `/shared/Button`
- [ ] Créer branch `refactor/button-unification`
- [ ] **Option A** : Script auto-migration ⚡ (30min)
  - [ ] Créer alias `/ui/button.tsx` → `/shared/Button`
  - [ ] Exécuter find/replace (variants + imports)
- [ ] **Option B** : Migration manuelle 🎯 (1-2h)
  - [ ] Migrer 6 fichiers clés (marketing, organisations, forms)
- [ ] Tests : `npm run build` + test visuel 3 pages
- [ ] Commit

**✅ Résultat :** 1 seul système Button + design tokens

---

## 🎯 PHASE 2 : Nettoyer Routes Marketing (1-2h)

**Problème :** 8 pages routes doublons
**Objectif :** Supprimer + redirects 301

### Checklist

- [ ] Ajouter redirects 301 dans `next.config.js`
  - [ ] `/campaigns` → `/marketing/campaigns`
  - [ ] `/email-campaigns` → `/marketing/campaigns`
  - [ ] `/mailing-lists` → `/marketing/mailing-lists`
- [ ] Tester redirects (navigateur + Network tab)
- [ ] Créer backup branch
- [ ] Supprimer dossiers doublons (`campaigns/`, `email-campaigns/`, `mailing-lists/`)
- [ ] Corriger liens internes (Sidebar, Navbar)
- [ ] Tests : `npm run build` + navigation
- [ ] Commit

**✅ Résultat :** Navigation unifiée + SEO amélioré

---

## 🎯 PHASE 3 : PageContainer + Uniformisation Design (4-6h)

**Problème :** 4 max-width + spacing + couleurs/typo hardcodées
**Objectif :** Composant standardisé + migration design tokens

### Checklist Phase 3.1 : Créer Composant (1h)

- [ ] Créer `components/shared/PageContainer.tsx`
  - [ ] PageContainer (width: narrow/default/wide/full)
  - [ ] PageHeader, PageSection, PageTitle
  - [ ] Utiliser design tokens : `spacing-lg`, `spacing-xl`, etc.
- [ ] Exporter depuis `components/shared/index.ts`
- [ ] Créer page test + vérifier visuellement
- [ ] Tests : `npm run build`

### Checklist Phase 3.2 : Migrer 8 Pages + Uniformiser (3-4h)

**Groupe 1 - Help Center** (incohérences critiques)
- [ ] `app/dashboard/help/page.tsx` (max-w-6xl → default)
- [ ] `app/dashboard/help/guides/page.tsx` (max-w-7xl → default)
- [ ] `app/dashboard/help/guides/organisations/page.tsx` (max-w-4xl → narrow)
- [ ] `app/dashboard/help/tutoriels/page.tsx`

**Groupe 2 - CRM Pages** (fréquentes)
- [ ] `app/dashboard/organisations/page.tsx`
- [ ] `app/dashboard/people/page.tsx`

**Groupe 3 - Marketing** (fraîchement nettoyées)
- [ ] `app/dashboard/marketing/campaigns/page.tsx`
- [ ] `app/dashboard/marketing/mailing-lists/page.tsx`

### Checklist Phase 3.3 : Uniformisation Design (1-2h)

**Pour chaque page migrée, appliquer :**

- [ ] **Couleurs :** Remplacer hardcoded → design tokens
  - [ ] `bg-blue-600` → `bg-primary`
  - [ ] `text-gray-900` → `text-text-primary`
  - [ ] `bg-green-100` → `bg-success/10`
  - [ ] `border-gray-200` → `border-border`

- [ ] **Spacing :** Remplacer classes Tailwind → design tokens
  - [ ] `p-6` → `p-spacing-lg`
  - [ ] `space-y-8` → `space-y-spacing-2xl`
  - [ ] `gap-4` → `gap-spacing-md`
  - [ ] `mb-6` → `mb-spacing-lg`

- [ ] **Typography :** Unifier échelle
  - [ ] `text-3xl` → `text-fluid-3xl`
  - [ ] `text-2xl` → `text-fluid-2xl`
  - [ ] `text-lg` → `text-fluid-lg`
  - [ ] `text-sm` → `text-fluid-sm`

- [ ] **Grilles :** Standardiser
  - [ ] `gap-4` vs `gap-6` → `gap-spacing-md` (système unique)
  - [ ] Breakpoints cohérents : `sm:`, `md:`, `lg:` (règles claires)

### Tests Phase 3

- [ ] Build TypeScript : `npm run build`
- [ ] Tests visuels complets :
  - [ ] Largeur cohérente entre pages
  - [ ] Padding/spacing uniforme
  - [ ] Couleurs cohérentes (primaires, succès, danger)
  - [ ] Typography fluide responsive
  - [ ] Grilles espacées uniformément
  - [ ] Dark mode fonctionne (design tokens)
  - [ ] Responsive (375px, 768px, 1440px)
- [ ] Commit

**✅ Résultat :** 8 pages migrées + design unifié + base pour 28 pages restantes

---

## 📊 VALIDATION FINALE

### Build & Tests

- [ ] `npm run build` → 0 erreur
- [ ] `npm run lint` → 0 erreur
- [ ] Test visuel 10 pages critiques
- [ ] Test responsive (375px, 768px, 1440px)
- [ ] Test dark mode complet

### Métriques Attendues

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Systèmes Button | 2 | 1 | -50% |
| Pages marketing | 24 | 13 | -46% |
| Max-width variants | 4 | 1 | -67% |
| Pages spacing cohérent | ~10% | ~40% | +300% |
| Utilisation design tokens | ~20% | ~60% | +200% |
| Couleurs hardcodées | ~80% | ~40% | -50% |
| Typography cohérente | Mixte | Fluid scale | 100% |
| Grilles standardisées | 3 gaps | 1 système | -67% |

---

## 🚀 NEXT STEPS

### Semaine 2
- [ ] Migrer 20 pages restantes vers PageContainer

### Semaine 3-4
- [ ] Remplacer hardcoded colors par design tokens
- [ ] Remplacer hardcoded spacing par design tokens
- [ ] Objectif : 100% design tokens

---

**Documents liés :**
- [VISUAL_ARCHITECTURE_AUDIT.md](./VISUAL_ARCHITECTURE_AUDIT.md) - Rapport technique complet
- [PLAN_ACTION_VISUEL_FIRST.md](./PLAN_ACTION_VISUEL_FIRST.md) - Résumé exécutif

*1er Novembre 2025*
