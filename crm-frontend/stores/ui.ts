// stores/ui.ts
// ============= UI STATE STORE (Zustand) =============
// Global UI state: modals, sidebars, toasts, selections, preferences, feature flags
// NOT for: API data (use React Query), URL state (use useUrlState)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============= TYPES =============

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Modals
  activeModal: string | null
  modalData: unknown
  openModal: (modalId: string, data?: unknown) => void
  closeModal: () => void

  // Toasts (transient - not persisted)
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void
  removeToast: (id: string) => void

  // Current Selection (for bulk actions)
  selectedItems: Set<number>
  toggleSelection: (id: number) => void
  selectAll: (ids: number[]) => void
  clearSelection: () => void

  // Display Preferences
  viewMode: 'list' | 'grid' | 'kanban'
  setViewMode: (mode: UIState['viewMode']) => void

  density: 'comfortable' | 'compact' | 'spacious'
  setDensity: (density: UIState['density']) => void

  // Feature Flags (for gradual rollouts)
  featureFlags: Record<string, boolean>
  enableFeature: (flag: string) => void
  disableFeature: (flag: string) => void
  isFeatureEnabled: (flag: string) => boolean

  // Wizard/Stepper State
  wizardStep: number
  wizardData: Record<string, unknown>
  setWizardStep: (step: number) => void
  setWizardData: (data: Record<string, unknown>) => void
  resetWizard: () => void
}

// ============= STORE =============

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Modals
      activeModal: null,
      modalData: null,
      openModal: (modalId, data) => set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }))
        // Auto-remove after 5 seconds
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }))
        }, 5000)
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Selection
      selectedItems: new Set(),
      toggleSelection: (id) =>
        set((state) => {
          const newSelection = new Set(state.selectedItems)
          if (newSelection.has(id)) {
            newSelection.delete(id)
          } else {
            newSelection.add(id)
          }
          return { selectedItems: newSelection }
        }),
      selectAll: (ids) => set({ selectedItems: new Set(ids) }),
      clearSelection: () => set({ selectedItems: new Set() }),

      // Display Preferences
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),

      density: 'comfortable',
      setDensity: (density) => set({ density }),

      // Feature Flags
      featureFlags: {
        'dark-mode': true,
        'ai-autofill': true,
        'bulk-actions': true,
        'advanced-filters': false,
      },
      enableFeature: (flag) =>
        set((state) => ({
          featureFlags: { ...state.featureFlags, [flag]: true },
        })),
      disableFeature: (flag) =>
        set((state) => ({
          featureFlags: { ...state.featureFlags, [flag]: false },
        })),
      isFeatureEnabled: (flag) => get().featureFlags[flag] ?? false,

      // Wizard
      wizardStep: 0,
      wizardData: {},
      setWizardStep: (step) => set({ wizardStep: step }),
      setWizardData: (data) => set({ wizardData: data }),
      resetWizard: () => set({ wizardStep: 0, wizardData: {} }),
    }),
    {
      name: 'crm-ui-state', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
        density: state.density,
        featureFlags: state.featureFlags,
      }),
    }
  )
)

// ============= SELECTORS (for better performance) =============

// Use these in components to avoid unnecessary re-renders
export const selectSidebarCollapsed = (state: UIState) => state.sidebarCollapsed
export const selectActiveModal = (state: UIState) => state.activeModal
export const selectModalData = (state: UIState) => state.modalData
export const selectToasts = (state: UIState) => state.toasts
export const selectSelectedItems = (state: UIState) => state.selectedItems
export const selectViewMode = (state: UIState) => state.viewMode
export const selectDensity = (state: UIState) => state.density
export const selectFeatureFlags = (state: UIState) => state.featureFlags
export const selectWizardStep = (state: UIState) => state.wizardStep
export const selectWizardData = (state: UIState) => state.wizardData
