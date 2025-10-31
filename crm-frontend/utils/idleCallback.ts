// utils/idleCallback.ts
// ============= P2 OPTIMIZATION: Idle callback utilities =============

/**
 * Execute a function when the browser is idle
 * Falls back to setTimeout if requestIdleCallback is not available
 *
 * Usage:
 *   runWhenIdle(() => {
 *     // Heavy analytics, third-party scripts, etc.
 *     import('./heavy-analytics').then(m => m.init())
 *   })
 */
export function runWhenIdle(callback: () => void, options?: { timeout?: number }): number {
  if (typeof window === 'undefined') {
    return 0
  }

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, {
      timeout: options?.timeout || 2000,
    }) as any
  }

  // Fallback for browsers without requestIdleCallback (Safari < 16)
  return window.setTimeout(callback, 1) as any
}

/**
 * Cancel an idle callback
 */
export function cancelIdleCallback(id: number): void {
  if (typeof window === 'undefined') {
    return
  }

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    window.clearTimeout(id)
  }
}

/**
 * Load a script when idle
 *
 * Usage:
 *   loadScriptWhenIdle('https://cdn.example.com/analytics.js')
 */
export function loadScriptWhenIdle(src: string, options?: { async?: boolean; defer?: boolean }): Promise<void> {
  return new Promise((resolve, reject) => {
    runWhenIdle(() => {
      const script = document.createElement('script')
      script.src = src
      script.async = options?.async ?? true
      script.defer = options?.defer ?? false

      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))

      document.head.appendChild(script)
    })
  })
}

/**
 * Import a module when idle
 *
 * Usage:
 *   importWhenIdle(() => import('./heavy-module')).then(module => {
 *     module.init()
 *   })
 */
export function importWhenIdle<T>(importFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    runWhenIdle(() => {
      importFn().then(resolve).catch(reject)
    })
  })
}

/**
 * Hook version for React components
 *
 * Usage:
 *   useIdleCallback(() => {
 *     // Heavy operation
 *   }, [dependencies])
 */
export function useIdleCallback(callback: () => void, deps: React.DependencyList = []) {
  if (typeof window === 'undefined') return

  const { useEffect } = require('react')

  useEffect(() => {
    const id = runWhenIdle(callback)
    return () => cancelIdleCallback(id)
  }, deps)
}
