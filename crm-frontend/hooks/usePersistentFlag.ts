'use client'

/**
 * usePersistentFlag hook
 *
 * Small utility to keep a boolean flag persisted in localStorage while
 * remaining reactive across components and browser tabs.
 */

import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import { storage } from '@/lib/constants'

const TRUE_VALUE = 'true'

function readFlag(key: string, fallback: boolean): boolean {
  // Utiliser le helper storage
  const stored = storage.get<string>(key)
  if (stored === null) {
    return fallback
  }
  return stored === TRUE_VALUE
}

export function usePersistentFlag(
  key: string,
  fallback: boolean = false
): readonly [boolean, (next: boolean | ((prev: boolean) => boolean)) => void, MutableRefObject<boolean>] {
  const [value, setValue] = useState<boolean>(() => readFlag(key, fallback))
  const valueRef = useRef<boolean>(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const persistValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (prev: boolean) => boolean)(prev) : next

        valueRef.current = resolved

        // Utiliser le helper storage
        try {
          if (resolved) {
            storage.set(key, TRUE_VALUE)
          } else {
            storage.remove(key)
          }
        } catch {
          // Ignore storage quota or privacy mode failures – we still update local state
        }

        return resolved
      })
    },
    [key]
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return
      }

      const nextValue = event.newValue === TRUE_VALUE
      valueRef.current = nextValue
      setValue(nextValue)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key])

  return [value, persistValue, valueRef] as const
}
