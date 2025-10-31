'use client'

import dynamic from 'next/dynamic'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/shared/Button'
import { Card, CardBody, CardHeader } from '@/components/shared/Card'
import { Alert } from '@/components/shared/Alert'
import { Copy, Download, Eye, Layers, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { logger } from '@/lib/logger'

const ReactEmailEditor = dynamic(() => {
  logger.log('⚡ EmailEditor: Tentative de chargement du module react-email-editor')
  return import('react-email-editor').then((module) => {
    logger.log('✅ EmailEditor: Module react-email-editor chargé')
    return module
  }).catch((error) => {
    logger.error('❌ EmailEditor: Erreur lors du chargement du module:', error)
    throw error
  })
}, {
  ssr: false,
  loading: () => {
    logger.log('⏳ EmailEditor: Affichage du loader...')
    return (
      <div className="flex h-96 items-center justify-center gap-3 rounded-radius-md border border-dashed border-border text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Initialisation de l'éditeur email…</span>
      </div>
    )
  },
})

type EmailEditorRef = {
  editor?: {
    loadDesign: (design: Record<string, any>) => void
    loadHtml: (html: string) => void
    exportHtml: (callback: (data: { design: Record<string, any>; html: string }) => void) => void
    addEventListener: (event: string, handler: () => void) => void
    removeEventListener: (event: string, handler: () => void) => void
  }
} | null

export interface EmailEditorValue {
  html: string
  design?: Record<string, any> | null
}

interface VariableToken {
  label: string
  value: string
  description?: string
}

interface EmailEditorProps {
  value?: EmailEditorValue
  title?: string
  subtitle?: string
  availableVariables?: VariableToken[]
  readOnly?: boolean
  height?: number
  className?: string
  onChange?: (value: EmailEditorValue) => void
  onPreview?: (value: EmailEditorValue) => void
}

const DEFAULT_VARIABLES: VariableToken[] = [
  { label: 'Organisation · Nom', value: '{{organisation.nom}}' },
  { label: 'Organisation · Secteur', value: '{{organisation.secteur}}' },
  { label: 'Contact · Prénom', value: '{{contact.prenom}}' },
  { label: 'Contact · Nom', value: '{{contact.nom}}' },
  { label: 'Contact · Fonction', value: '{{contact.fonction}}' },
  { label: 'Lien désinscription', value: '{{system.unsubscribe_url}}' },
]

export const EmailEditor: React.FC<EmailEditorProps> = ({
  value,
  title = 'Éditeur email',
  subtitle = 'Créez ou personnalisez vos templates responsive en drag & drop.',
  availableVariables = DEFAULT_VARIABLES,
  readOnly = false,
  height = 620,
  className,
  onChange,
  onPreview,
}) => {
  const editorRef = useRef<EmailEditorRef>(null)
  const lastLoadedSignature = useRef<string | null>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const serializedValue = useMemo(() => {
    if (!value) return null
    return JSON.stringify({
      html: value.html ?? '',
      design: value.design ? JSON.stringify(value.design) : null,
    })
  }, [value])

  const loadInitialContent = useCallback(
    (force = false) => {
      if (!editorRef.current?.editor || !isEditorReady) {
        return
      }

      if (!value) {
        return
      }

      const signature = serializedValue
      if (!force && signature && lastLoadedSignature.current === signature) {
        return
      }

      try {
        if (value.design) {
          editorRef.current.editor?.loadDesign(value.design)
        } else if (value.html) {
          editorRef.current.editor?.loadHtml(value.html)
        }
        lastLoadedSignature.current = signature
      } catch (error) {
        logger.error('Impossible de charger le design email', error)
      }
    },
    [isEditorReady, serializedValue, value]
  )

  const exportContent = useCallback(async (): Promise<EmailEditorValue | null> => {
    if (!editorRef.current?.editor) {
      return value ?? null
    }

    return new Promise((resolve, reject) => {
      try {
        editorRef.current?.editor?.exportHtml(({ design, html }) => {
          resolve({
            html,
            design,
          })
        })
      } catch (error) {
        reject(error)
      }
    })
  }, [value])

  const handleEditorLoaded = useCallback(() => {
    logger.log('✅ EmailEditor: Éditeur chargé!')
    setIsEditorReady(true)
    loadInitialContent(true)
  }, [loadInitialContent])

  useEffect(() => {
    if (!isEditorReady) return
    loadInitialContent(false)
  }, [isEditorReady, loadInitialContent, serializedValue])

  useEffect(() => {
    if (!editorRef.current?.editor || !onChange) {
      return
    }

    const handler = () => {
      exportContent().then((content) => {
        if (content) {
          onChange(content)
        }
      })
    }

    editorRef.current.editor.addEventListener('design:updated', handler)
    return () => {
      try {
        editorRef.current?.editor?.removeEventListener('design:updated', handler)
      } catch {
        // ignore
      }
    }
  }, [exportContent, onChange])

  const handleManualSave = useCallback(async () => {
    if (!onChange) {
      return
    }
    setIsExporting(true)
    try {
      const content = await exportContent()
      if (content) {
        onChange(content)
      }
    } finally {
      setIsExporting(false)
    }
  }, [exportContent, onChange])

  const handlePreview = useCallback(async () => {
    const content = await exportContent()
    if (!content) return

    if (onPreview) {
      onPreview(content)
      return
    }

    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      previewWindow.document.write(content.html ?? '<p>Aucun contenu</p>')
      previewWindow.document.close()
    }
  }, [exportContent, onPreview])

  const handleInsertVariable = useCallback(async (token: VariableToken) => {
    try {
      await navigator.clipboard.writeText(token.value)
      setCopyMessage(`Variable ${token.label} copiée dans le presse-papiers`)
      setTimeout(() => setCopyMessage(null), 2500)
    } catch {
      setCopyMessage("Impossible de copier la variable, utilisez Ctrl+C/Cmd+C.")
      setTimeout(() => setCopyMessage(null), 2500)
    }
  }, [])

  if (readOnly) {
    return (
      <Card className={className}>
        <CardHeader title={title} subtitle={subtitle} />
        <CardBody className="space-y-spacing-md">
          <Alert
            type="info"
            title="Mode lecture"
            message="L'édition est désactivée pour ce template. Activez le mode édition pour modifier son contenu."
          />
          <div
            className="prose prose-sm max-w-none rounded-radius-md border border-dashed border-border bg-muted/40 p-spacing-md"
            dangerouslySetInnerHTML={{ __html: value?.html ?? '<p>Aucun contenu disponible.</p>' }}
          />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadInitialContent(true)}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Recharger
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreview}
              leftIcon={<Eye className="h-4 w-4" />}
            >
              Aperçu
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSave}
              isLoading={isExporting}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Enregistrer
            </Button>
          </div>
        }
      />
      <CardBody className="space-y-spacing-lg">
        <div className="space-y-2 rounded-radius-md border border-dashed border-border bg-muted/40 p-spacing-md">
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Layers className="h-4 w-4 text-text-tertiary" />
            Variables dynamiques
          </div>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((token) => (
              <Button
                key={token.value}
                variant="ghost"
                size="xs"
                onClick={() => handleInsertVariable(token)}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                className="border border-border bg-white dark:bg-slate-900/60 text-xs text-text-secondary transition hover:bg-white hover:text-text-primary"
              >
                {token.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary">
            Copiez la variable puis collez-la dans l'éditeur au bon endroit. Elle sera automatiquement remplacée par la donnée réelle lors de l'envoi.
          </p>
          {copyMessage && (
            <div className="flex items-center gap-2 text-xs text-success">
              <Sparkles className="h-3.5 w-3.5" />
              {copyMessage}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-radius-lg border border-border">
          <ReactEmailEditor
            ref={editorRef as any}
            minHeight={height}
            onLoad={handleEditorLoaded}
            options={{
              displayMode: 'web',
              safeHtml: true,
              mergeTags: availableVariables.map((token) => ({
                name: token.label,
                value: token.value,
              })),
            }}
          />
        </div>

        {!isEditorReady && (
          <Alert
            type="info"
            message="Chargement de l'éditeur… Cela peut prendre quelques secondes la première fois."
          />
        )}
      </CardBody>
    </Card>
  )
}

export default EmailEditor
