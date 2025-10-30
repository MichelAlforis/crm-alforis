/**
 * Context Menu pour suggestions de champs (AI-powered)
 *
 * Design moderne Apple-style avec:
 * - Glassmorphism subtil
 * - Animations fluides
 * - Shadows propres
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FieldSuggestion {
  value: string;
  score: number;
  usage_count: number;
  last_used?: string;
  source: string;
}

interface FieldContextMenuProps {
  /** Position du menu */
  position: { x: number; y: number };
  /** Nom du champ */
  fieldName: string;
  /** Callback pour fermer le menu */
  onClose: () => void;
  /** Callback quand une suggestion est sélectionnée */
  onSelect: (value: string) => void;
}

export function FieldContextMenu({
  position,
  fieldName,
  onClose,
  onSelect,
}: FieldContextMenuProps) {
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions depuis l'API
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('access_token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ai/autofill/suggestions?field_name=${fieldName}&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError('Impossible de charger les suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [fieldName]);

  // Ajuster la position pour ne pas dépasser de l'écran
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 300),
    y: Math.min(position.y, window.innerHeight - 400),
  };

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="fixed z-[9999]"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CONTEXT MENU CONTAINER */}
        <div
          className="
            w-72 rounded-lg overflow-hidden
            bg-white border border-gray-200
            shadow-lg
          "
        >
          {/* HEADER */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Suggestions IA</h3>
                <p className="text-xs text-gray-500">
                  {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
                </p>
              </div>
            </div>
          </div>

          {/* SUGGESTIONS LIST */}
          <div className="p-2 max-h-80 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center">
                <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Chargement...</p>
              </div>
            )}

            {error && (
              <div className="py-4 px-3 text-center">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <div className="py-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">Aucune suggestion disponible</p>
                <p className="text-xs text-gray-400 mt-1">Commencez à remplir vos données</p>
              </div>
            )}

            {!loading && !error && suggestions.length > 0 && (
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelect(suggestion.value)}
                    className="
                      w-full px-3 py-2.5 rounded-md text-left
                      transition-colors duration-150
                      hover:bg-blue-50
                      group
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {suggestion.value}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {/* SCORE BADGE */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {Math.round(suggestion.score * 100)}%
                          </span>

                          {/* USAGE COUNT */}
                          <span className="text-[10px] text-gray-500">
                            Utilisé {suggestion.usage_count}x
                          </span>
                        </div>
                      </div>

                      {/* ARROW ICON */}
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-500 text-center">
              💡 Clic droit sur un champ pour des suggestions IA
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
