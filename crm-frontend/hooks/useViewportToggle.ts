/**
 * useViewportToggle - Hook pour basculer entre modes de viewport (desktop/mobile)
 *
 * Gère le toggle entre différentes tailles de viewport pour les previews
 * d'emails, templates, etc.
 *
 * @example
 * ```tsx
 * const viewport = useViewportToggle({
 *   defaultMode: 'desktop',
 *   modes: ['desktop', 'mobile', 'tablet'],
 * })
 *
 * <Button onClick={() => viewport.setMode('mobile')}>
 *   📱 Mobile
 * </Button>
 * <div style={{ maxWidth: viewport.maxWidth }}>
 *   {content}
 * </div>
 * ```
 */

import { useState, useCallback, useMemo } from 'react'

export type ViewportMode = 'desktop' | 'mobile' | 'tablet'

export interface ViewportConfig {
  mode: ViewportMode
  maxWidth: string
  label: string
  icon: string
}

export interface UseViewportToggleOptions {
  /**
   * Mode par défaut (défaut: 'desktop')
   */
  defaultMode?: ViewportMode

  /**
   * Modes disponibles (défaut: ['desktop', 'mobile'])
   */
  modes?: ViewportMode[]

  /**
   * Callback appelé lors du changement de mode
   */
  onModeChange?: (mode: ViewportMode) => void
}

export interface UseViewportToggleReturn {
  /**
   * Mode actuel
   */
  currentMode: ViewportMode

  /**
   * Changer de mode
   */
  setMode: (mode: ViewportMode) => void

  /**
   * Vérifier si un mode est actif
   */
  isMode: (mode: ViewportMode) => boolean

  /**
   * Basculer au mode suivant dans la liste
   */
  cycleMode: () => void

  /**
   * Largeur maximale pour le mode actuel (CSS)
   */
  maxWidth: string

  /**
   * Configuration complète du mode actuel
   */
  config: ViewportConfig

  /**
   * Toutes les configurations disponibles
   */
  availableConfigs: ViewportConfig[]
}

// Configurations de viewport par défaut
const VIEWPORT_CONFIGS: Record<ViewportMode, ViewportConfig> = {
  desktop: {
    mode: 'desktop',
    maxWidth: '100%',
    label: 'Desktop',
    icon: '🖥️',
  },
  tablet: {
    mode: 'tablet',
    maxWidth: '768px',
    label: 'Tablette',
    icon: '📱',
  },
  mobile: {
    mode: 'mobile',
    maxWidth: '375px',
    label: 'Mobile',
    icon: '📱',
  },
}

export function useViewportToggle({
  defaultMode = 'desktop',
  modes = ['desktop', 'mobile'],
  onModeChange,
}: UseViewportToggleOptions = {}): UseViewportToggleReturn {
  const [currentMode, setCurrentMode] = useState<ViewportMode>(defaultMode)

  const availableConfigs = useMemo(() => {
    return modes.map((mode) => VIEWPORT_CONFIGS[mode])
  }, [modes])

  const config = useMemo(() => {
    return VIEWPORT_CONFIGS[currentMode]
  }, [currentMode])

  const setMode = useCallback(
    (mode: ViewportMode) => {
      if (!modes.includes(mode)) {
        console.warn(`Mode "${mode}" n'est pas dans les modes disponibles:`, modes)
        return
      }
      setCurrentMode(mode)
      if (onModeChange) {
        onModeChange(mode)
      }
    },
    [modes, onModeChange]
  )

  const isMode = useCallback(
    (mode: ViewportMode) => {
      return currentMode === mode
    },
    [currentMode]
  )

  const cycleMode = useCallback(() => {
    const currentIndex = modes.indexOf(currentMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setMode(modes[nextIndex])
  }, [currentMode, modes, setMode])

  const maxWidth = useMemo(() => {
    return config.maxWidth
  }, [config])

  return {
    currentMode,
    setMode,
    isMode,
    cycleMode,
    maxWidth,
    config,
    availableConfigs,
  }
}
