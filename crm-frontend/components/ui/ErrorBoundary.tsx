// components/ui/ErrorBoundary.tsx - Gestion des erreurs React
'use client'
import { logger } from '@/lib/logger'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Appeler le callback onError si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // TODO: Envoyer l'erreur à un service de monitoring (Sentry, etc.)
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  public render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Sinon, afficher l'UI d'erreur par défaut
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Card principale */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header avec icône */}
              <div className="bg-gradient-to-r from-red-500 to-rose-600 px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-900/20 backdrop-blur-sm">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">
                      Oups ! Une erreur est survenue
                    </h1>
                    <p className="text-red-100 mt-1">
                      Quelque chose s'est mal passé lors du chargement de cette page
                    </p>
                  </div>
                </div>
              </div>

              {/* Body avec détails de l'erreur */}
              <div className="px-8 py-6 space-y-6">
                {/* Message d'erreur principal */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Bug className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-red-900 mb-1">
                        Message d'erreur
                      </h3>
                      <p className="text-sm text-red-700 font-mono break-words">
                        {this.state.error?.message || 'Erreur inconnue'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stack trace (dev only) */}
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <summary className="font-semibold text-gray-900 dark:text-slate-100 cursor-pointer hover:text-gray-700 dark:text-slate-300">
                      Détails techniques (développement)
                    </summary>
                    <pre className="mt-3 text-xs text-gray-700 dark:text-slate-300 overflow-x-auto font-mono bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-700">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Réessayer
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 font-semibold rounded-lg border-2 border-gray-300 dark:border-slate-600 hover:border-gray-400 hover:bg-gray-50 dark:bg-slate-800 transition-all"
                  >
                    <Home className="w-5 h-5" />
                    Accueil
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="sm:w-auto px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium rounded-lg hover:bg-gray-200 transition-all"
                  >
                    Recharger la page
                  </button>
                </div>

                {/* Message d'aide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Besoin d'aide ?</strong> Si le problème persiste, essayez de :
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800 list-disc list-inside">
                    <li>Vider le cache de votre navigateur</li>
                    <li>Vous déconnecter puis vous reconnecter</li>
                    <li>Contacter le support technique</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-slate-400">
              <p>TPM Finance CRM · Support technique disponible</p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Version simplifiée pour des sections spécifiques
export function SimpleErrorBoundary({
  children,
  componentName = 'Ce composant',
}: {
  children: ReactNode
  componentName?: string
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="font-semibold text-red-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {componentName} n'a pas pu se charger correctement.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recharger
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
