'use client'

import React, { useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md'
}

export default function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = React.useMemo(() => {
    if (!mounted) {
      return false
    }
    if (theme === 'system') {
      return resolvedTheme === 'dark'
    }
    return theme === 'dark'
  }, [mounted, theme, resolvedTheme])

  const toggleTheme = () => {
    if (isDark) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  const baseClasses =
    'flex items-center justify-center rounded-xl border border-transparent transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background'

  const sizeClasses =
    size === 'sm' ? 'w-10 h-10' : 'w-11 h-11'

  const tooltipLabel = isDark ? 'Mode clair' : 'Mode sombre'

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={toggleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={clsx(
          baseClasses,
          sizeClasses,
          'rounded-lg hover:bg-white/80 dark:hover:bg-slate-700/80 hover:scale-110 active:scale-95',
          'text-slate-600 dark:text-slate-300',
          className
        )}
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        aria-pressed={isDark}
      >
        <div className="relative w-5 h-5">
          {mounted && (
            <>
              <Sun
                className={clsx(
                  'w-5 h-5 absolute inset-0 transition-all duration-300',
                  isDark
                    ? 'opacity-0 scale-0 rotate-90'
                    : 'opacity-100 scale-100 rotate-0'
                )}
              />
              <Moon
                className={clsx(
                  'w-5 h-5 absolute inset-0 transition-all duration-300',
                  isDark
                    ? 'opacity-100 scale-100 rotate-0'
                    : 'opacity-0 scale-0 -rotate-90'
                )}
              />
            </>
          )}
          {!mounted && <Moon className="w-5 h-5" />}
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && mounted && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap border border-slate-700/50">
            {tooltipLabel}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700/50 rotate-45" />
          </div>
        </div>
      )}
    </div>
  )
}
