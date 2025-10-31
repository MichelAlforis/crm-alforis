'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console (or external service like Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="inline-block p-4 bg-red-100 dark:bg-red-900 rounded-full">
            <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Oups ! Une erreur s'est produite
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          Quelque chose s'est mal passé. Ne vous inquiétez pas, nous sommes au courant.
        </p>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg text-left max-w-lg mx-auto">
            <p className="text-xs font-mono text-red-400 mb-2">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-gray-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Si le problème persiste, contactez{' '}
            <a
              href="mailto:support@alforis.fr"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              support@alforis.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
