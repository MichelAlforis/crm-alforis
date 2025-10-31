'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Large Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700">
            404
          </h1>
          <div className="-mt-16">
            <div className="inline-block p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Search className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Page non trouvée
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Accueil
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Liens utiles :
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link
              href="/dashboard/organisations"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Organisations
            </Link>
            <Link
              href="/dashboard/people"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contacts
            </Link>
            <Link
              href="/dashboard/tasks"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Tâches
            </Link>
            <Link
              href="/dashboard/help"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Aide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
