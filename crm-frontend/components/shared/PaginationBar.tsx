// components/shared/PaginationBar.tsx
// Un composant de pagination "fun mais pas flashy" : micro‑interactions, ellipses intelligents,
// accessibilité soignée, et options de taille de page. Compatible avec le hook usePagination.

'use client'

import React, { useMemo } from 'react'
import clsx from 'clsx'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Types
export type PaginationBarProps = {
  page: number
  limit: number
  totalItems?: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  className?: string
  /** Pages affichées autour de la page courante (1 -> montre [p-1, p, p+1]) */
  siblingCount?: number
  /** Affiche les contrôles first/last */
  showEdgeControls?: boolean
  /** Affiche le sélecteur de taille */
  showPageSize?: boolean
  /** Tailles proposées */
  pageSizeOptions?: number[]
  /** Version compacte (mobile) */
  compact?: boolean
}

// Helper — calcule un tableau de pages avec ellipses
function usePageRange(page: number, totalPages: number, siblingCount: number) {
  return useMemo<(number | 'ellipsis')[]>(() => {
    const totalNumbers = siblingCount * 2 + 5 // first, last, current, 2*siblings + 2 ellipses potentiels
    if (totalPages <= totalNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSibling = Math.max(page - siblingCount, 1)
    const rightSibling = Math.min(page + siblingCount, totalPages)
    const showLeftEllipsis = leftSibling > 2
    const showRightEllipsis = rightSibling < totalPages - 1

    const range: (number | 'ellipsis')[] = []
    range.push(1)
    if (showLeftEllipsis) range.push('ellipsis')

    for (let p = Math.max(2, leftSibling); p <= Math.min(totalPages - 1, rightSibling); p++) {
      range.push(p)
    }

    if (showRightEllipsis) range.push('ellipsis')
    range.push(totalPages)
    return range
  }, [page, siblingCount, totalPages])
}

export default function PaginationBar({
  page,
  limit,
  totalItems,
  onPageChange,
  onLimitChange,
  className,
  siblingCount = 1,
  showEdgeControls = true,
  showPageSize = true,
  pageSizeOptions = [10, 20, 50, 100],
  compact = false,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil((totalItems ?? 0) / Math.max(1, limit)))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const range = usePageRange(safePage, totalPages, siblingCount)

  const startIndex =
    totalItems == null
      ? (safePage - 1) * limit
      : Math.min((safePage - 1) * limit, Math.max(0, totalItems - 1))
  const endIndexExclusive =
    totalItems == null ? startIndex + limit : Math.min(startIndex + limit, totalItems)

  const PageButton: React.FC<{
    p: number
    current?: boolean
    disabled?: boolean
    aria?: string
    icon?: React.ReactNode
    edge?: boolean
    onClick: () => void
  }> = ({ p, current, disabled, aria, icon, edge, onClick }) => (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center rounded-xl transition-all duration-150',
        compact ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-sm',
        edge && 'px-2',
        current
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-md'
          : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-white dark:bg-slate-900 hover:border-blue-200',
        !disabled && 'hover:scale-105 active:scale-95'
      )}
      aria-current={current ? 'page' : undefined}
      aria-label={aria}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="sr-only">{aria}</span>
      {icon ? icon : p}
    </button>
  )

  return (
    <TooltipProvider>
      <div
        className={clsx(
          'flex w-full items-center justify-between gap-3',
          'rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-blue-50/30 p-3 backdrop-blur-sm',
          'shadow-sm',
          className
        )}
      >
        {/* Gauche : contrôles + pages */}
        <div className="flex items-center gap-1.5">
          {showEdgeControls && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <PageButton
                    p={1}
                    edge
                    aria="Première page"
                    icon={<ChevronsLeft className="h-4 w-4" />}
                    disabled={safePage === 1}
                    onClick={() => onPageChange(1)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Première page</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <PageButton
                  p={safePage - 1}
                  edge
                  aria="Page précédente"
                  icon={<ChevronLeft className="h-4 w-4" />}
                  disabled={safePage === 1}
                  onClick={() => onPageChange(safePage - 1)}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Précédent</TooltipContent>
          </Tooltip>

          {/* Pages avec ellipses */}
          <div className="mx-1 flex items-center gap-1.5">
            {range.map((item, idx) =>
              item === 'ellipsis' ? (
                <div
                  key={`ellipsis-${idx}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              ) : (
                <PageButton
                  key={item}
                  p={item}
                  current={item === safePage}
                  aria={`Aller à la page ${item}`}
                  onClick={() => onPageChange(item)}
                />
              )
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <PageButton
                  p={safePage + 1}
                  edge
                  aria="Page suivante"
                  icon={<ChevronRight className="h-4 w-4" />}
                  disabled={safePage === totalPages}
                  onClick={() => onPageChange(safePage + 1)}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Suivant</TooltipContent>
          </Tooltip>

          {showEdgeControls && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <PageButton
                    p={totalPages}
                    edge
                    aria="Dernière page"
                    icon={<ChevronsRight className="h-4 w-4" />}
                    disabled={safePage === totalPages}
                    onClick={() => onPageChange(totalPages)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Dernière page</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Droite : résumé + select page size */}
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
          <div className="hidden sm:block font-medium">
            {totalItems != null ? (
              <span>
                <span className="font-bold text-blue-700">{startIndex + 1}</span>
                {'–'}
                <span className="font-bold text-blue-700">{endIndexExclusive}</span> sur{' '}
                <span className="font-bold text-blue-700">{totalItems}</span>
              </span>
            ) : (
              <span>
                Page <span className="font-bold text-blue-700">{safePage}</span>
                {totalPages > 1 ? ` / ${totalPages}` : ''}
              </span>
            )}
          </div>

          {showPageSize && onLimitChange && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Afficher</span>
              <select
                value={String(limit)}
                onChange={(e) => onLimitChange?.(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-sm font-medium border-2 border-blue-300 rounded-lg bg-white dark:bg-slate-900 text-gray-800 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={String(opt)}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="hidden sm:inline">par page</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// --- Exemple d'utilisation ---
//
// const p = usePagination({ initialLimit: 20, initialPage: 1, totalItems: data.length, clampPage: true })
//
// <PaginationBar
//   page={p.page}
//   limit={p.limit}
//   totalItems={data.length}
//   onPageChange={p.goToPage}
//   onLimitChange={p.setLimit}
//   siblingCount={1}
//   showEdgeControls
//   showPageSize
// />
