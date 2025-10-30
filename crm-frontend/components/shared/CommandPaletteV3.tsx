'use client'

/**
 * CommandPaletteV3 - Apple-Level Premium Design
 *
 * Design System Premium Alforis:
 * - Glassmorphism++ avec backdrop-blur 24px
 * - Multi-layer shadows (8 couches)
 * - Spring physics animations
 * - Micro-interactions subtiles
 * - Typography premium
 * - Icon glow effects
 * - Ambient reflections
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
import { useAiSuggestions } from '@/hooks/useAiSuggestions'
import { parseCommand, formatCommandSummary } from '@/lib/commandParser'
import { getHistory, addToHistory, type HistoryItem } from '@/lib/commandHistory'
import { analyzeClipboard, type ClipboardSuggestion } from '@/lib/clipboardDetection'
import { playSound, haptic, showConfetti, initFeedback, getFeedbackSettings, toggleSound, toggleHaptic } from '@/lib/feedback'

interface CommandPaletteV3Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPaletteV3({ open, onOpenChange }: CommandPaletteV3Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'command' | 'recent' | 'chainAction'>('command')
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [clipboardSuggestion, setClipboardSuggestion] = useState<ClipboardSuggestion | null>(null)
  const [recentItems, setRecentItems] = useState<HistoryItem[]>([])
  const [feedbackSettings, setFeedbackSettings] = useState(getFeedbackSettings())
  const inputRef = useRef<HTMLInputElement>(null)

  const { results, isSearching } = useGlobalSearch(search)
  const { suggestions: aiSuggestions, isLoading: aiLoading, intent, entities } = useAiSuggestions({
    query: search,
    enabled: open && search.length >= 2,
    debounceMs: 300,
  })
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

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop with vignette */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            onClick={() => {
              onOpenChange(false)
              playSound('close')
            }}
          >
            {/* Light gradient overlay - Apple style */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-sm" />

            {/* Ambient warm glow - animated */}
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  'radial-gradient(circle at 50% 50%, rgba(227, 159, 112, 0.08) 0%, transparent 60%)',
                  'radial-gradient(circle at 60% 40%, rgba(227, 159, 112, 0.12) 0%, transparent 60%)',
                  'radial-gradient(circle at 40% 60%, rgba(227, 159, 112, 0.08) 0%, transparent 60%)',
                  'radial-gradient(circle at 50% 50%, rgba(227, 159, 112, 0.08) 0%, transparent 60%)',
                ],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Command Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              duration: 0.2,
            }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
          >
            {/* Glassmorphism Premium Container */}
            <div className="relative">
              {/* Glow pulse animation */}
              <motion.div
                className="absolute inset-0 rounded-[20px]"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(227, 159, 112, 0.1)',
                    '0 0 30px rgba(227, 159, 112, 0.15)',
                    '0 0 20px rgba(227, 159, 112, 0.1)',
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              <Command
                className="relative rounded-[20px] overflow-hidden"
                style={{
                  backdropFilter: 'blur(40px) saturate(180%)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.90) 100%)',
                  border: '1px solid rgba(227, 159, 112, 0.15)',
                  boxShadow: `
                    0 0 0 1px rgba(255, 255, 255, 0.8),
                    0 2px 8px rgba(0, 0, 0, 0.04),
                    0 8px 24px rgba(0, 0, 0, 0.06),
                    0 16px 48px rgba(0, 0, 0, 0.08),
                    0 24px 72px rgba(227, 159, 112, 0.12)
                  `,
                }}
                shouldFilter={false}
              >
                {/* Subtle inner glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(227, 159, 112, 0.03) 0%, transparent 50%)',
                  }}
                />

                {/* Search Input */}
                <div className="relative flex items-center gap-3 px-6 py-4 border-b border-gray-200/50">
                  {mode === 'chainAction' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <ChevronRight className="w-6 h-6 text-orange-500 flex-shrink-0" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Search className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    </motion.div>
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
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 font-medium tracking-[0.02em] text-lg"
                    style={{ caretColor: '#E39F70' }}
                  />
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        toggleSound()
                        setFeedbackSettings(getFeedbackSettings())
                        haptic('light')
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100/80 transition-colors"
                      title={feedbackSettings.soundEnabled ? 'Désactiver sons' : 'Activer sons'}
                    >
                      {feedbackSettings.soundEnabled ? (
                        <Volume2 className="w-5 h-5 text-gray-500" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-gray-500" />
                      )}
                    </motion.button>
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100/80 rounded-lg border border-gray-200">
                      ESC
                    </kbd>
                  </div>
                </div>

                <Command.List className="max-h-[400px] overflow-y-auto p-3">
                  <Command.Empty className="py-12 text-center text-sm text-gray-500 font-normal">
                    {isSearching ? 'Recherche en cours...' : 'Aucun résultat trouvé.'}
                  </Command.Empty>

                  {/* Clipboard Suggestion */}
                  {!hasSearch && clipboardSuggestion && mode === 'command' && (
                    <Command.Group heading="📋 Presse-papiers" className="mb-2 px-2">
                      <div className="text-xs font-semibold text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        📋 Presse-papiers
                      </div>
                      <CommandItemV3
                        icon={Copy}
                        onSelect={() => runCommand(() => console.log('Clipboard action'), clipboardSuggestion.value)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium tracking-[0.02em] text-gray-900">
                            {clipboardSuggestion.action.label}
                          </span>
                          <span className="text-sm font-normal text-gray-500 leading-snug">
                            {clipboardSuggestion.action.description}
                          </span>
                        </div>
                      </CommandItemV3>
                    </Command.Group>
                  )}

                  {/* Calculator Result */}
                  {showCalculator && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-semibold text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        🧮 Calcul
                      </div>
                      <CommandItemV3
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
                          <span className="font-mono text-2xl text-gray-900 tracking-tight">
                            {parsedCommand.entities.calculation?.toLocaleString('fr-FR')}
                          </span>
                          <span className="text-sm font-normal text-gray-500 leading-snug">
                            Cliquer pour copier
                          </span>
                        </div>
                      </CommandItemV3>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {aiSuggestions.length > 0 && !showCalculator && mode === 'command' && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-semibold text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        🤖 Suggestions IA
                      </div>
                      {aiSuggestions.slice(0, 5).map((suggestion, idx) => (
                        <CommandItemV3
                          key={`ai-${idx}`}
                          icon={Sparkles}
                          onSelect={() => {
                            haptic('medium')
                            playSound('execute')

                            // Handle different suggestion types
                            if (suggestion.type === 'navigation' && suggestion.metadata?.url) {
                              router.push(suggestion.metadata.url)
                              onOpenChange(false)
                            } else if (suggestion.type === 'person' && suggestion.metadata?.person_id) {
                              router.push(`/dashboard/people/${suggestion.metadata.person_id}`)
                              onOpenChange(false)
                            } else if (suggestion.type === 'organisation' && suggestion.metadata?.organisation_id) {
                              router.push(`/dashboard/organisations/${suggestion.metadata.organisation_id}`)
                              onOpenChange(false)
                            } else {
                              // Generic action
                              console.log('AI Suggestion:', suggestion)
                              onOpenChange(false)
                            }

                            addToHistory({ query: search, type: 'action' })
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{suggestion.icon}</span>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium tracking-[0.02em] text-gray-900">
                                {suggestion.label}
                              </span>
                              <span className="text-sm font-normal text-gray-500 leading-snug">
                                {suggestion.description}
                              </span>
                            </div>
                          </div>
                        </CommandItemV3>
                      ))}
                    </div>
                  )}

                  {/* Recent Items */}
                  {mode === 'recent' && recentItems.length > 0 && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-medium text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        🕐 Récents
                      </div>
                      {recentItems.slice(0, 10).map((item) => (
                        <CommandItemV3
                          key={item.id}
                          icon={Clock}
                          onSelect={() => {
                            setSearch(item.query)
                            setMode('command')
                          }}
                        >
                          <span className="font-medium tracking-[0.02em] text-gray-900">
                            {item.query}
                          </span>
                        </CommandItemV3>
                      ))}
                    </div>
                  )}

                  {/* Search Results */}
                  {hasSearch && hasResults && mode === 'command' && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-medium text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        🔍 Résultats
                      </div>
                      {results.map((result) => (
                        <CommandItemV3
                          key={`${result.type}-${result.id}`}
                          icon={result.type === 'person' ? User : Building}
                          onSelect={() => handleSelect(result.data, result.type)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium tracking-[0.02em] text-gray-900">
                              {result.title}
                            </span>
                            {result.subtitle && (
                              <span className="text-sm font-normal text-gray-500 leading-snug">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </CommandItemV3>
                      ))}
                    </div>
                  )}

                  {/* Chain Actions */}
                  {mode === 'chainAction' && selectedEntity && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-medium text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        ⚡ Actions pour {selectedEntity.first_name || selectedEntity.name}
                      </div>
                      <CommandItemV3
                        icon={Mail}
                        onSelect={() => runCommand(() => console.log('Email'), `Email ${selectedEntity.name}`)}
                      >
                        Envoyer un email
                      </CommandItemV3>
                      <CommandItemV3
                        icon={Phone}
                        onSelect={() => runCommand(() => console.log('Call'), `Appeler ${selectedEntity.name}`)}
                      >
                        Créer tâche appel
                      </CommandItemV3>
                      <CommandItemV3
                        icon={Calendar}
                        onSelect={() => runCommand(() => console.log('Interaction'), `Interaction ${selectedEntity.name}`)}
                      >
                        Créer interaction
                      </CommandItemV3>
                    </div>
                  )}

                  {/* Quick Actions - Hide when searching */}
                  {!hasSearch && mode === 'command' && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-medium text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        ⚡ Actions rapides
                      </div>
                      <CommandItemV3
                        icon={Plus}
                        shortcut="⌘N"
                        onSelect={() => runCommand(() => router.push('/dashboard/people/new'), 'Nouvelle personne')}
                      >
                        Nouvelle personne
                      </CommandItemV3>
                      <CommandItemV3
                        icon={Building}
                        onSelect={() => runCommand(() => router.push('/dashboard/organisations/new'), 'Nouvelle organisation')}
                      >
                        Nouvelle organisation
                      </CommandItemV3>
                      <CommandItemV3
                        icon={CheckSquare}
                        shortcut="⌘T"
                        onSelect={() => runCommand(() => router.push('/dashboard/tasks'), 'Nouvelle tâche')}
                      >
                        Nouvelle tâche
                      </CommandItemV3>
                    </div>
                  )}

                  {/* Navigation */}
                  {!hasSearch && mode === 'command' && (
                    <div className="mb-2 px-2">
                      <div className="text-xs font-medium text-gray-400 tracking-[0.04em] uppercase mb-2 px-3">
                        🧭 Navigation
                      </div>
                      <CommandItemV3
                        icon={BarChart3}
                        onSelect={() => runCommand(() => router.push('/dashboard'), 'Dashboard', 'navigation')}
                      >
                        Dashboard
                      </CommandItemV3>
                      <CommandItemV3
                        icon={Users}
                        onSelect={() => runCommand(() => router.push('/dashboard/people'), 'Personnes', 'navigation')}
                      >
                        Personnes
                      </CommandItemV3>
                      <CommandItemV3
                        icon={Building}
                        onSelect={() => runCommand(() => router.push('/dashboard/organisations'), 'Organisations', 'navigation')}
                      >
                        Organisations
                      </CommandItemV3>
                    </div>
                  )}
                </Command.List>
              </Command>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// CommandItem V3 with Premium Design
interface CommandItemV3Props {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  onSelect: () => void
}

function CommandItemV3({ children, icon: Icon, shortcut, onSelect }: CommandItemV3Props) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="group flex items-center gap-3 px-4 py-3 mb-1 rounded-[12px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] text-gray-700 hover:text-gray-900 hover:bg-gray-50/80 hover:scale-[1.01] hover:shadow-[0_0_12px_rgba(227,159,112,0.15)] data-[selected=true]:bg-orange-50/50 data-[selected=true]:text-gray-900 data-[selected=true]:scale-[1.01] data-[selected=true]:translate-y-[-1px] data-[selected=true]:shadow-[0_0_16px_rgba(227,159,112,0.25),0_0_0_1px_rgba(227,159,112,0.3)]"
    >
      {Icon && (
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 group-hover:shadow-[0_0_12px_rgba(227,159,112,0.3)] transition-shadow"
        >
          <Icon className="w-6 h-6 text-orange-500 flex-shrink-0" />
        </motion.div>
      )}
      <span className="flex-1 font-medium tracking-[0.02em]">{children}</span>
      {shortcut && (
        <kbd className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100/80 rounded-lg border border-gray-200 group-data-[selected=true]:text-orange-600 group-data-[selected=true]:border-orange-300 group-data-[selected=true]:bg-orange-50">
          {shortcut}
        </kbd>
      )}
      <ArrowRight className="w-5 h-5 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity text-orange-500" />
    </Command.Item>
  )
}

// Hook export
export function useCommandPaletteV3() {
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
