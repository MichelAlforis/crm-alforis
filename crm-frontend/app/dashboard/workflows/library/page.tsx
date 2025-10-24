'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { useWorkflowTemplates } from '@/hooks/useWorkflowTemplates'
import { WorkflowTemplateCard } from '@/components/workflows/WorkflowTemplateCard'

export default function WorkflowLibraryPage() {
  const router = useRouter()
  const {
    templates,
    isLoading,
    filterTemplates,
    stats,
    duplicateTemplate,
    operation,
  } = useWorkflowTemplates()

  // États des filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTrigger, setSelectedTrigger] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [showPreview, setShowPreview] = useState<number | null>(null)

  // Filtrage avec le hook
  const filteredTemplates = useMemo(() => {
    return filterTemplates({
      search: searchQuery,
      category: selectedCategory,
      trigger: selectedTrigger,
      difficulty: selectedDifficulty,
    })
  }, [filterTemplates, searchQuery, selectedCategory, selectedTrigger, selectedDifficulty])

  // Handler duplication
  const handleDuplicate = async (id: number) => {
    try {
      const newWorkflow = await duplicateTemplate(id)
      router.push(`/dashboard/workflows/${newWorkflow.id}`)
    } catch (error) {
      console.error('Erreur duplication:', error)
    }
  }

  // Reset filtres
  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedTrigger !== 'all' || selectedDifficulty !== 'all'
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedTrigger('all')
    setSelectedDifficulty('all')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/workflows')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="text-purple-600" />
                  Bibliothèque de Workflows
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {stats.total} templates prêts à l'emploi pour votre activité B2B
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
              <Sparkles className="text-purple-600" size={20} />
              <span className="text-sm font-medium text-purple-900">
                {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''} trouvé{filteredTemplates.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un template (nom, tags, use case, trigger...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Filtres */}
          <aside className="w-64 flex-shrink-0 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-32">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter size={18} />
                  Filtres
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Catégories */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Toutes ({stats.total})</option>
                  {Object.entries(stats.categories).map(([cat, count]) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Triggers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Déclencheur</label>
                <select
                  value={selectedTrigger}
                  onChange={(e) => setSelectedTrigger(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tous</option>
                  {Object.entries(stats.triggers).map(([trigger, count]) => (
                    <option key={trigger} value={trigger}>
                      {trigger.replace(/_/g, ' ')} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulté */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Toutes</option>
                  {Object.entries(stats.difficulties).map(([diff, count]) => (
                    <option key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)} ({count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* Grid de templates */}
          <main className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement des templates...</p>
                </div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun template trouvé</h3>
                <p className="text-gray-600 mb-4">
                  {hasActiveFilters
                    ? 'Essayez de modifier vos filtres ou votre recherche'
                    : 'Aucun template disponible pour le moment'
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                  <WorkflowTemplateCard
                    key={template.id}
                    template={template}
                    onDuplicate={handleDuplicate}
                    onPreview={(id) => setShowPreview(id)}
                    isLoading={operation.isLoading}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
