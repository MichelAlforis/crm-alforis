import { Info } from 'lucide-react'
import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HelpTooltipProps {
  /**
   * Contenu du tooltip (texte d'aide)
   */
  content: string
  /**
   * Lien optionnel vers un guide détaillé
   */
  learnMoreLink?: string
  /**
   * Texte du lien "En savoir plus" (par défaut: "En savoir plus →")
   */
  learnMoreText?: string
  /**
   * Taille de l'icône (par défaut: 'sm')
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Position du tooltip (par défaut: 'top')
   */
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function HelpTooltip({
  content,
  learnMoreLink,
  learnMoreText = 'En savoir plus →',
  size = 'sm',
  side = 'top',
}: HelpTooltipProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:text-slate-400 transition-colors"
            aria-label="Aide"
          >
            <Info className={iconSizes[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-slate-300">{content}</p>
            {learnMoreLink && (
              <Link
                href={learnMoreLink}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {learnMoreText}
              </Link>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
