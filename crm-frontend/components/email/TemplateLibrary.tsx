'use client'

import React, { useMemo, useState } from 'react'
import { BookOpen, Copy, ExternalLink, Loader2, PlusCircle, Sparkles } from 'lucide-react'
import { useEmailTemplates } from '@/hooks/useEmailAutomation'
import type { EmailTemplate, EmailTemplateCategory } from '@/lib/types'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { logger } from '@/lib/logger'

interface TemplateLibraryProps {
  selectedTemplateId?: number | null
  onSelect?: (template: EmailTemplate) => void
  onDuplicate?: (template: EmailTemplate) => void
  onCreate?: () => void
  title?: string
  subtitle?: string
  className?: string
}

const CATEGORY_OPTIONS: { value: 'all' | EmailTemplateCategory; label: string }[] = [
  { value: 'all', label: 'Toutes les catégories' },
  { value: 'welcome', label: 'Bienvenue' },
  { value: 'follow_up', label: 'Relance' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'case_study', label: 'Cas d’usage' },
  { value: 'event', label: 'Événement' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'custom', label: 'Personnalisé' },
]

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  selectedTemplateId,
  onSelect,
  onDuplicate,
  onCreate,
  title = 'Bibliothèque de templates',
  subtitle = 'Centralisez et réutilisez vos modèles responsive : bienvenue, relance, newsletter…',
  className,
}) => {
  const { templates, isLoading, error, createTemplate, isCreating } = useEmailTemplates()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | EmailTemplateCategory>('all')
  const [feedback, setFeedback] = useState<string | null>(null)

  const categoriesFromData = useMemo(() => {
    const unique = Array.from(new Set(templates.map((tpl) => tpl.category)))
    return CATEGORY_OPTIONS.filter((option) => option.value === 'all' || unique.includes(option.value))
  }, [templates])

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return templates.filter((template) => {
      const matchesCategory = category === 'all' || template.category === category
      if (!matchesCategory) return false
      if (!term) return true
      return (
        template.name.toLowerCase().includes(term) ||
        (template.subject ?? '').toLowerCase().includes(term) ||
        (template.description ?? '').toLowerCase().includes(term)
      )
    })
  }, [category, search, templates])

  const handleSelect = (template: EmailTemplate) => {
    if (onSelect) onSelect(template)
  }

  const handlePreview = (template: EmailTemplate) => {
    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      previewWindow.document.write(template.html_content ?? '<p>Aucun contenu</p>')
      previewWindow.document.close()
    }
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    if (onDuplicate) {
      onDuplicate(template)
      return
    }

    try {
      await createTemplate({
        name: `${template.name} (copie)`,
        subject: template.subject,
        preheader: template.preheader ?? undefined,
        description: template.description ?? undefined,
        category: template.category,
        html_content: template.html_content,
        design_json: template.design_json ?? undefined,
        tags: template.tags ?? undefined,
        is_active: true,
      })
      setFeedback(`Template « ${template.name} » dupliqué avec succès.`)
      setTimeout(() => setFeedback(null), 2500)
    } catch (error) {
      logger.error('Erreur duplication template', error)
      setFeedback("Impossible de dupliquer le template. Réessayez plus tard.")
      setTimeout(() => setFeedback(null), 3500)
    }
  }

  const handleCreateBlankTemplate = () => {
    if (onCreate) {
      onCreate()
      return
    }

    createTemplate({
      name: `Nouveau template ${new Date().toLocaleDateString()}`,
      subject: 'Objet personnalisé',
      preheader: '',
      category: 'custom',
      html_content: '<h1>Nouveau template</h1><p>Ajoutez votre contenu…</p>',
    }).catch((error) => {
      logger.error('Erreur création template', error)
      setFeedback("Impossible de créer un template vide.")
      setTimeout(() => setFeedback(null), 3500)
    })
  }

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateBlankTemplate}
            isLoading={isCreating}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Nouveau template
          </Button>
        }
      />
      <CardBody className="space-y-spacing-md">
        {feedback && (
          <Alert type="success" title="Succès" message={feedback} />
        )}

        {error && (
          <Alert
            type="error"
            title="Erreur de chargement"
            message="Impossible de récupérer les templates emails. Vérifiez la connexion API."
          />
        )}

        <div className="grid gap-spacing-md md:grid-cols-12">
          <div className="md:col-span-6">
            <Input
              type="search"
              placeholder="Rechercher un template (nom, objet, description)…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as any)}
              options={categoriesFromData}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Chargement des templates…</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-radius-md border border-dashed border-border bg-muted/40 p-spacing-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-spacing-sm text-lg font-semibold text-text-primary">
              Aucun template trouvé
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Ajustez vos filtres ou créez un nouveau modèle pour démarrer vos campagnes.
            </p>
            <div className="mt-spacing-md flex justify-center gap-2">
              <Button variant="secondary" onClick={() => setSearch('')}>
                Réinitialiser la recherche
              </Button>
              <Button variant="primary" onClick={handleCreateBlankTemplate} leftIcon={<PlusCircle className="h-4 w-4" />}>
                Créer un template
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-spacing-md lg:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplateId === template.id
              return (
                <Card
                  key={template.id}
                  variant={isSelected ? 'elevated' : 'default'}
                  hoverable
                  className="flex flex-col"
                >
                  <CardBody className="flex flex-1 flex-col space-y-spacing-md p-spacing-md">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold text-text-primary">
                          {template.name}
                        </h4>
                        <p className="mt-1 text-xs uppercase tracking-wide text-text-tertiary">
                          {template.category.replace('_', ' ')}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-text-secondary">
                        <BookOpen className="h-3.5 w-3.5" />
                        Template #{template.id}
                      </span>
                    </div>

                    {template.description && (
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="rounded-radius-md border border-dashed border-border bg-muted/40 p-spacing-sm text-xs text-text-tertiary">
                      <p>
                        <span className="font-semibold text-text-secondary">Objet :</span>{' '}
                        {template.subject ?? '—'}
                      </p>
                      {template.preheader && (
                        <p>
                          <span className="font-semibold text-text-secondary">Préheader :</span>{' '}
                          {template.preheader}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={isSelected ? 'success' : 'primary'}
                        size="sm"
                        fullWidth
                        onClick={() => handleSelect(template)}
                      >
                        {isSelected ? 'Sélectionné' : 'Sélectionner'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        leftIcon={<ExternalLink className="h-4 w-4" />}
                      >
                        Aperçu
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(template)}
                        leftIcon={<Copy className="h-4 w-4" />}
                      >
                        Dupliquer
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default TemplateLibrary
