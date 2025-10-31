/**
 * Modular Search System
 *
 * Exports:
 * - SearchGlobal: Global search with Cmd+K and history (for Navbar)
 * - SearchEntity: Contextual entity search (for list pages)
 * - Hooks: useSearchCore, useSearchHistory
 * - Types: SearchSuggestion, EntityType, etc.
 */

export { SearchGlobal } from './SearchGlobal'
export { SearchEntity } from './SearchEntity'
export { useSearchCore } from './useSearchCore'
export { useSearchHistory } from './useSearchHistory'
export * from './types'
