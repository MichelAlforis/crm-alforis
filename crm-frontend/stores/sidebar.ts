'use client'

import type { ComponentType } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface SidebarItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  description?: string
}

export interface SidebarSection {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  description?: string
  badge?: string | number | null
  gradient?: string
  submenu?: SidebarItem[]
}

type SidebarBaseState = {
  openSubmenus: Record<string, boolean>
  collapsed: boolean
  mobileOpen: boolean
  searchQuery: string
  searchOpen: boolean
  favorites: string[]
  hiddenSections: string[]
}

function createInitialState(): SidebarBaseState {
  return {
    openSubmenus: {},
    collapsed: false,
    mobileOpen: false,
    searchQuery: '',
    searchOpen: false,
    favorites: [],
    hiddenSections: [],
  }
}

export interface SidebarStore extends SidebarBaseState {
  setSearchQuery: (query: string) => void
  setSearchOpen: (open: boolean) => void
  setOpenSubmenus: (submenus: Record<string, boolean>) => void
  setSubmenuOpen: (href: string, open: boolean) => void
  toggleSubmenu: (href: string) => void
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleMobile: () => void
  setMobileOpen: (mobileOpen: boolean) => void
  closeMobile: () => void
  toggleFavorite: (href: string) => void
  setFavorites: (favorites: string[]) => void
  isFavorite: (href: string) => boolean
  toggleSectionVisibility: (href: string) => void
  setHiddenSections: (hidden: string[]) => void
  isSectionHidden: (href: string) => boolean
  isSubmenuOpen: (href: string) => boolean
  reset: () => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setOpenSubmenus: (openSubmenus) => set({ openSubmenus }),
      setSubmenuOpen: (href, open) =>
        set((state) => ({
          openSubmenus: {
            ...state.openSubmenus,
            [href]: open,
          },
        })),
      toggleSubmenu: (href) =>
        set((state) => ({
          openSubmenus: {
            ...state.openSubmenus,
            [href]: !state.openSubmenus[href],
          },
        })),
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleMobile: () => set((state) => ({ mobileOpen: !state.mobileOpen })),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
      closeMobile: () => set({ mobileOpen: false }),
      toggleFavorite: (href) => {
        const favorites = get().favorites
        const nextFavorites = favorites.includes(href)
          ? favorites.filter((f) => f !== href)
          : [...favorites, href]
        set({ favorites: nextFavorites })
      },
      setFavorites: (favorites) => set({ favorites }),
      isFavorite: (href) => get().favorites.includes(href),
      toggleSectionVisibility: (href) => {
        const hiddenSections = get().hiddenSections
        const nextHidden = hiddenSections.includes(href)
          ? hiddenSections.filter((section) => section !== href)
          : [...hiddenSections, href]
        set({ hiddenSections: nextHidden })
      },
      setHiddenSections: (hiddenSections) => set({ hiddenSections }),
      isSectionHidden: (href) => get().hiddenSections.includes(href),
      isSubmenuOpen: (href) => get().openSubmenus[href] ?? false,
      reset: () => set(createInitialState()),
    }),
    {
      name: 'crm-sidebar-state',
      partialize: (state) => ({
        openSubmenus: state.openSubmenus,
        collapsed: state.collapsed,
        favorites: state.favorites,
        hiddenSections: state.hiddenSections,
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
)
