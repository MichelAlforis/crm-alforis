/**
 * useSidebar - Hook centralisé pour gestion complète de la sidebar
 *
 * Features:
 * - Persistance localStorage (submenus + collapsed)
 * - Auto-ouverture route active (générique)
 * - Gestion mobile/desktop
 * - Détection pathname active
 * - Recherche avec filtre (Phase 2)
 * - Favoris utilisateur (Phase 2)
 * - Raccourcis clavier Cmd+K (Phase 2)
 * - Préférences visibilité sections (Phase 3)
 *
 * @example
 * const sidebar = useSidebar(SIDEBAR_SECTIONS)
 * <button onClick={sidebar.toggleSubmenu('/dashboard/marketing')}>
 *   Marketing {sidebar.isSubmenuOpen('/dashboard/marketing') ? '▼' : '▶'}
 * </button>
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { logger } from '@/lib/logger'
import { storage } from '@/lib/constants'

export interface SidebarItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

export interface SidebarSection {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string | number | null
  gradient?: string
  submenu?: SidebarItem[]
}

export function useSidebar(sections: SidebarSection[] = []) {
  const pathname = usePathname()
  // Utiliser 1024px pour correspondre au breakpoint lg: de Tailwind
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // État submenus avec persistance
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    const saved = storage.get<Record<string, boolean>>('sidebar-submenus-state', {})
    return saved ?? {}
  })

  // État collapsed avec persistance
  const [collapsed, setCollapsed] = useState(() => {
    const saved = storage.get<string>('sidebar-collapsed')
    return saved === 'true'
  })

  // État mobile (pas persisté car contextuel)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ==================== PHASE 2: Recherche ====================
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  // ==================== PHASE 2: Favoris ====================
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = storage.get<string[]>('sidebar-favorites', [])
    return saved ?? []
  })

  // ==================== PHASE 3: Préférences visibilité ====================
  const [hiddenSections, setHiddenSections] = useState<string[]>(() => {
    const saved = storage.get<string[]>('sidebar-hidden-sections', [])
    return saved ?? []
  })

  // Sauvegarde auto submenus
  useEffect(() => {
    try {
      storage.set('sidebar-submenus-state', openSubmenus)
    } catch (error) {
      logger.warn('Failed to save sidebar submenus state:', error)
    }
  }, [openSubmenus])

  // Sauvegarde auto collapsed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-collapsed', String(collapsed))
      } catch (error) {
        logger.warn('Failed to save sidebar collapsed state:', error)
      }
    }
  }, [collapsed])

  // Sauvegarde auto favorites
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-favorites', JSON.stringify(favorites))
      } catch (error) {
        logger.warn('Failed to save sidebar favorites:', error)
      }
    }
  }, [favorites])

  // Sauvegarde auto hidden sections
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-hidden-sections', JSON.stringify(hiddenSections))
      } catch (error) {
        logger.warn('Failed to save sidebar hidden sections:', error)
      }
    }
  }, [hiddenSections])

  // ==================== PHASE 2: Raccourcis clavier Cmd+K ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) ou Ctrl+K (Windows/Linux) pour ouvrir la recherche
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
        // Focus automatique sur l'input de recherche
        setTimeout(() => {
          const searchInput = document.getElementById('sidebar-search-input')
          searchInput?.focus()
        }, 100)
      }
      // Escape pour fermer la recherche
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  // Auto-ouverture basée sur route active (générique)
  useEffect(() => {
    if (!pathname) return

    sections.forEach((section) => {
      if (section.submenu && section.submenu.length > 0) {
        const shouldOpen = section.submenu.some((item) =>
          pathname.startsWith(item.href)
        )
        if (shouldOpen && !openSubmenus[section.href]) {
          setOpenSubmenus((prev) => ({ ...prev, [section.href]: true }))
        }
      }
    })
  }, [pathname, sections, openSubmenus])

  // Fermer sidebar mobile lors de navigation
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [pathname, isMobile])

  // Détection route active
  const isActive = useCallback(
    (href: string): boolean => {
      if (!pathname) return false
      if (href === '/dashboard') {
        return pathname === '/dashboard'
      }
      return pathname.startsWith(href)
    },
    [pathname]
  )

  // Toggle submenu
  const toggleSubmenu = useCallback((itemHref: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [itemHref]: !prev[itemHref],
    }))
  }, [])

  // Check if submenu is open
  const isSubmenuOpen = useCallback(
    (itemHref: string): boolean => {
      return openSubmenus[itemHref] || false
    },
    [openSubmenus]
  )

  // Toggle collapsed
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  // Mobile controls
  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev)
  }, [])

  const closeMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  // ==================== PHASE 2: Gestion Favoris ====================
  const toggleFavorite = useCallback((href: string) => {
    setFavorites((prev) => {
      if (prev.includes(href)) {
        return prev.filter((f) => f !== href)
      } else {
        return [...prev, href]
      }
    })
  }, [])

  const isFavorite = useCallback(
    (href: string): boolean => {
      return favorites.includes(href)
    },
    [favorites]
  )

  // ==================== PHASE 3: Gestion Visibilité ====================
  const toggleSectionVisibility = useCallback((href: string) => {
    setHiddenSections((prev) => {
      if (prev.includes(href)) {
        return prev.filter((h) => h !== href)
      } else {
        return [...prev, href]
      }
    })
  }, [])

  const isSectionHidden = useCallback(
    (href: string): boolean => {
      return hiddenSections.includes(href)
    },
    [hiddenSections]
  )

  // ==================== PHASE 2: Filtrage par recherche ====================
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections

    const query = searchQuery.toLowerCase()

    return sections
      .map((section) => {
        // Chercher dans le label et description de la section
        const sectionMatches =
          section.label.toLowerCase().includes(query) ||
          section.description?.toLowerCase().includes(query)

        // Chercher dans les sous-items
        const filteredSubmenu = section.submenu?.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
        )

        // Si la section match OU si des sous-items matchent
        if (sectionMatches || (filteredSubmenu && filteredSubmenu.length > 0)) {
          return {
            ...section,
            submenu: sectionMatches ? section.submenu : filteredSubmenu,
          }
        }

        return null
      })
      .filter((section): section is SidebarSection => section !== null)
  }, [sections, searchQuery])

  // Sections visibles (après filtrage visibilité + recherche)
  const visibleSections = useMemo(() => {
    return filteredSections.filter((section) => !hiddenSections.includes(section.href))
  }, [filteredSections, hiddenSections])

  // Sections favorites (triées en premier)
  const favoriteSections = useMemo(() => {
    return sections.filter((section) => favorites.includes(section.href))
  }, [sections, favorites])

  // Tous les items favoris (sections + sous-items individuels)
  const favoriteItems = useMemo(() => {
    const items: Array<{ type: 'section' | 'subitem'; data: any }> = []

    sections.forEach((section) => {
      // Ajouter la section si elle est favorite
      if (favorites.includes(section.href)) {
        items.push({ type: 'section', data: section })
      }

      // Ajouter les sous-items favoris
      if (section.submenu) {
        section.submenu.forEach((subItem) => {
          if (favorites.includes(subItem.href)) {
            items.push({
              type: 'subitem',
              data: { ...subItem, parentLabel: section.label },
            })
          }
        })
      }
    })

    return items
  }, [sections, favorites])

  return {
    // État
    openSubmenus,
    collapsed,
    mobileOpen,

    // Actions submenus
    toggleSubmenu,
    isSubmenuOpen,

    // Actions collapsed
    toggleCollapsed,

    // Actions mobile
    toggleMobile,
    closeMobile,

    // Utilitaires
    isActive,
    isMobile,

    // ==================== PHASE 2: Recherche ====================
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    filteredSections,

    // ==================== PHASE 2: Favoris ====================
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteSections,
    favoriteItems,

    // ==================== PHASE 3: Visibilité ====================
    hiddenSections,
    toggleSectionVisibility,
    isSectionHidden,
    visibleSections,
  }
}
