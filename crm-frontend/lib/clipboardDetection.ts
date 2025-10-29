/**
 * ClipboardDetection - Smart clipboard content analysis
 * Detects emails, phones, URLs and suggests actions
 */

export type ClipboardContentType = 'email' | 'phone' | 'url' | 'text' | 'unknown'

export interface ClipboardSuggestion {
  type: ClipboardContentType
  value: string
  action: {
    label: string
    description: string
    icon: string
  }
}

/**
 * Analyze clipboard content and suggest actions
 */
export async function analyzeClipboard(): Promise<ClipboardSuggestion | null> {
  if (typeof window === 'undefined' || !navigator.clipboard) return null

  try {
    const text = await navigator.clipboard.readText()
    if (!text || text.length > 200) return null // Ignore long text

    const trimmed = text.trim()

    // Detect email
    if (isEmail(trimmed)) {
      return {
        type: 'email',
        value: trimmed,
        action: {
          label: 'Créer contact avec cet email',
          description: `Ajouter ${trimmed} comme nouvelle personne`,
          icon: '📧',
        },
      }
    }

    // Detect phone
    if (isPhone(trimmed)) {
      return {
        type: 'phone',
        value: trimmed,
        action: {
          label: 'Appeler ce numéro',
          description: `Créer tâche pour appeler ${trimmed}`,
          icon: '📞',
        },
      }
    }

    // Detect URL
    if (isURL(trimmed)) {
      return {
        type: 'url',
        value: trimmed,
        action: {
          label: 'Extraire données du site',
          description: 'Analyser et créer une organisation',
          icon: '🌐',
        },
      }
    }

    // If short text, suggest search
    if (trimmed.length > 2 && trimmed.length < 50) {
      return {
        type: 'text',
        value: trimmed,
        action: {
          label: `Rechercher "${trimmed}"`,
          description: 'Chercher dans le CRM',
          icon: '🔍',
        },
      }
    }

    return null
  } catch (error) {
    // Clipboard permission denied or not available
    return null
  }
}

/**
 * Check if text is a valid email
 */
function isEmail(text: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(text)
}

/**
 * Check if text is a phone number
 */
function isPhone(text: string): boolean {
  // French phone formats
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/
  const cleaned = text.replace(/[\s.-]/g, '')
  return phoneRegex.test(text) || /^[0-9]{10}$/.test(cleaned)
}

/**
 * Check if text is a URL
 */
function isURL(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Format phone number to French standard
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+33')) {
    return cleaned.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6')
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }

  return phone
}
