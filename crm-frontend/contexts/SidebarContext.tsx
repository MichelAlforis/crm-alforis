'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSidebar } from '@/hooks/useSidebar'
import { SIDEBAR_SECTIONS } from '@/config/sidebar.config'

// Type du contexte
type SidebarContextType = ReturnType<typeof useSidebar>

// Créer le contexte
const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

// Provider
export function SidebarProvider({ children }: { children: ReactNode }) {
  const sidebar = useSidebar(SIDEBAR_SECTIONS)

  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  )
}

// Hook pour utiliser le contexte
export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}
