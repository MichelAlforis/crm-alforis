// components/shared/Alert.tsx
// ============= ALERT COMPONENT - RÉUTILISABLE =============
import clsx from 'clsx';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose?: () => void
}

export function Alert({ type, message, onClose }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 text-vert border-vert',
    error: 'bg-red-50 text-rouge border-rouge',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    info: 'bg-blue-50 text-bleu border-bleu',
  }

  return (
    <div className={clsx('p-4 rounded-lg border', typeClasses[type])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onClose && (
          <button onClick={onClose} className="text-lg leading-none">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}