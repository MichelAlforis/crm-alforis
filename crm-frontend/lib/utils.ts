// lib/utils.ts
// ============= UTILITY FUNCTIONS =============

/**
 * Classe name utility function - combine classnames conditionnellement
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .join(' ')
}

/**
 * Format une date en format français
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format un datetime en format français
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format une devise en euros
 */
export function formatCurrency(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '0€'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

/**
 * Format un pourcentage
 */
export function formatPercent(value: number, decimals = 2): string {
  if (typeof value !== 'number' || isNaN(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}

/**
 * Capitalise la première lettre
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convertir snake_case en human readable
 */
export function humanizeKey(key: string): string {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Tronquer une chaîne avec ellipsis
 */
export function truncate(str: string, length: number): string {
  if (!str || length < 0) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

/**
 * Attendre une certaine durée
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Cloner un objet profondément
 */
export function deepClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj)) as T
  } catch {
    return obj
  }
}

/**
 * Vérifier si une valeur est vide
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Merger deux objets
 */
export function merge<T extends object>(obj1: T, obj2: Partial<T>): T {
  return { ...obj1, ...obj2 }
}

/**
 * Générer un ID unique
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Filtrer les valeurs nulles/undefined
 */
export function filterEmpty<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)
  ) as Partial<T>
}

/**
 * Convertir un nombre en format compact (K, M, B)
 */
export function formatCompact(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '0'
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
  return value.toString()
}

/**
 * Génère un slug URL-friendly à partir d'une chaîne
 * Exemple: "Jean-Paul Dupont" -> "jean-paul-dupont"
 */
export function slugify(text: string): string {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères non-alphanumériques par des tirets
    .replace(/^-+|-+$/g, '') // Supprime les tirets au début et à la fin
    .replace(/-+/g, '-') // Remplace les tirets multiples par un seul
}

/**
 * Génère une URL slug pour une personne: "id-prenom-nom"
 * Exemple: (123, "Jean", "Dupont") -> "123-jean-dupont"
 */
export function personSlug(id: number, firstName: string, lastName: string): string {
  const nameSlug = slugify(`${firstName} ${lastName}`)
  return `${id}-${nameSlug}`
}

/**
 * Extrait l'ID d'un slug de personne
 * Exemple: "123-jean-dupont" -> 123
 */
export function extractIdFromSlug(slug: string): number | null {
  if (!slug) return null
  const parts = slug.split('-')
  const id = parseInt(parts[0], 10)
  return isNaN(id) ? null : id
}