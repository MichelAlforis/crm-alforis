/**
 * DataTableSkeleton - Loading state
 */
'use client'

import React from 'react'

interface DataTableSkeletonProps {
  columns: number
  rows?: number
}

const shimmer = "relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer"

export function DataTableSkeleton({ columns, rows = 5 }: DataTableSkeletonProps) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className={`h-4 w-24 ${shimmer} rounded`} />
                </th>
              ))}
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className="animate-in fade-in duration-200"
                style={{ animationDelay: `${rowIndex * 50}ms` }}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <div className={`h-4 ${shimmer} rounded`} style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
                <td className="px-4 py-3 w-16">
                  <div className={`h-8 w-8 ${shimmer} rounded-lg ml-auto`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
