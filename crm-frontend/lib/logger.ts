/**
 * Logger wrapper pour gérer les logs en développement vs production
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.log('Debug info')      // Dev + NEXT_PUBLIC_VERBOSE_LOGS=1
 * logger.info('Info message')   // Dev + NEXT_PUBLIC_VERBOSE_LOGS=1
 * logger.warn('Warning')        // Toujours affiché
 * logger.error('Error', error)  // Toujours affiché
 * ```
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const verboseLoggingEnabled =
  process.env.NEXT_PUBLIC_VERBOSE_LOGS === '1' ||
  process.env.NEXT_PUBLIC_VERBOSE_LOGS?.toLowerCase() === 'true'
const shouldLogVerbose = isDevelopment && verboseLoggingEnabled

export const logger = {
  /**
   * Log debug - Seulement en développement
   */
  log: (...args: unknown[]) => {
    if (shouldLogVerbose) {
      console.log(...args)
    }
  },

  /**
   * Log info - Seulement en développement
   */
  info: (...args: unknown[]) => {
    if (shouldLogVerbose) {
      console.info(...args)
    }
  },

  /**
   * Log warning - Toujours affiché
   */
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },

  /**
   * Log error - Toujours affiché
   * Utiliser pour les erreurs qui doivent être tracées en production
   */
  error: (...args: unknown[]) => {
    console.error(...args)
  },

  /**
   * Log de groupe - Seulement en développement
   */
  group: (label: string) => {
    if (shouldLogVerbose) {
      console.group(label)
    }
  },

  /**
   * Fin du groupe - Seulement en développement
   */
  groupEnd: () => {
    if (shouldLogVerbose) {
      console.groupEnd()
    }
  },

  /**
   * Log table - Seulement en développement
   */
  table: (data: unknown) => {
    if (shouldLogVerbose) {
      console.table(data)
    }
  },

  /**
   * Mesure de performance - Seulement en développement
   */
  time: (label: string) => {
    if (shouldLogVerbose) {
      console.time(label)
    }
  },

  /**
   * Fin de mesure - Seulement en développement
   */
  timeEnd: (label: string) => {
    if (shouldLogVerbose) {
      console.timeEnd(label)
    }
  },
  /**
   * Indique si les logs verbeux sont actifs
   */
  isVerboseEnabled: () => shouldLogVerbose,
}

/**
 * Helper pour logger uniquement en développement avec un préfixe
 */
export const devLog = (prefix: string, ...args: unknown[]) => {
  if (shouldLogVerbose) {
    console.log(`[${prefix}]`, ...args)
  }
}

/**
 * Helper pour logger les erreurs avec contexte
 */
export const logError = (context: string, error: unknown, additionalData?: unknown) => {
  console.error(`[${context}] Error:`, error)
  if (additionalData && isDevelopment) {
    console.error('Additional data:', additionalData)
  }
}
