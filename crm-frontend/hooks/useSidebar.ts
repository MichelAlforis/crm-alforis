import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Hook pour gérer l'état des sous-menus de la sidebar
 * Gère l'ouverture/fermeture et l'auto-ouverture selon la route active
 */
export function useSidebar() {
  const pathname = usePathname()
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})

  // Auto-open submenu if current path matches
  useEffect(() => {
    // Marketing submenu
    if (pathname?.startsWith('/dashboard/marketing')) {
      setOpenSubmenus(prev => ({ ...prev, '/dashboard/marketing': true }))
    }
    // Vous pouvez ajouter d'autres conditions ici pour d'autres sous-menus
  }, [pathname])

  const toggleSubmenu = (itemHref: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [itemHref]: !prev[itemHref]
    }))
  }

  const isSubmenuOpen = (itemHref: string): boolean => {
    return openSubmenus[itemHref] || false
  }

  return {
    openSubmenus,
    toggleSubmenu,
    isSubmenuOpen,
  }
}
