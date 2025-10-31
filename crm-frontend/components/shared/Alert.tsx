// components/shared/Alert.tsx
// ============= ALERT COMPONENT - RÉUTILISABLE AVEC TITRE/ICÔNE =============
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message?: string
  icon?: ReactNode
  children?: ReactNode
  onClose?: () => void
  className?: string
}

export function Alert({ type, title, message, icon, children, onClose, className }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 text-vert border-vert',
    error: 'bg-red-50 text-rouge border-rouge',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    info: 'bg-blue-50 text-bleu border-bleu',
  }

  return (
    <div
      className={clsx(
        'rounded-radius-md border p-spacing-sm text-sm',
        'flex items-start gap-3',
        typeClasses[type],
        className
      )}
    >
      {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {message && <p>{message}</p>}
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-xs font-semibold uppercase tracking-wide text-current"
        >
          Fermer
        </button>
      )}
    </div>
  )
}
