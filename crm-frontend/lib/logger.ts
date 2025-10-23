/**
 * Logger wrapper pour gérer les logs en développement vs production
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.log('Debug info')      // Seulement en dev
 * logger.info('Info message')   // Seulement en dev
 * logger.warn('Warning')        // Toujours affiché
 * logger.error('Error', error)  // Toujours affiché
 * ```
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log debug - Seulement en développement
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Log info - Seulement en développement
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  /**
   * Log warning - Toujours affiché
   */
  warn: (...args: any[]) => {
    console.warn(...args)
  },

  /**
   * Log error - Toujours affiché
   * Utiliser pour les erreurs qui doivent être tracées en production
   */
  error: (...args: any[]) => {
    console.error(...args)
  },

  /**
   * Log de groupe - Seulement en développement
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  /**
   * Fin du groupe - Seulement en développement
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },

  /**
   * Log table - Seulement en développement
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data)
    }
  },

  /**
   * Mesure de performance - Seulement en développement
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label)
    }
  },

  /**
   * Fin de mesure - Seulement en développement
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  },
}

/**
 * Helper pour logger uniquement en développement avec un préfixe
 */
export const devLog = (prefix: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(`[${prefix}]`, ...args)
  }
}

/**
 * Helper pour logger les erreurs avec contexte
 */
export const logError = (context: string, error: any, additionalData?: any) => {
  console.error(`[${context}] Error:`, error)
  if (additionalData && isDevelopment) {
    console.error('Additional data:', additionalData)
  }
}
