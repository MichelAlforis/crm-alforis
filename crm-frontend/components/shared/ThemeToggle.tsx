'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md'
}

export default function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

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
    'inline-flex items-center justify-center rounded-xl border border-transparent transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background'

  const sizeClasses =
    size === 'sm' ? 'p-2 text-sm' : 'p-2.5 text-base'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        baseClasses,
        sizeClasses,
        'bg-muted/70 hover:bg-muted dark:bg-slate-800/70 dark:hover:bg-slate-700',
        'text-text-secondary dark:text-slate-200',
        className
      )}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      aria-pressed={isDark}
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
