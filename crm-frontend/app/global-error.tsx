'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical error
    console.error('Critical application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            {/* Error Icon */}
            <div className="mb-8">
              <div className="inline-block p-4 bg-red-100 rounded-full">
                <AlertTriangle className="w-16 h-16 text-red-600" />
              </div>
            </div>

            {/* Title & Description */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Erreur critique
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Une erreur critique s'est produite. Veuillez rafraîchir la page.
            </p>

            {/* Action Button */}
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              Rafraîchir
            </button>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-800 rounded-lg text-left max-w-lg mx-auto">
                <p className="text-xs font-mono text-red-400 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-gray-400 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
