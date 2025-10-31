'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  /**
   * Custom breadcrumb items. If not provided, will auto-generate from pathname
   */
  items?: BreadcrumbItem[];

  /**
   * Show home icon for first breadcrumb
   */
  showHome?: boolean;

  /**
   * Maximum number of breadcrumbs to show before collapsing
   */
  maxItems?: number;

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Separator between breadcrumbs
   */
  separator?: React.ReactNode;
}

/**
 * Route label mapping for common routes
 * Used when auto-generating breadcrumbs from pathname
 */
const ROUTE_LABELS: Record<string, string> = {
  // Root
  dashboard: 'Tableau de bord',

  // CRM
  crm: 'CRM',
  organisations: 'Organisations',
  people: 'Contacts',
  mandats: 'Mandats',
  produits: 'Produits',

  // Marketing
  marketing: 'Marketing',
  campaigns: 'Campagnes',
  'email-campaigns': 'Campagnes Email',
  'email-templates': 'Modèles Email',
  'email-apis': 'APIs Email',
  templates: 'Modèles',
  'mailing-lists': 'Listes de diffusion',

  // AI
  ai: 'Intelligence Artificielle',
  suggestions: 'Suggestions',
  config: 'Configuration',
  executions: 'Exécutions',
  analytics: 'Analyses',

  // Workflows & Tasks
  workflows: 'Workflows',
  tasks: 'Tâches',
  kanban: 'Kanban',
  list: 'Liste',
  calendar: 'Calendrier',

  // Analytics
  kpis: 'KPIs',
  reports: 'Rapports',
  monitoring: 'Monitoring',

  // Settings
  settings: 'Paramètres',
  profile: 'Profil',
  team: 'Équipe',
  integrations: 'Intégrations',
  'sidebar-analytics': 'Analytics Sidebar',
  rgpd: 'RGPD',
  preferences: 'Préférences',

  // Actions
  new: 'Nouveau',
  edit: 'Modifier',
};

/**
 * Auto-generate breadcrumb items from pathname
 */
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip numeric IDs (show them as labels but not as links)
    if (/^\d+$/.test(segment)) {
      // Try to get a meaningful label from the previous segment
      const previousSegment = segments[i - 1];
      const label = previousSegment === 'organisations'
        ? 'Organisation #' + segment
        : previousSegment === 'people'
        ? 'Contact #' + segment
        : previousSegment === 'mandats'
        ? 'Mandat #' + segment
        : previousSegment === 'produits'
        ? 'Produit #' + segment
        : previousSegment === 'campaigns' || previousSegment === 'email-campaigns'
        ? 'Campagne #' + segment
        : '#' + segment;

      breadcrumbs.push({
        label,
        href: currentPath,
      });
      continue;
    }

    // Get label from mapping or use segment as-is
    const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }

  return breadcrumbs;
}

/**
 * Breadcrumbs component for navigation
 *
 * Automatically generates breadcrumbs from the current pathname,
 * or accepts custom breadcrumb items.
 *
 * @example
 * ```tsx
 * // Auto-generate from pathname
 * <Breadcrumbs showHome />
 *
 * // Custom breadcrumbs
 * <Breadcrumbs
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Organisations', href: '/dashboard/organisations' },
 *     { label: 'ACME Corp', href: '/dashboard/organisations/123' },
 *   ]}
 * />
 * ```
 */
export function Breadcrumbs({
  items,
  showHome = true,
  maxItems = 5,
  className,
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
}: BreadcrumbsProps) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  // Add home breadcrumb if requested
  const allItems: BreadcrumbItem[] = showHome
    ? [
        {
          label: 'Accueil',
          href: '/dashboard',
          icon: <Home className="h-4 w-4" />,
        },
        ...breadcrumbItems,
      ]
    : breadcrumbItems;

  // Handle max items with ellipsis
  let displayItems = allItems;
  let hasEllipsis = false;

  if (maxItems && allItems.length > maxItems) {
    hasEllipsis = true;
    const firstItems = allItems.slice(0, 1);
    const lastItems = allItems.slice(-(maxItems - 2));
    displayItems = [...firstItems, ...lastItems];
  }

  // Don't render if only one item (no point in breadcrumbs)
  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isFirst = index === 0;

          return (
            <React.Fragment key={item.href}>
              {/* Separator */}
              {!isFirst && (
                <li className="flex items-center">
                  {separator}
                </li>
              )}

              {/* Ellipsis after first item if collapsed */}
              {hasEllipsis && index === 1 && (
                <li className="flex items-center text-muted-foreground">
                  <span className="px-1">...</span>
                  {separator}
                </li>
              )}

              {/* Breadcrumb item */}
              <li className="flex items-center">
                {isLast ? (
                  // Last item - not a link
                  <span
                    className="flex items-center gap-1.5 font-medium text-foreground"
                    aria-current="page"
                  >
                    {item.icon}
                    <span className="truncate max-w-[200px]">
                      {item.label}
                    </span>
                  </span>
                ) : (
                  // Link for previous items
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors',
                      'truncate max-w-[200px]'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact breadcrumb component for mobile/tight spaces
 */
export function BreadcrumbsCompact({ className }: { className?: string }) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbsFromPath(pathname);

  if (breadcrumbs.length === 0) return null;

  const current = breadcrumbs[breadcrumbs.length - 1];
  const parent = breadcrumbs[breadcrumbs.length - 2];

  return (
    <nav className={cn('flex items-center text-sm', className)}>
      {parent && (
        <>
          <Link
            href={parent.href}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {parent.label}
          </Link>
          <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
        </>
      )}
      <span className="font-medium text-foreground truncate max-w-[150px]">
        {current.label}
      </span>
    </nav>
  );
}

export default Breadcrumbs;
