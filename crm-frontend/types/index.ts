/**
 * Central Type Definitions Index
 *
 * This file consolidates all TypeScript types and interfaces for the CRM application.
 * Import from here instead of individual type files for consistency.
 *
 * @example
 * ```typescript
 * import { Organisation, Person, AISuggestion } from '@/types';
 * ```
 */

// Re-export all types from lib/types.ts (main types file)
export * from '../lib/types';

// Re-export specialized type modules
export * from './activity';
export * from './ai';
// export * from './email-marketing'; // COMMENTED: duplicates EmailEventType, EmailSend from lib/types
// export * from './interaction'; // COMMENTED: duplicates InteractionStatus, InteractionType from lib/types

// Re-export dashboard types
export * from '../lib/types/dashboard';
