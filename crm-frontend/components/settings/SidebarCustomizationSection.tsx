'use client'

import clsx from 'clsx'
import { LayoutDashboard, Eye, EyeOff } from 'lucide-react'
import type { SidebarSection } from '@/config/sidebar.config'

interface SidebarCustomizationSectionProps {
  sections: SidebarSection[]
  isSectionHidden: (href: string) => boolean
  isFavorite: (href: string) => boolean
  toggleSectionVisibility: (href: string) => void
  hiddenSections: string[]
  favorites: string[]
  onShowToast: (options: { type: string; title: string; message: string }) => void
}

export function SidebarCustomizationSection({
  sections,
  isSectionHidden,
  isFavorite,
  toggleSectionVisibility,
  hiddenSections,
  favorites,
  onShowToast,
}: SidebarCustomizationSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-indigo-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Personnalisation de la sidebar
          </h2>
          <p className="text-sm text-gray-500">
            Masquez les sections que vous n&apos;utilisez pas pour simplifier votre navigation.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {sections.map((section) => {
          const SectionIcon = section.icon
          const isHidden = isSectionHidden(section.href)
          const isFav = isFavorite(section.href)

          return (
            <div
              key={section.href}
              className={clsx(
                'rounded-xl border px-5 py-4 transition-all',
                isHidden
                  ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 opacity-60'
                  : 'border-indigo-100 bg-indigo-50/50 hover:border-indigo-200 hover:bg-indigo-50'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    isHidden ? 'bg-gray-200' : 'bg-indigo-100'
                  )}>
                    <SectionIcon className={clsx(
                      'h-5 w-5',
                      isHidden ? 'text-gray-500' : 'text-indigo-600'
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {section.label}
                      </h3>
                      {isFav && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                          ⭐ Favori
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{section.description}</p>
                    {section.submenu && section.submenu.length > 0 && (
                      <p className="mt-1 text-[11px] text-indigo-600">
                        {section.submenu.length} sous-section{section.submenu.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    toggleSectionVisibility(section.href)
                    onShowToast({
                      type: isHidden ? 'success' : 'info',
                      title: isHidden ? 'Section affichée' : 'Section masquée',
                      message: `"${section.label}" est maintenant ${isHidden ? 'visible' : 'masquée'} dans la sidebar.`,
                    })
                  }}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all',
                    isHidden
                      ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:border-gray-400 hover:bg-gray-50 dark:bg-slate-800'
                  )}
                >
                  {isHidden ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Afficher
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Masquer
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <LayoutDashboard className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700">
            <p className="font-semibold">À propos de cette fonctionnalité</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Les sections masquées ne sont plus visibles dans la sidebar</li>
              <li>• Vos préférences sont sauvegardées localement</li>
              <li>• Vous pouvez ajouter des sections aux favoris avec l&apos;icône ⭐</li>
              <li>• Les sections masquées restent accessibles via l&apos;URL directe</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm">
        <p className="text-gray-500">
          {hiddenSections.length} section{hiddenSections.length > 1 ? 's' : ''} masquée{hiddenSections.length > 1 ? 's' : ''} • {favorites.length} favori{favorites.length > 1 ? 's' : ''}
        </p>
        {hiddenSections.length > 0 && (
          <button
            onClick={() => {
              hiddenSections.forEach((href) => {
                toggleSectionVisibility(href)
              })
              onShowToast({
                type: 'success',
                title: 'Toutes les sections affichées',
                message: 'La sidebar a été réinitialisée.',
              })
            }}
            className="rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
          >
            Tout réafficher
          </button>
        )}
      </div>
    </section>
  )
}
