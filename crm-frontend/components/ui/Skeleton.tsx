// components/ui/Skeleton.tsx - Skeleton screens pour états de chargement
import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]'

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[wave_1.5s_ease-in-out_infinite]',
    none: '',
  }

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

// Composants pré-configurés pour cas d'usage courants
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={20} className="w-3/4" />
          <Skeleton variant="text" height={16} className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={120} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" height={32} className="flex-1" />
        <Skeleton variant="rectangular" height={32} className="flex-1" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <Skeleton variant="text" height={24} className="w-1/4" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" height={16} className="w-2/3" />
              <Skeleton variant="text" height={14} className="w-1/2" />
            </div>
            <Skeleton variant="rectangular" width={80} height={32} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4"
        >
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={18} className="w-3/4" />
            <Skeleton variant="text" height={14} className="w-1/2" />
          </div>
          <Skeleton variant="rectangular" width={24} height={24} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" height={20} className="w-1/3" />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <Skeleton variant="text" height={36} className="w-1/2 mb-2" />
      <Skeleton variant="text" height={14} className="w-2/3" />
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <Skeleton variant="text" height={24} className="w-1/4 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" height={16} className="w-1/6" />
          <Skeleton variant="rectangular" height={40} className="w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton variant="rectangular" height={40} className="flex-1" />
        <Skeleton variant="rectangular" height={40} className="flex-1" />
      </div>
    </div>
  )
}
