'use client'

/**
 * CommandPalette - Ultra-Premium Command Center
 * Inspired by Linear/Raycast - 10x productivity boost
 *
 * Features:
 * - ⌘K/Ctrl+K to open
 * - Global search (people, orgs, tasks)
 * - Quick actions (create, navigate)
 * - Fuzzy search with highlights
 * - Glassmorphism + smooth animations
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Search,
  Plus,
  Users,
  Building,
  CheckSquare,
  Settings,
  BarChart3,
  FileText,
  Calendar,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  Zap,
  User,
} from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { results, isSearching } = useGlobalSearch(search)

  // Close on Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange])

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  const hasSearch = search.length >= 2
  const hasResults = results.length > 0

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
        <Command
          className="rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-200/50 dark:border-slate-700/50">
            <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Rechercher ou taper une commande..."
              className="flex-1 py-4 bg-transparent border-none outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-12 text-center text-sm text-gray-500 dark:text-slate-400">
              {isSearching ? 'Recherche en cours...' : 'Aucun résultat trouvé.'}
            </Command.Empty>

            {/* Search Results */}
            {hasSearch && hasResults && (
              <Command.Group
                heading="Résultats"
                className="mb-2"
              >
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    icon={result.type === 'person' ? User : Building}
                    onSelect={() => runCommand(() => router.push(result.url))}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-gray-500 dark:text-slate-500">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions - Hide when searching */}
            {!hasSearch && (
              <Command.Group
                heading="Actions rapides"
                className="mb-2"
              >
              <CommandItem
                icon={Plus}
                shortcut="⌘N"
                onSelect={() => runCommand(() => router.push('/dashboard/people/new'))}
              >
                Nouvelle personne
              </CommandItem>
              <CommandItem
                icon={Building}
                onSelect={() => runCommand(() => router.push('/dashboard/organisations/new'))}
              >
                Nouvelle organisation
              </CommandItem>
              <CommandItem
                icon={CheckSquare}
                shortcut="⌘T"
                onSelect={() => runCommand(() => router.push('/dashboard/tasks'))}
              >
                Nouvelle tâche
              </CommandItem>
              <CommandItem
                icon={Calendar}
                onSelect={() => runCommand(() => console.log('Create interaction'))}
              >
                Nouvelle interaction
              </CommandItem>
            </Command.Group>
            )}

            {/* Navigation - Hide when searching */}
            {!hasSearch && (
              <Command.Group
                heading="Navigation"
                className="mb-2"
              >
              <CommandItem
                icon={BarChart3}
                onSelect={() => runCommand(() => router.push('/dashboard'))}
              >
                Dashboard
              </CommandItem>
              <CommandItem
                icon={Users}
                onSelect={() => runCommand(() => router.push('/dashboard/people'))}
              >
                Personnes
              </CommandItem>
              <CommandItem
                icon={Building}
                onSelect={() => runCommand(() => router.push('/dashboard/organisations'))}
              >
                Organisations
              </CommandItem>
              <CommandItem
                icon={CheckSquare}
                onSelect={() => runCommand(() => router.push('/dashboard/tasks'))}
              >
                Tâches
              </CommandItem>
              <CommandItem
                icon={FileText}
                onSelect={() => runCommand(() => router.push('/dashboard/mandats'))}
              >
                Mandats
              </CommandItem>
            </Command.Group>
            )}

            {/* Settings & Tools - Hide when searching */}
            {!hasSearch && (
              <Command.Group heading="Outils">
              <CommandItem
                icon={Settings}
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
              >
                Paramètres
              </CommandItem>
              <CommandItem
                icon={Mail}
                onSelect={() => runCommand(() => router.push('/dashboard/marketing/email-campaigns'))}
              >
                Campagnes email
              </CommandItem>
              <CommandItem
                icon={Sparkles}
                onSelect={() => runCommand(() => console.log('AI Assistant'))}
              >
                Assistant IA
              </CommandItem>
            </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </>
  )
}

// ============= COMMAND ITEM COMPONENT =============

interface CommandItemProps {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  onSelect: () => void
}

function CommandItem({ children, icon: Icon, shortcut, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-gray-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-500/10 dark:hover:to-purple-500/10 data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-blue-50 data-[selected=true]:to-purple-50 dark:data-[selected=true]:from-blue-500/10 dark:data-[selected=true]:to-purple-500/10 data-[selected=true]:text-gray-900 dark:data-[selected=true]:text-slate-100 group"
    >
      {Icon && (
        <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500 group-data-[selected=true]:text-blue-600 dark:group-data-[selected=true]:text-blue-400 flex-shrink-0 transition-colors" />
      )}
      <span className="flex-1 text-sm font-medium">{children}</span>
      {shortcut && (
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 group-data-[selected=true]:text-gray-600 dark:group-data-[selected=true]:text-slate-400 group-data-[selected=true]:bg-white dark:group-data-[selected=true]:bg-slate-700">
          {shortcut}
        </kbd>
      )}
      <ArrowRight className="w-4 h-4 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity text-gray-400 dark:text-slate-500" />
    </Command.Item>
  )
}

// ============= KEYBOARD HOOK =============

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return { open, setOpen }
}
