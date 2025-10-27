// components/skeletons/DashboardSkeletons.tsx
// ============= P2 OPTIMIZATION: Skeleton components for Suspense =============

import React from 'react'
import { Card } from '@/components/shared'

/**
 * Skeleton for KPI cards (4 cards grid)
 * Used while Server Component KPICards is loading
 */
export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="text-center">
          <div className="h-10 w-16 bg-gray-200 animate-pulse rounded mx-auto mb-2" />
          <div className="h-4 w-20 bg-gray-100 animate-pulse rounded mx-auto" />
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-2">
          <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
          <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
          <div className="h-4 w-40 bg-gray-100 animate-pulse rounded" />
          <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />
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
    <div className="space-y-4">
      {/* Chart title */}
      <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
      {/* Chart area */}
      <div
        className="bg-gray-100 animate-pulse rounded"
        style={{ height: `${height}px` }}
      >
        {/* Fake bars */}
        <div className="flex items-end justify-around h-full p-6 gap-2">
          {[60, 80, 40, 90, 70, 50].map((h, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-t w-full"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 justify-center">
        <div className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
        <div className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
        <div className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
      </div>
    </div>
  )
}

/**
 * Skeleton for widget cards (interactions, recent activities, etc.)
 */
export function WidgetSkeleton() {
  return (
    <Card padding="lg">
      <div className="space-y-4">
        {/* Title */}
        <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
        {/* Items */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100">
            <div className="h-10 w-10 bg-gray-100 animate-pulse rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-gray-50 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
