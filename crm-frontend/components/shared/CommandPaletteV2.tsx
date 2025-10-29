'use client'

/**
 * CommandPaletteV2 - Intelligence Layer
 *
 * Features:
 * - Natural language parsing ("créer tâche appeler john demain")
 * - Calculator intégré (50000 * 0.02 = 1000)
 * - Clipboard detection (email/phone/url)
 * - Recent items (⌘.)
 * - Actions en chaîne (>)
 * - Quick Look preview
 * - Sound effects + Haptic
 * - AI Suggestions
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
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
  User,
  Calculator,
  Clock,
  Copy,
  Zap,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { parseCommand, formatCommandSummary } from '@/lib/commandParser'
import { getHistory, addToHistory, type HistoryItem } from '@/lib/commandHistory'
import { analyzeClipboard, type ClipboardSuggestion } from '@/lib/clipboardDetection'
import { playSound, haptic, showConfetti, initFeedback, getFeedbackSettings, toggleSound, toggleHaptic } from '@/lib/feedback'

interface CommandPaletteV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPaletteV2({ open, onOpenChange }: CommandPaletteV2Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'command' | 'recent' | 'chainAction'>('command')
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [clipboardSuggestion, setClipboardSuggestion] = useState<ClipboardSuggestion | null>(null)
  const [recentItems, setRecentItems] = useState<HistoryItem[]>([])
  const [feedbackSettings, setFeedbackSettings] = useState(getFeedbackSettings())
  const inputRef = useRef<HTMLInputElement>(null)

  const { results, isSearching } = useGlobalSearch(search)
  const parsedCommand = parseCommand(search)

  // Initialize feedback system
  useEffect(() => {
    initFeedback()
  }, [])

  // Load recent items and clipboard on open
  useEffect(() => {
    if (open) {
      playSound('open')
      haptic('light')
      setRecentItems(getHistory())
      analyzeClipboard().then(setClipboardSuggestion)
    } else {
      setSearch('')
      setMode('command')
      setSelectedEntity(null)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'chainAction') {
          setMode('command')
          setSelectedEntity(null)
        } else {
          onOpenChange(false)
          playSound('close')
        }
      }

      // ⌘. for recent
      if (e.key === '.' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setMode('recent')
        setSearch('')
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange, mode])

  // Detect chain action mode (>)
  useEffect(() => {
    if (search.startsWith('>') && selectedEntity) {
      setMode('chainAction')
    } else if (mode === 'chainAction' && !search.startsWith('>')) {
      setMode('command')
    }
  }, [search, selectedEntity, mode])

  const runCommand = useCallback((command: () => void, query: string, type: HistoryItem['type'] = 'action') => {
    haptic('medium')
    playSound('execute')

    // Add to history
    addToHistory({ query, type })

    onOpenChange(false)
    command()
  }, [onOpenChange])

  const handleSelect = useCallback((item: any, type: 'person' | 'organisation') => {
    haptic('light')
    playSound('select')

    // Store selected entity for chain actions
    setSelectedEntity({ ...item, type })
    setSearch('>')

    // Add to history
    addToHistory({
      query: type === 'person' ? `${item.first_name} ${item.last_name}` : item.name,
      type: 'search',
      metadata: {
        entityId: item.id,
        entityType: type,
      },
    })
  }, [])

  const hasSearch = search.length >= 2 && !search.startsWith('>')
  const hasResults = results.length > 0
  const showCalculator = parsedCommand.intent === 'calculate'
  const showParsedCommand = parsedCommand.intent !== 'search' && parsedCommand.intent !== 'unknown' && parsedCommand.confidence > 0.6

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => {
          onOpenChange(false)
          playSound('close')
        }}
      />

      {/* Command Palette */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 300,
        }}
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
      >
        <Command
          className="rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden"
          style={{
            boxShadow: `
              0 0 0 1px rgba(0,0,0,0.05),
              0 2px 4px rgba(0,0,0,0.05),
              0 8px 16px rgba(0,0,0,0.08),
              0 16px 32px rgba(0,0,0,0.08),
              0 24px 48px rgba(0,0,0,0.1)
            `,
          }}
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-200/50 dark:border-slate-700/50">
            {mode === 'chainAction' ? (
              <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-pulse" />
            ) : (
              <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
            )}
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder={
                mode === 'chainAction'
                  ? `Actions pour ${selectedEntity?.first_name || selectedEntity?.name}...`
                  : mode === 'recent'
                    ? 'Historique récent...'
                    : 'Rechercher, calculer, ou créer...'
              }
              className="flex-1 py-4 bg-transparent border-none outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const enabled = toggleSound()
                  setFeedbackSettings(getFeedbackSettings())
                  haptic('light')
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title={feedbackSettings.soundEnabled ? 'Désactiver sons' : 'Activer sons'}
              >
                {feedbackSettings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                )}
              </button>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                ESC
              </kbd>
            </div>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-12 text-center text-sm text-gray-500 dark:text-slate-400">
              {isSearching ? 'Recherche en cours...' : 'Aucun résultat trouvé.'}
            </Command.Empty>

            {/* Clipboard Suggestion */}
            {!hasSearch && clipboardSuggestion && mode === 'command' && (
              <Command.Group heading="📋 Presse-papiers" className="mb-2">
                <CommandItemV2
                  icon={Copy}
                  onSelect={() => runCommand(() => console.log('Clipboard action'), clipboardSuggestion.value)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>{clipboardSuggestion.action.label}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      {clipboardSuggestion.action.description}
                    </span>
                  </div>
                </CommandItemV2>
              </Command.Group>
            )}

            {/* Calculator Result */}
            {showCalculator && (
              <Command.Group heading="🧮 Calcul" className="mb-2">
                <CommandItemV2
                  icon={Calculator}
                  onSelect={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(parsedCommand.entities.calculation?.toString() || '')
                      haptic('success')
                      playSound('execute')
                    }
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-lg">
                      {parsedCommand.entities.calculation?.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      Cliquer pour copier
                    </span>
                  </div>
                </CommandItemV2>
              </Command.Group>
            )}

            {/* Parsed Command Suggestion */}
            {showParsedCommand && !showCalculator && (
              <Command.Group heading="💡 Suggestion intelligente" className="mb-2">
                <CommandItemV2
                  icon={Sparkles}
                  onSelect={() => runCommand(() => console.log('Execute parsed command', parsedCommand), search)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>{formatCommandSummary(parsedCommand)}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      {Math.round(parsedCommand.confidence * 100)}% de confiance
                    </span>
                  </div>
                </CommandItemV2>
              </Command.Group>
            )}

            {/* Recent Items */}
            {mode === 'recent' && recentItems.length > 0 && (
              <Command.Group heading="🕐 Récents" className="mb-2">
                {recentItems.slice(0, 10).map((item) => (
                  <CommandItemV2
                    key={item.id}
                    icon={Clock}
                    onSelect={() => {
                      setSearch(item.query)
                      setMode('command')
                    }}
                  >
                    {item.query}
                  </CommandItemV2>
                ))}
              </Command.Group>
            )}

            {/* Search Results */}
            {hasSearch && hasResults && mode === 'command' && (
              <Command.Group heading="🔍 Résultats" className="mb-2">
                {results.map((result) => (
                  <CommandItemV2
                    key={`${result.type}-${result.id}`}
                    icon={result.type === 'person' ? User : Building}
                    onSelect={() => handleSelect(result.data, result.type)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-gray-500 dark:text-slate-500">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItemV2>
                ))}
              </Command.Group>
            )}

            {/* Chain Actions */}
            {mode === 'chainAction' && selectedEntity && (
              <Command.Group heading={`⚡ Actions pour ${selectedEntity.first_name || selectedEntity.name}`} className="mb-2">
                <CommandItemV2
                  icon={Mail}
                  onSelect={() => runCommand(() => console.log('Email'), `Email ${selectedEntity.name}`)}
                >
                  Envoyer un email
                </CommandItemV2>
                <CommandItemV2
                  icon={Phone}
                  onSelect={() => runCommand(() => console.log('Call'), `Appeler ${selectedEntity.name}`)}
                >
                  Créer tâche appel
                </CommandItemV2>
                <CommandItemV2
                  icon={Calendar}
                  onSelect={() => runCommand(() => console.log('Interaction'), `Interaction ${selectedEntity.name}`)}
                >
                  Créer interaction
                </CommandItemV2>
              </Command.Group>
            )}

            {/* Quick Actions - Hide when searching */}
            {!hasSearch && mode === 'command' && (
              <Command.Group heading="⚡ Actions rapides" className="mb-2">
                <CommandItemV2
                  icon={Plus}
                  shortcut="⌘N"
                  onSelect={() => runCommand(() => router.push('/dashboard/people/new'), 'Nouvelle personne')}
                >
                  Nouvelle personne
                </CommandItemV2>
                <CommandItemV2
                  icon={Building}
                  onSelect={() => runCommand(() => router.push('/dashboard/organisations/new'), 'Nouvelle organisation')}
                >
                  Nouvelle organisation
                </CommandItemV2>
                <CommandItemV2
                  icon={CheckSquare}
                  shortcut="⌘T"
                  onSelect={() => runCommand(() => router.push('/dashboard/tasks'), 'Nouvelle tâche')}
                >
                  Nouvelle tâche
                </CommandItemV2>
              </Command.Group>
            )}

            {/* Navigation */}
            {!hasSearch && mode === 'command' && (
              <Command.Group heading="🧭 Navigation" className="mb-2">
                <CommandItemV2
                  icon={BarChart3}
                  onSelect={() => runCommand(() => router.push('/dashboard'), 'Dashboard', 'navigation')}
                >
                  Dashboard
                </CommandItemV2>
                <CommandItemV2
                  icon={Users}
                  onSelect={() => runCommand(() => router.push('/dashboard/people'), 'Personnes', 'navigation')}
                >
                  Personnes
                </CommandItemV2>
                <CommandItemV2
                  icon={Building}
                  onSelect={() => runCommand(() => router.push('/dashboard/organisations'), 'Organisations', 'navigation')}
                >
                  Organisations
                </CommandItemV2>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </motion.div>
    </>
  )
}

// CommandItem V2 with animations
interface CommandItemV2Props {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  onSelect: () => void
}

function CommandItemV2({ children, icon: Icon, shortcut, onSelect }: CommandItemV2Props) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-gray-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-500/10 dark:hover:to-purple-500/10 data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-blue-50 data-[selected=true]:to-purple-50 dark:data-[selected=true]:from-blue-500/10 dark:data-[selected=true]:to-purple-500/10 data-[selected=true]:text-gray-900 dark:data-[selected=true]:text-slate-100 group"
    >
      {Icon && (
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500 group-data-[selected=true]:text-blue-600 dark:group-data-[selected=true]:text-blue-400 flex-shrink-0 transition-colors" />
        </motion.div>
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

// Hook export
export function useCommandPaletteV2() {
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
