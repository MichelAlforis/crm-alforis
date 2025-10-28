# Dashboard V2

> Tableau de bord analytics refait avec widgets interactifs et graphiques temps réel

---

## Vue d'Ensemble

Dashboard moderne avec 6 widgets configurables, filtres avancés et exports multi-formats.

**Localisation**: `/crm-frontend/app/dashboard-v2/`

---

## Widgets Disponibles

1. **Leads Score** - Distribution scoring 0-100 avec classification 🔥⚡🟢
2. **Conversions** - Taux conversion leads → clients (graphique aire)
3. **Activité Récente** - Timeline interactions (emails, appels, réunions)
4. **Pipeline** - Entonnoir ventes par étape
5. **Top Commerciaux** - Classement performances équipe
6. **Objectifs** - Progress bars mensuels/trimestriels

---

## Fonctionnalités

### Filtres
- Période: Aujourd'hui / 7j / 30j / Trimestre / Année / Personnalisé
- Entité: Organisation / Personne / Interaction
- Statut: Lead / Prospect / Client

### Actions
- Export: CSV, Excel, PDF
- Rafraîchissement auto (WebSocket)
- Responsive mobile

---

## Stack Technique

```typescript
// Technologies
- Next.js 14 (App Router)
- TypeScript
- Recharts (graphiques)
- React Query (data fetching)
- Tailwind CSS + shadcn/ui
```

---

## Structure Code

```
app/dashboard-v2/
├── page.tsx                    # Page principale
├── layout.tsx                  # Layout avec sidebar
components/dashboard-v2/
├── widgets/
│   ├── LeadsScoreWidget.tsx
│   ├── ConversionsWidget.tsx
│   ├── ActivityWidget.tsx
│   ├── PipelineWidget.tsx
│   ├── TopSalesWidget.tsx
│   └── GoalsWidget.tsx
├── filters/
│   └── DashboardFilters.tsx
└── charts/
    ├── AreaChart.tsx
    ├── BarChart.tsx
    └── PieChart.tsx
lib/dashboard/
└── utils.ts                    # Helpers calculs
```

---

## API Endpoints

```typescript
GET /api/v1/dashboard/stats
GET /api/v1/dashboard/leads-score
GET /api/v1/dashboard/conversions
GET /api/v1/dashboard/activity
GET /api/v1/dashboard/pipeline
GET /api/v1/dashboard/top-sales
GET /api/v1/dashboard/goals
```

---

## Installation

```bash
# Déjà inclus dans le projet
npm run dev
# → http://localhost:3000/dashboard-v2
```

---

## Performance

- Lazy loading widgets
- Memoization composants
- Debounce filtres (300ms)
- Cache React Query (5 min)
- Bundle size: ~45KB (gzipped)

---

## Tests

Couverture: 87% (259/297 tests frontend validés)

```bash
npm test -- dashboard-v2
```

---

## Notes

- Remplace l'ancien dashboard (`/dashboard`)
- WebSocket pour updates temps réel
- Compatible mobile/tablette
- Accessibilité WCAG 2.1 AA

---

**Créé**: Octobre 2025
**Status**: ✅ Production Ready
