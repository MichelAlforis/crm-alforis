/**
 * useSearchableDropdown - Hook pour gérer la logique commune des dropdowns searchables
 *
 * Centralise toute la logique partagée entre SearchableSelect, SearchableMultiSelect, EntityAutocompleteInput:
 * - Gestion de l'état open/close du dropdown
 * - Gestion de la recherche avec filtrage
 * - Click outside detection
 * - Keyboard navigation
 * - Infinite scroll detection
 * - Focus management
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

export interface DropdownOption {
  id: number
  label: string
  sublabel?: string
}

export interface UseSearchableDropdownOptions {
  /** Options à afficher dans le dropdown */
  options: DropdownOption[]
  /** Callback appelé quand la recherche change */
  onSearch?: (query: string) => void
  /** Callback pour charger plus d'options (infinite scroll) */
  onLoadMore?: () => void
  /** Y a-t-il plus d'options à charger ? */
  hasMore?: boolean
  /** Est-ce qu'on charge plus d'options ? */
  isLoadingMore?: boolean
  /** Filtrage local activé ? (default: true) */
  enableLocalFilter?: boolean
  /** Déclencher la recherche au mount ? */
  triggerSearchOnMount?: boolean
}

export interface UseSearchableDropdownReturn {
  // Dropdown state
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  openDropdown: () => void
  closeDropdown: () => void
  toggleDropdown: () => void

  // Search state
  searchQuery: string
  setSearchQuery: (query: string) => void
  clearSearch: () => void

  // Filtered options
  filteredOptions: DropdownOption[]

  // Keyboard navigation
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  moveHighlightUp: () => void
  moveHighlightDown: () => void

  // Refs for DOM access
  containerRef: React.RefObject<HTMLDivElement>
  inputRef: React.RefObject<HTMLInputElement>
  listRef: React.RefObject<HTMLDivElement>

  // Scroll handling
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

/**
 * Hook pour gérer la logique des dropdowns searchables
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   searchQuery,
 *   setSearchQuery,
 *   filteredOptions,
 *   highlightedIndex,
 *   containerRef,
 *   inputRef,
 *   handleScroll,
 * } = useSearchableDropdown({
 *   options,
 *   onSearch,
 *   onLoadMore,
 *   hasMore,
 * })
 * ```
 */
export function useSearchableDropdown(
  options: UseSearchableDropdownOptions
): UseSearchableDropdownReturn {
  const {
    options: rawOptions,
    onSearch,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    enableLocalFilter = true,
    triggerSearchOnMount = false,
  } = options

  // State
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const hasTriggeredInitialSearchRef = useRef(false)

  // Filtered options (local filtering if enabled)
  const filteredOptions = useMemo(() => {
    if (!enableLocalFilter || !searchQuery) return rawOptions

    const query = searchQuery.toLowerCase()
    return rawOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.sublabel?.toLowerCase().includes(query)
    )
  }, [rawOptions, searchQuery, enableLocalFilter])

  // Trigger search on query change
  useEffect(() => {
    if (onSearch && searchQuery) {
      onSearch(searchQuery)
    }
  }, [searchQuery, onSearch])

  // Trigger initial search on mount if needed
  useEffect(() => {
    if (
      triggerSearchOnMount &&
      !hasTriggeredInitialSearchRef.current &&
      onSearch
    ) {
      hasTriggeredInitialSearchRef.current = true
      onSearch('')
    }
  }, [triggerSearchOnMount, onSearch])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions])

  // Helper functions
  const openDropdown = useCallback(() => setIsOpen(true), [])
  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
  }, [])
  const toggleDropdown = useCallback(() => setIsOpen((prev) => !prev), [])
  const clearSearch = useCallback(() => setSearchQuery(''), [])

  // Keyboard navigation
  const moveHighlightUp = useCallback(() => {
    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const moveHighlightDown = useCallback(() => {
    setHighlightedIndex((prev) =>
      prev < filteredOptions.length - 1 ? prev + 1 : prev
    )
  }, [filteredOptions.length])

  // Infinite scroll detection
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!onLoadMore || !hasMore || isLoadingMore) return

      const target = e.currentTarget
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight

      // Trigger load more when within 50px of bottom
      if (scrollBottom < 50) {
        onLoadMore()
      }
    },
    [onLoadMore, hasMore, isLoadingMore]
  )

  return {
    // Dropdown state
    isOpen,
    setIsOpen,
    openDropdown,
    closeDropdown,
    toggleDropdown,

    // Search state
    searchQuery,
    setSearchQuery,
    clearSearch,

    // Filtered options
    filteredOptions,

    // Keyboard navigation
    highlightedIndex,
    setHighlightedIndex,
    moveHighlightUp,
    moveHighlightDown,

    // Refs
    containerRef,
    inputRef,
    listRef,

    // Scroll handling
    handleScroll,
  }
}
