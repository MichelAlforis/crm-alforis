/**
 * Sidebar Configuration
 * Configuration centralisée des items de la sidebar
 *
 * ARCHITECTURE OPTIMISÉE (2025-10-24)
 * - Regroupement logique par domaine métier
 * - 6 sections principales au lieu de 11 items plats
 * - Navigation plus claire et rapide
 */

import {
  LayoutDashboard,
  UserCircle2,
  Building2,
  Briefcase,
  Package,
  Workflow,
  BarChart3,
  Sparkles,
  Mail,
  Upload,
  Users,
  List,
  FileText,
  Settings,
  Link as LinkIcon,
  Zap,
  Database,
} from 'lucide-react'
import { SidebarSection } from '@/hooks/useSidebar'

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  // ========================================
  // 1. DASHBOARD - Vue d'ensemble
  // ========================================
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: "Vue d'ensemble",
    badge: null,
    gradient: 'from-blue-500 to-cyan-500',
  },

  // ========================================
  // 2. CRM - Gestion relationnelle
  // ========================================
  {
    label: 'CRM',
    href: '/dashboard/crm',
    icon: Database,
    description: 'Gestion relationnelle',
    badge: null,
    gradient: 'from-purple-500 to-pink-500',
    submenu: [
      {
        label: 'Organisations',
        href: '/dashboard/organisations',
        icon: Building2,
        description: 'Clients, fournisseurs, distributeurs',
      },
      {
        label: 'Personnes',
        href: '/dashboard/people',
        icon: UserCircle2,
        description: 'Annuaire des contacts',
      },
      {
        label: 'Mandats',
        href: '/dashboard/mandats',
        icon: Briefcase,
        description: 'Mandats de distribution',
      },
    ],
  },

  // ========================================
  // 3. PRODUITS & ANALYTICS
  // ========================================
  {
    label: 'Produits & Analytics',
    href: '/dashboard/produits',
    icon: Package,
    description: 'Produits & performances',
    badge: null,
    gradient: 'from-amber-500 to-orange-500',
    submenu: [
      {
        label: 'Produits',
        href: '/dashboard/produits',
        icon: Package,
        description: 'OPCVM, ETF, SCPI...',
      },
      {
        label: 'KPIs Fournisseurs',
        href: '/dashboard/kpis',
        icon: BarChart3,
        description: 'Indicateurs de performance',
      },
    ],
  },

  // ========================================
  // 4. AUTOMATISATION
  // ========================================
  {
    label: 'Automatisation',
    href: '/dashboard/automation',
    icon: Zap,
    description: 'Workflows & IA',
    badge: null,
    gradient: 'from-indigo-500 to-purple-500',
    submenu: [
      {
        label: 'Workflows',
        href: '/dashboard/workflows',
        icon: Workflow,
        description: 'Automatisations métier',
      },
      {
        label: 'Agent IA',
        href: '/dashboard/ai',
        icon: Sparkles,
        description: 'Suggestions intelligentes',
      },
    ],
  },

  // ========================================
  // 5. MARKETING
  // ========================================
  {
    label: 'Marketing',
    href: '/dashboard/marketing',
    icon: Mail,
    description: 'Campagnes & automation',
    badge: null,
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    submenu: [
      {
        label: "Vue d'ensemble",
        href: '/dashboard/marketing',
        icon: LayoutDashboard,
        description: 'Dashboard marketing',
      },
      {
        label: 'Campagnes',
        href: '/dashboard/marketing/campaigns',
        icon: Mail,
        description: 'Campagnes email',
      },
      {
        label: 'Listes',
        href: '/dashboard/marketing/mailing-lists',
        icon: List,
        description: 'Listes de diffusion',
      },
      {
        label: 'Templates',
        href: '/dashboard/marketing/templates',
        icon: FileText,
        description: 'Templates email',
      },
    ],
  },

]

/**
 * HISTORIQUE DES CHANGEMENTS
 *
 * 2025-10-24: Optimisation structure sidebar
 * - Réduction de 11 items → 6 sections
 * - Regroupement logique par domaine
 * - Navigation plus claire et intuitive
 *
 * AVANT (11 items plats):
 * 1. Dashboard
 * 2. Organisations
 * 3. Personnes
 * 4. Mandats
 * 5. Produits
 * 6. Workflows
 * 7. KPIs Fournisseurs
 * 8. Agent IA
 * 9. Marketing (avec submenu)
 * 10. Import Unifié
 * 11. Utilisateurs
 *
 * APRÈS (6 sections organisées):
 * 1. Dashboard
 * 2. CRM (Organisations, Personnes, Mandats)
 * 3. Produits & Analytics (Produits, KPIs)
 * 4. Automatisation (Workflows, Agent IA)
 * 5. Marketing (Vue, Campagnes, Listes, Templates)
 * 6. Paramètres (Config, Webhooks, Users, Import)
 */
