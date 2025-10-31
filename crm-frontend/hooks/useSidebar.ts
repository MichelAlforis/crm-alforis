/**
 * useSidebar - Hook centralisé pour gestion complète de la sidebar (piloté par Zustand)
 *
 * Features:
 * - Persistance via Zustand (submenus, collapse, favoris, visibilité)
 * - Auto-ouverture route active
 * - Gestion mobile/desktop
 * - Recherche, favoris, visibilité
 *
 * @example
 * const sidebar = useSidebar(SIDEBAR_SECTIONS)
 * <button onClick={() => sidebar.toggleSubmenu('/dashboard/marketing')}>
 *   Marketing {sidebar.isSubmenuOpen('/dashboard/marketing') ? '▼' : '▶'}
 * </button>
 */

import { useCallback, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  SidebarSection,
  useSidebarStore,
} from '@/stores/sidebar'

export type { SidebarItem, SidebarSection } from '@/stores/sidebar'

export function useSidebar(sections: SidebarSection[] = []) {
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 1023px)')

  const {
    openSubmenus,
    collapsed,
    mobileOpen,
    toggleSubmenu,
    setSubmenuOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
    setMobileOpen,
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    favorites,
    toggleFavorite,
    isFavorite,
    hiddenSections,
    toggleSectionVisibility,
    isSectionHidden,
  } = useSidebarStore(
    useShallow((state) => ({
      openSubmenus: state.openSubmenus,
      collapsed: state.collapsed,
      mobileOpen: state.mobileOpen,
      toggleSubmenu: state.toggleSubmenu,
      setSubmenuOpen: state.setSubmenuOpen,
      toggleCollapsed: state.toggleCollapsed,
      toggleMobile: state.toggleMobile,
      closeMobile: state.closeMobile,
      setMobileOpen: state.setMobileOpen,
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
      searchOpen: state.searchOpen,
      setSearchOpen: state.setSearchOpen,
      favorites: state.favorites,
      toggleFavorite: state.toggleFavorite,
      isFavorite: state.isFavorite,
      hiddenSections: state.hiddenSections,
      toggleSectionVisibility: state.toggleSectionVisibility,
      isSectionHidden: state.isSectionHidden,
    }))
  )

  // Auto-ouverture basée sur route active
  useEffect(() => {
    if (!pathname) return

    sections.forEach((section) => {
      if (section.submenu && section.submenu.length > 0) {
        const shouldOpen = section.submenu.some((item) => pathname.startsWith(item.href))
        if (shouldOpen) {
          setSubmenuOpen(section.href, true)
        }
      }
    })
  }, [pathname, sections, setSubmenuOpen])

  // Fermer la sidebar mobile lors de la navigation
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [pathname, isMobile, setMobileOpen])

  // Raccourcis clavier Cmd/Ctrl + K pour la recherche
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setSearchOpen(!searchOpen)
        setTimeout(() => {
          const searchInput = document.getElementById('sidebar-search-input')
          searchInput?.focus()
        }, 100)
      }

      if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, setSearchOpen, setSearchQuery])

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

  const isSubmenuOpen = useCallback(
    (itemHref: string): boolean => {
      return openSubmenus[itemHref] ?? false
    },
    [openSubmenus]
  )

  // ==================== PHASE 2: Filtrage par recherche ====================
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections

    const query = searchQuery.toLowerCase()

    return sections
      .map((section) => {
        const sectionMatches =
          section.label.toLowerCase().includes(query) ||
          section.description?.toLowerCase().includes(query)

        const filteredSubmenu = section.submenu?.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
        )

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

  const visibleSections = useMemo(() => {
    return filteredSections.filter((section) => !hiddenSections.includes(section.href))
  }, [filteredSections, hiddenSections])

  const favoriteSections = useMemo(() => {
    return sections.filter((section) => favorites.includes(section.href))
  }, [sections, favorites])

  const favoriteItems = useMemo(() => {
    const items: Array<{ type: 'section' | 'subitem'; data: any }> = []

    sections.forEach((section) => {
      if (favorites.includes(section.href)) {
        items.push({ type: 'section', data: section })
      }

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
    openSubmenus,
    collapsed,
    mobileOpen,

    toggleSubmenu,
    isSubmenuOpen,

    toggleCollapsed,

    toggleMobile,
    closeMobile,

    isActive,
    isMobile,

    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    filteredSections,

    favorites,
    toggleFavorite,
    isFavorite,
    favoriteSections,
    favoriteItems,

    hiddenSections,
    toggleSectionVisibility,
    isSectionHidden,
    visibleSections,
  }
}
