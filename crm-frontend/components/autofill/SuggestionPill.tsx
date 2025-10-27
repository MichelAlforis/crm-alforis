/**
 * Pill de suggestion Autofill V2
 *
 * Affiche une suggestion non-invasive sous un champ avec:
 * - Valeur suggérée
 * - Score de confiance (couleur)
 * - Source (icon)
 * - Evidence (tooltip)
 * - Actions: Accepter (Enter), Rejeter (Esc)
 */

import React from 'react'
import { Check, X, Info, Sparkles, Database, Mail, Globe } from 'lucide-react'
import type { AutofillSuggestion, AutofillSourceType } from '@/hooks/useAutofillV2'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============= TYPES =============

interface SuggestionPillProps {
  suggestion: AutofillSuggestion
  onAccept: () => void
  onReject: () => void
  className?: string
}

// ============= HELPERS =============

/**
 * Couleur du badge selon le score de confiance
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-50 border-green-200 text-green-700'
  if (confidence >= 0.75) return 'bg-blue-50 border-blue-200 text-blue-700'
  if (confidence >= 0.5) return 'bg-yellow-50 border-yellow-200 text-yellow-700'
  return 'bg-gray-50 border-gray-200 text-gray-600'
}

/**
 * Icône selon la source
 */
function getSourceIcon(source: AutofillSourceType): React.ReactNode {
  switch (source) {
    case 'rules':
      return <Sparkles className="w-3 h-3" />
    case 'db_pattern':
      return <Database className="w-3 h-3" />
    case 'outlook':
      return <Mail className="w-3 h-3" />
    case 'linkedin':
    case 'google':
      return <Globe className="w-3 h-3" />
    case 'llm':
      return <Sparkles className="w-3 h-3 text-purple-500" />
    default:
      return <Info className="w-3 h-3" />
  }
}

/**
 * Label de la source (pour tooltip)
 */
function getSourceLabel(source: AutofillSourceType): string {
  switch (source) {
    case 'rules':
      return 'Règle automatique'
    case 'db_pattern':
      return 'Pattern existant'
    case 'outlook':
      return 'Email Outlook'
    case 'linkedin':
      return 'Profil LinkedIn'
    case 'google':
      return 'Google Search'
    case 'llm':
      return 'Intelligence artificielle'
    default:
      return 'Suggestion'
  }
}

/**
 * Formater la valeur pour affichage
 */
function formatValue(value: any): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// ============= COMPONENT =============

export function SuggestionPill({
  suggestion,
  onAccept,
  onReject,
  className = '',
}: SuggestionPillProps) {
  // Gérer les raccourcis clavier
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onAccept()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onReject()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onAccept, onReject])

  const colorClass = getConfidenceColor(suggestion.confidence)
  const sourceIcon = getSourceIcon(suggestion.source)
  const sourceLabel = getSourceLabel(suggestion.source)
  const displayValue = formatValue(suggestion.value)

  return (
    <TooltipProvider>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border-2
          ${colorClass} ${className}
          animate-in fade-in slide-in-from-bottom-2 duration-200
        `}
        role="alert"
        aria-live="polite"
      >
        {/* Source Icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0">{sourceIcon}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{sourceLabel}</p>
            {suggestion.evidence && (
              <p className="text-xs text-muted-foreground mt-1">{suggestion.evidence}</p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Value */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayValue}</p>
          <p className="text-xs opacity-70">
            Confiance: {Math.round(suggestion.confidence * 100)}%
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAccept}
                className="p-1.5 hover:bg-white/50 rounded transition-colors"
                aria-label="Accepter la suggestion (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Accepter (Cmd+Enter)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onReject}
                className="p-1.5 hover:bg-white/50 rounded transition-colors"
                aria-label="Rejeter la suggestion (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rejeter (Esc)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ============= MULTI-SUGGESTIONS CONTAINER =============

interface SuggestionsContainerProps {
  suggestions: Record<string, AutofillSuggestion>
  onAcceptSuggestion: (field: string, value: any) => void
  onRejectSuggestion: (field: string) => void
  className?: string
}

/**
 * Container pour afficher plusieurs suggestions (si plusieurs champs)
 */
export function SuggestionsContainer({
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  className = '',
}: SuggestionsContainerProps) {
  const suggestionEntries = Object.entries(suggestions)

  if (suggestionEntries.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {suggestionEntries.map(([field, suggestion]) => (
        <div key={field}>
          <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
            {field.replace(/_/g, ' ')}
          </p>
          <SuggestionPill
            suggestion={suggestion}
            onAccept={() => onAcceptSuggestion(field, suggestion.value)}
            onReject={() => onRejectSuggestion(field)}
          />
        </div>
      ))}
    </div>
  )
}
