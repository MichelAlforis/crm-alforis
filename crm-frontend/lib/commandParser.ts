/**
 * CommandParser - Natural Language Intelligence
 *
 * Parses user input to understand intent and extract entities
 * Examples:
 * - "créer tâche appeler john demain" → Create task
 * - "email à toutes les orga CGPI" → Email filter
 * - "50000 * 0.02" → Calculator
 * - "john paris" → Search person in Paris
 */

import { evaluate } from 'mathjs'
import { format, addDays, addWeeks, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export type CommandIntent =
  | 'create_person'
  | 'create_organisation'
  | 'create_task'
  | 'create_interaction'
  | 'search'
  | 'navigate'
  | 'calculate'
  | 'filter'
  | 'email'
  | 'call'
  | 'unknown'

export interface ParsedCommand {
  intent: CommandIntent
  entities: {
    action?: string
    entityType?: 'person' | 'organisation' | 'task' | 'interaction'
    subject?: string
    date?: Date
    location?: string
    category?: string
    calculation?: number
    rawQuery?: string
  }
  confidence: number
  originalInput: string
}

// Keywords for intent detection
const INTENT_KEYWORDS = {
  create_person: ['créer personne', 'nouveau contact', 'ajouter personne', 'new person'],
  create_organisation: ['créer org', 'nouvelle org', 'ajouter org', 'new org'],
  create_task: ['créer tâche', 'nouvelle tâche', 'ajouter tâche', 'rappel', 'todo'],
  create_interaction: ['créer interaction', 'log', 'noter'],
  email: ['email', 'envoyer', 'mail', 'écrire à'],
  call: ['appeler', 'téléphoner', 'call'],
  navigate: ['aller à', 'go to', 'ouvrir'],
  filter: ['filtrer', 'toutes les', 'tous les'],
}

// Date keywords
const DATE_KEYWORDS = {
  aujourd: new Date(),
  demain: addDays(new Date(), 1),
  'après-demain': addDays(new Date(), 2),
  'semaine prochaine': addWeeks(new Date(), 1),
  'mois prochain': addMonths(new Date(), 1),
}

/**
 * Parse user input and extract intent + entities
 */
export function parseCommand(input: string): ParsedCommand {
  const normalized = input.toLowerCase().trim()

  // 1. Check if it's a math calculation
  if (isMathExpression(normalized)) {
    return parseCalculation(normalized, input)
  }

  // 2. Check if it's a date query
  const dateMatch = extractDate(normalized)

  // 3. Detect intent
  const intent = detectIntent(normalized)

  // 4. Extract entities based on intent
  const entities = extractEntities(normalized, intent)

  // 5. Add date if found
  if (dateMatch) {
    entities.date = dateMatch
  }

  return {
    intent,
    entities,
    confidence: calculateConfidence(intent, entities),
    originalInput: input,
  }
}

/**
 * Check if input is a math expression
 */
function isMathExpression(input: string): boolean {
  // Contains math operators and numbers
  const mathPattern = /^[\d\s+\-*/().%€$,]+$/
  return mathPattern.test(input.replace(/\s/g, ''))
}

/**
 * Parse math calculation
 */
function parseCalculation(input: string, original: string): ParsedCommand {
  try {
    // Remove currency symbols
    const cleaned = input.replace(/[€$,]/g, '')
    const result = evaluate(cleaned)

    return {
      intent: 'calculate',
      entities: {
        calculation: typeof result === 'number' ? result : parseFloat(result),
        rawQuery: original,
      },
      confidence: 1.0,
      originalInput: original,
    }
  } catch (_error) {
    return {
      intent: 'unknown',
      entities: { rawQuery: original },
      confidence: 0,
      originalInput: original,
    }
  }
}

/**
 * Detect primary intent from input
 */
function detectIntent(input: string): CommandIntent {
  // Check each intent's keywords
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        return intent as CommandIntent
      }
    }
  }

  // Default to search if no specific intent
  return 'search'
}

/**
 * Extract entities from input based on intent
 */
function extractEntities(input: string, intent: CommandIntent): ParsedCommand['entities'] {
  const entities: ParsedCommand['entities'] = {
    rawQuery: input,
  }

  switch (intent) {
    case 'create_task':
      // Extract action (after "tâche")
      const taskMatch = input.match(/tâche\s+(.+?)(?:\s+(?:demain|aujourd|pour)|\s*$)/i)
      if (taskMatch) {
        entities.action = taskMatch[1].trim()
        entities.subject = taskMatch[1].trim()
      }
      break

    case 'email':
      // Extract recipients
      const emailMatch = input.match(/(?:email|mail|écrire)\s+(?:à|a)\s+(.+)/i)
      if (emailMatch) {
        entities.subject = emailMatch[1].trim()
      }
      break

    case 'call':
      // Extract who to call
      const callMatch = input.match(/(?:appeler|call)\s+(.+)/i)
      if (callMatch) {
        entities.subject = callMatch[1].trim()
      }
      break

    case 'filter':
      // Extract filter criteria
      const filterMatch = input.match(/(?:toutes?|tous)\s+les?\s+(.+)/i)
      if (filterMatch) {
        entities.category = filterMatch[1].trim()
      }
      break

    case 'navigate':
      // Extract destination
      const navMatch = input.match(/(?:aller à|go to|ouvrir)\s+(.+)/i)
      if (navMatch) {
        entities.subject = navMatch[1].trim()
      }
      break

    default:
      entities.subject = input
  }

  return entities
}

/**
 * Extract date from natural language
 */
function extractDate(input: string): Date | undefined {
  // Check predefined keywords
  for (const [keyword, date] of Object.entries(DATE_KEYWORDS)) {
    if (input.includes(keyword)) {
      return date
    }
  }

  // Try to parse specific dates (DD/MM/YYYY)
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  const match = input.match(datePattern)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2]) - 1 // 0-indexed
    const year = parseInt(match[3])
    const fullYear = year < 100 ? 2000 + year : year
    return new Date(fullYear, month, day)
  }

  return undefined
}

/**
 * Calculate confidence score
 */
function calculateConfidence(intent: CommandIntent, entities: ParsedCommand['entities']): number {
  if (intent === 'unknown') return 0
  if (intent === 'calculate' && entities.calculation !== undefined) return 1.0
  if (intent === 'search' && !entities.action && !entities.subject) return 0.3

  let confidence = 0.7

  // Boost confidence if we found entities
  if (entities.action) confidence += 0.1
  if (entities.subject) confidence += 0.1
  if (entities.date) confidence += 0.1

  return Math.min(confidence, 1.0)
}

/**
 * Format parsed command for display
 */
export function formatCommandSummary(parsed: ParsedCommand): string {
  switch (parsed.intent) {
    case 'calculate':
      return `Calcul: ${parsed.entities.rawQuery} = ${parsed.entities.calculation?.toLocaleString('fr-FR')}`

    case 'create_task':
      let summary = `Créer tâche: ${parsed.entities.action || 'Sans titre'}`
      if (parsed.entities.date) {
        summary += ` (${format(parsed.entities.date, 'dd/MM/yyyy', { locale: fr })})`
      }
      return summary

    case 'email':
      return `Email à: ${parsed.entities.subject || 'Destinataire inconnu'}`

    case 'call':
      return `Appeler: ${parsed.entities.subject || 'Contact inconnu'}`

    case 'filter':
      return `Filtrer: ${parsed.entities.category || 'Tous'}`

    case 'search':
      return `Rechercher: ${parsed.entities.rawQuery}`

    default:
      return parsed.originalInput
  }
}
