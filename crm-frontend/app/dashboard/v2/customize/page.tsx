// app/dashboard-v2/customize/page.tsx
// ============= DASHBOARD V2 - Customization Page =============

'use client'

import React, { useState } from 'react'
import { Card, Button } from '@/components/shared'
import { Alert } from '@/components/shared/Alert'
import {
  WIDGET_DEFINITIONS,
  WIDGET_CATEGORIES,
} from '@/lib/dashboard/widgetDefinitions'
import type { WidgetType } from '@/lib/types/dashboard'
import {
  ArrowLeft,
  Plus,
  Settings,
  Save,
  RotateCcw,
  Eye,
  LayoutGrid,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardCustomizePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetType[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const categories = [
    { id: 'all', label: 'Tous', icon: '🎯' },
    ...Object.entries(WIDGET_CATEGORIES).map(([key, config]) => ({
      id: key,
      label: config.label,
      icon: config.icon,
    })),
  ]

  const availableWidgets = Object.values(WIDGET_DEFINITIONS).filter(
    (widget) => selectedCategory === 'all' || widget.category === selectedCategory
  )

  const toggleWidget = (widgetType: WidgetType) => {
    if (selectedWidgets.includes(widgetType)) {
      setSelectedWidgets(selectedWidgets.filter((w) => w !== widgetType))
    } else {
      setSelectedWidgets([...selectedWidgets, widgetType])
    }
  }

  const handleSave = () => {
    // Save to localStorage or API
    localStorage.setItem('dashboard_v2_widgets', JSON.stringify(selectedWidgets))
    alert('Configuration sauvegardée! Retournez au dashboard pour voir vos modifications.')
  }

  const handleReset = () => {
    setSelectedWidgets([])
    localStorage.removeItem('dashboard_v2_widgets')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/v2">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-ardoise flex items-center gap-2">
              <LayoutGrid className="h-8 w-8 text-purple-500" />
              Personnaliser le Dashboard
            </h1>
          </div>
          <p className="text-gray-600">
            Sélectionnez les widgets à afficher sur votre dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert
        type="info"
        message="💡 Astuce: Sélectionnez jusqu'à 8 widgets pour une expérience optimale. Vous pourrez les réorganiser directement sur le dashboard."
      />

      {/* Selected widgets summary */}
      {selectedWidgets.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-bleu" />
              <span className="font-medium text-bleu">
                {selectedWidgets.length} widget{selectedWidgets.length > 1 ? 's' : ''}{' '}
                sélectionné{selectedWidgets.length > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Masquer' : 'Aperçu'}
            </Button>
          </div>

          {showPreview && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex flex-wrap gap-2">
                {selectedWidgets.map((widgetType) => {
                  const widget = WIDGET_DEFINITIONS[widgetType]
                  return (
                    <div
                      key={widgetType}
                      className="px-3 py-1 bg-white rounded-full text-sm flex items-center gap-2 border border-blue-300"
                    >
                      <span>{widget.icon}</span>
                      <span>{widget.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Category Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Catégories:</span>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-bleu text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Widget Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableWidgets.map((widget) => {
          const isSelected = selectedWidgets.includes(widget.type)
          const categoryConfig = WIDGET_CATEGORIES[widget.category]

          return (
            <Card
              key={widget.type}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected
                  ? 'ring-2 ring-bleu bg-blue-50'
                  : 'hover:border-bleu'
              }`}
              onClick={() => toggleWidget(widget.type)}
            >
              <div className="p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-bleu to-purple-500 flex items-center justify-center text-2xl">
                      {widget.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ardoise">{widget.label}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${categoryConfig.color}-100 text-${categoryConfig.color}-700`}>
                        {categoryConfig.icon} {categoryConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-bleu border-bleu'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600">{widget.description}</p>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    <span>Taille: {widget.defaultSize}</span>
                  </div>
                  {widget.requiresConfig && (
                    <div className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      <span>Configurable</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Templates Section */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-ardoise mb-2">
              Templates prédéfinis
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Utilisez nos templates optimisés par rôle pour démarrer rapidement
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedWidgets([
                    'kpi_card',
                    'ai_insights',
                    'revenue_chart',
                    'top_clients',
                    'email_performance',
                    'activity_timeline',
                  ])
                }}
              >
                Template Executive
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedWidgets([
                    'kpi_card',
                    'hot_leads',
                    'tasks_kanban',
                    'recent_interactions',
                    'pipeline_funnel',
                  ])
                }}
              >
                Template Commercial
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedWidgets([
                    'revenue_chart',
                    'team_performance',
                    'pipeline_funnel',
                    'conversion_rate',
                    'forecast',
                  ])
                }}
              >
                Template Manager
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
