// components/skeletons/DashboardSkeletons.tsx
// ============= P2 OPTIMIZATION: Skeleton components for Suspense =============

import React from 'react'
import { Card } from '@/components/shared'

// Shimmer effect for premium loading
const shimmer = "relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer"

/**
 * Skeleton for KPI cards (4 cards grid)
 * Used while Server Component KPICards is loading
 */
export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="text-center" style={{ animationDelay: `${i * 50}ms` }}>
          <div className={`h-10 w-16 ${shimmer} rounded mx-auto mb-2`} />
          <div className={`h-4 w-20 ${shimmer} rounded mx-auto`} />
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton for table rows
 * Used while TableV2 is loading (dynamic import)
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-slate-700">
        <div className={`h-4 w-32 ${shimmer} rounded`} />
        <div className={`h-4 w-24 ${shimmer} rounded`} />
        <div className={`h-4 w-40 ${shimmer} rounded`} />
        <div className={`h-4 w-20 ${shimmer} rounded`} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 items-center py-2 animate-in fade-in duration-200"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className={`h-4 w-32 ${shimmer} rounded`} />
          <div className={`h-4 w-24 ${shimmer} rounded`} />
          <div className={`h-4 w-40 ${shimmer} rounded`} />
          <div className={`h-4 w-20 ${shimmer} rounded`} />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for chart components
 * Used while Charts are loading (dynamic import)
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Chart title */}
      <div className={`h-6 w-48 ${shimmer} rounded`} />
      {/* Chart area */}
      <div
        className={`${shimmer} rounded-lg border border-gray-200 dark:border-slate-700`}
        style={{ height: `${height}px` }}
      >
        {/* Fake bars with staggered animation */}
        <div className="flex items-end justify-around h-full p-6 gap-2">
          {[60, 80, 40, 90, 70, 50].map((h, i) => (
            <div
              key={i}
              className="bg-gray-300/50 dark:bg-slate-600/50 rounded-t w-full animate-in fade-in duration-500"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 justify-center">
        <div className={`h-3 w-16 ${shimmer} rounded`} />
        <div className={`h-3 w-16 ${shimmer} rounded`} />
        <div className={`h-3 w-16 ${shimmer} rounded`} />
      </div>
    </div>
  )
}

/**
 * Skeleton for widget cards (interactions, recent activities, etc.)
 */
export function WidgetSkeleton() {
  return (
    <Card padding="lg" className="animate-in fade-in duration-300">
      <div className="space-y-4">
        {/* Title */}
        <div className={`h-6 w-40 ${shimmer} rounded`} />
        {/* Items */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-slate-700 animate-in fade-in duration-200"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`h-10 w-10 ${shimmer} rounded-full flex-shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-3/4 ${shimmer} rounded`} />
              <div className={`h-3 w-1/2 ${shimmer} rounded`} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
