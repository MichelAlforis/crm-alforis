# 🎨 Frontend AI - Plan de Réorganisation

**Date:** 2025-10-28
**Objectif:** Créer une interface claire pour visualiser les statistiques Autofill V2

---

## 📊 Structure Actuelle

```
/dashboard/ai/
├── page.tsx                    # AI Agent dashboard (suggestions, duplicates, quality)
├── config/                     # Configuration AI Agent
├── suggestions/                # Liste des suggestions AI
└── [MANQUANT] autofill/        # 🎯 À créer - Stats Autofill V2
```

**Problème:** Confusion entre "AI Agent" (suggestions manuelles) et "Autofill" (suggestions automatiques)

---

## 🎯 Structure Cible

```
/dashboard/ai/
├── page.tsx                    # Hub AI global (liens vers autofill + agent)
├── autofill/                   # 🆕 Dashboard Autofill V2
│   └── page.tsx                # Stats + Timeline + Leaderboard
├── agent/                      # 🔄 Renommer de racine
│   ├── page.tsx                # AI Agent (ex: /ai/page.tsx)
│   ├── config/                 # Configuration
│   └── suggestions/            # Suggestions
└── config/                     # 🔄 Config globale (ou déplacer dans settings)
```

---

## 🎨 Page `/dashboard/ai/autofill` - Design

### Layout 3 Sections

```
┌─────────────────────────────────────────────────────┐
│ 🤖 Autofill V2 Statistics            [7 days ▼]    │
│ Suggestions automatiques basées sur règles + LLM    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐│
│  │ 📊 Apply Rate│  │ ⚡ Latency    │  │ 🎯 Sources││
│  │              │  │              │  │           ││
│  │    45.2%     │  │   120ms      │  │ Rules 60% ││
│  │ 2,145 / 4,750│  │   p95: 350ms │  │ DB    25% ││
│  │              │  │              │  │ LLM   15% ││
│  └──────────────┘  └──────────────┘  └───────────┘│
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📈 Timeline (7 derniers jours)                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  [Graphique ligne: suggestions vs applied]   │ │
│  │                                               │ │
│  │     /\                                        │ │
│  │    /  \    /\                                 │ │
│  │   /    \  /  \                                │ │
│  │  /      \/    \___                            │ │
│  │ ────────────────────────────────────────      │ │
│  │  L  M  M  J  V  S  D                          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🏆 Leaderboard (Top 10 utilisateurs)               │
│  ┌───────────────────────────────────────────────┐ │
│  │ #  User              Suggestions  Applied  %  │ │
│  │ 1  Alice Martin           342       298   87% │ │
│  │ 2  Bob Dupont             256       201   78% │ │
│  │ 3  Claire Bernard         189       145   77% │ │
│  │ ...                                           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🧩 Composants à Créer

### 1. `/app/dashboard/ai/autofill/page.tsx`

**Responsabilités:**
- Afficher les 3 métriques principales (apply rate, latency, sources)
- Graphique timeline (recharts ou chart.js)
- Table leaderboard
- Sélecteur période (7/14/30/90 jours)

**Hooks utilisés:**
```tsx
const { data: stats } = useAutofillStats(days)
const { data: timeline } = useAutofillTimeline(days)
const { data: leaderboard } = useAutofillLeaderboard()
```

---

### 2. `/components/ai/AutofillStatsCard.tsx`

**Props:**
```tsx
interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}
```

**Usage:**
```tsx
<AutofillStatsCard
  title="Apply Rate"
  value="45.2%"
  subtitle="2,145 applied / 4,750 suggestions"
  icon={CheckCircle}
  trend="up"
  trendValue="+3.2%"
/>
```

---

### 3. `/components/ai/AutofillTimelineChart.tsx`

**Props:**
```tsx
interface Props {
  data: AutofillTimelineResponse['timeline']
  days: number
}
```

**Librairie:** `recharts` (déjà utilisée dans le projet)

**Chart Type:** Line Chart avec 2 séries
- Série 1: Total suggestions (bleu)
- Série 2: Applied suggestions (vert)

---

### 4. `/components/ai/AutofillLeaderboardTable.tsx`

**Props:**
```tsx
interface Props {
  data: AutofillLeaderboardResponse['leaderboard']
}
```

**Features:**
- Podium top 3 (médailles 🥇🥈🥉)
- Barre de progression pour apply_rate
- Hover tooltips avec détails

---

## 🔗 Navigation Menu Update

### Sidebar Menu `/components/shared/Sidebar.tsx`

**Avant:**
```tsx
{
  name: 'AI',
  href: '/dashboard/ai',
  icon: Brain,
}
```

**Après:**
```tsx
{
  name: 'AI',
  icon: Brain,
  subItems: [
    {
      name: 'Autofill Stats',
      href: '/dashboard/ai/autofill',
      icon: Zap,
    },
    {
      name: 'Agent IA',
      href: '/dashboard/ai/agent',
      icon: Sparkles,
    },
    {
      name: 'Configuration',
      href: '/dashboard/settings/integrations?tab=ai',
      icon: Settings,
    },
  ],
}
```

---

## 📋 Types TypeScript à Ajouter

### `/lib/types.ts` (déjà existants selon les hooks)

```tsx
export interface AutofillStats {
  period: {
    days: number
    since: string
    until: string
  }
  apply_rate: {
    total_suggestions: number
    total_applied: number
    rate: number // 0.0 - 1.0
  }
  avg_latency_ms: {
    value: number
    p50: number
    p95: number
    p99: number
  }
  source_mix: {
    rules: { count: number; percentage: number }
    db_pattern: { count: number; percentage: number }
    outlook: { count: number; percentage: number }
    llm: { count: number; percentage: number }
  }
  pattern_confidence_by_domain: Array<{
    domain: string
    samples: number
    avg_confidence: number
  }>
  top_fields: Array<{
    field: string
    count: number
    apply_rate: number
  }>
}

export interface AutofillTimelineResponse {
  period: { days: number }
  timeline: Array<{
    date: string // ISO date
    suggestions: number
    applied: number
    apply_rate: number
  }>
}

export interface AutofillLeaderboardResponse {
  period: { days: number }
  leaderboard: Array<{
    rank: number
    user_id: number
    user_name: string
    total_suggestions: number
    total_applied: number
    apply_rate: number
  }>
}
```

---

## 🎨 Design System

### Couleurs

```tsx
// Stats Cards
applyRate: 'from-green-500 to-emerald-600'  // Succès
latency: 'from-blue-500 to-cyan-600'        // Performance
sources: 'from-purple-500 to-pink-600'      // Diversité

// Charts
suggestions: '#3B82F6'  // Bleu
applied: '#10B981'      // Vert
timeline: '#6B7280'     // Gris pour grille
```

### Icons (lucide-react)

```tsx
import {
  CheckCircle,  // Apply rate
  Zap,          // Latency
  PieChart,     // Sources
  TrendingUp,   // Timeline
  Trophy,       // Leaderboard
  Calendar,     // Period selector
} from 'lucide-react'
```

---

## 🚀 Plan d'Implémentation (2h)

### Phase 1: Structure (30min)
1. ✅ Créer `/app/dashboard/ai/autofill/page.tsx`
2. ✅ Créer composants de base (cards, table, chart)
3. ✅ Intégrer les 3 hooks existants

### Phase 2: Composants (1h)
4. ✅ `AutofillStatsCard` avec gradients + icons
5. ✅ `AutofillTimelineChart` avec recharts
6. ✅ `AutofillLeaderboardTable` avec podium

### Phase 3: Navigation (15min)
7. ✅ Mettre à jour Sidebar avec submenu AI
8. ✅ Ajouter lien depuis `/dashboard/ai` (hub)

### Phase 4: Polish (15min)
9. ✅ Loading states
10. ✅ Empty states (si pas de données)
11. ✅ Error handling
12. ✅ Responsive mobile

---

## 🧪 Tests Frontend

### Test 1: Page charge sans erreur
```bash
# Naviguer vers http://localhost:3010/dashboard/ai/autofill
# Vérifier: Pas d'erreur console
# Vérifier: Loading skeleton apparaît
```

### Test 2: Stats affichées
```bash
# Vérifier: 3 cards stats affichées
# Vérifier: Timeline chart visible
# Vérifier: Leaderboard table visible
```

### Test 3: Sélecteur période
```bash
# Changer période de 7 → 14 jours
# Vérifier: Query refetch automatique
# Vérifier: Données mises à jour
```

### Test 4: Empty state
```bash
# DB vide (pas de AutofillLog)
# Vérifier: Message "Aucune donnée disponible"
# Vérifier: Pas d'erreur JS
```

---

## 📊 Métriques Affichées

### Card 1: Apply Rate
```
Titre: "Taux d'application"
Valeur: "45.2%"
Sous-titre: "2,145 appliquées / 4,750 suggestions"
Trend: +3.2% vs semaine précédente (Phase 2)
```

### Card 2: Latency
```
Titre: "Latence moyenne"
Valeur: "120ms"
Sous-titre: "p95: 350ms, p99: 580ms"
Tooltip: "Temps de génération de la suggestion"
```

### Card 3: Sources
```
Titre: "Mix de sources"
Valeur: Pie chart mini
Sous-titre: "Rules 60%, DB 25%, LLM 15%"
Tooltip: "Répartition des sources de suggestions"
```

---

## 🔗 Intégration avec Config

### Lien depuis Settings

**Page:** `/dashboard/settings/integrations?tab=ai`

**Ajout section "Statistiques" dans AIConfigSection:**

```tsx
<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
    <TrendingUp className="h-5 w-5" />
    Statistiques Autofill
  </h3>
  <p className="text-sm text-blue-700 mt-1">
    Consultez les métriques d'utilisation de l'autofill
  </p>
  <Link
    href="/dashboard/ai/autofill"
    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    Voir les statistiques
    <ArrowRight className="h-4 w-4" />
  </Link>
</div>
```

---

## 🎯 Objectif Final

**UX Cible:**
1. User va dans `/dashboard/ai/autofill`
2. Voit immédiatement les 3 métriques clés
3. Explore la timeline pour comprendre l'évolution
4. Consulte le leaderboard pour gamification
5. Peut ajuster la période (7/14/30 jours)
6. Peut cliquer "Configuration" pour ajuster settings

**Performance:**
- ✅ Chargement < 1s (données cached 5min)
- ✅ Queries parallèles (3 hooks en même temps)
- ✅ Pas de re-render inutile (React Query)

---

**Prêt à implémenter ?** ✅
