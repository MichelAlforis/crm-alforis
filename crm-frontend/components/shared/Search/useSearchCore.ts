/**
 * Core search hook - shared logic for all search variants
 */
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import type { SearchSuggestion } from './types'

interface UseSearchCoreOptions {
  debounceMs?: number
  minQueryLength?: number
  onSearch: (query: string) => Promise<SearchSuggestion[]>
}

export function useSearchCore({
  debounceMs = 300,
  minQueryLength = 2,
  onSearch,
}: UseSearchCoreOptions) {
  const [value, setValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const debouncedValue = useDebounce(value, debounceMs)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedValue.length < minQueryLength) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const fetchSuggestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const results = await onSearch(debouncedValue)
        if (!controller.signal.aborted) {
          setSuggestions(results)
          setIsOpen(results.length > 0)
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Erreur de recherche')
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchSuggestions()

    return () => {
      controller.abort()
    }
  }, [debouncedValue, minQueryLength, onSearch])

  const handleClear = useCallback(() => {
    setValue('')
    setSuggestions([])
    setError(null)
    setIsOpen(false)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    value,
    setValue,
    isLoading,
    suggestions,
    error,
    isOpen,
    setIsOpen,
    handleClear,
    handleClose,
  }
}
