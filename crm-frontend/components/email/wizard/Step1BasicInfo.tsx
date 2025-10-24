'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Mail } from 'lucide-react'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Alert } from '@/components/shared/Alert'
import { HelpTooltip } from '@/components/help/HelpTooltip'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

interface Produit {
  id: number
  name: string
  isin?: string
  type: string
  status: string
  notes?: string
}

interface Step1BasicInfoProps {
  name: string
  description: string
  produit_id: number | null
  template_id: number | null
  onChange: (updates: { name?: string; description?: string; produit_id?: number | null; template_id?: number | null }) => void
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string
}

export const Step1BasicInfo: React.FC<Step1BasicInfoProps> = ({
  name,
  description,
  produit_id,
  template_id,
  onChange,
}) => {
  const [produits, setProduits] = useState<Produit[]>([])
  const [isLoadingProduits, setIsLoadingProduits] = useState(true)
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null)

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    const loadProduits = async () => {
      setIsLoadingProduits(true)
      try {
        const response = await apiClient.get<{ items: Produit[] }>('/produits', {
          params: { status: 'ACTIF' } // Charger uniquement les produits actifs
        })
        // L'API retourne un objet paginé avec { items: [...] }
        setProduits(response.data?.items || [])
      } catch (error) {
        logger.error('Failed to load produits:', error)
        setProduits([])
      } finally {
        setIsLoadingProduits(false)
      }
    }
    loadProduits()
  }, [])

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true)
      try {
        const response = await apiClient.get<EmailTemplate[]>('/email/templates')
        setTemplates(response.data || [])
      } catch (error) {
        logger.error('Failed to load templates:', error)
        setTemplates([])
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  useEffect(() => {
    if (produit_id) {
      const produit = produits.find(p => p.id === produit_id)
      setSelectedProduit(produit || null)
    } else {
      setSelectedProduit(null)
    }
  }, [produit_id, produits])

  useEffect(() => {
    if (template_id) {
      const template = templates.find(t => t.id === template_id)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [template_id, templates])

  return (
    <div className="space-y-spacing-lg">
      {/* Nom de la campagne */}
      <Input
        label="Nom de la campagne *"
        value={name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Ex: Campagne OPCVM Q1 2025"
        required
        helperText="Donnez un nom clair et descriptif à votre campagne"
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Description (optionnel)
        </label>
        <textarea
          value={description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Décrivez l'objectif de cette campagne marketing..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-radius-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
        />
      </div>

      {/* Sélection du produit financier (optionnel) */}
      <div className="space-y-spacing-sm">
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-medium text-text-primary">
            Produit financier (optionnel)
          </label>
          <HelpTooltip
            content="Associez cette campagne à un produit spécifique (OPCVM, fonds, assurance-vie) pour tracker les performances. Sans produit : campagne de prospection ou newsletter générique."
            learnMoreLink="/dashboard/help/guides/marketing#produits"
            size="sm"
          />
        </div>
        <p className="text-xs text-text-secondary mb-2">
          Sélectionnez un produit si cette campagne vise à promouvoir un produit spécifique. Laissez vide pour une campagne de prospection ou newsletter.
        </p>

        <Select
          value={produit_id?.toString() || ''}
          onChange={e => onChange({ produit_id: e.target.value ? Number(e.target.value) : null })}
          disabled={isLoadingProduits}
        >
          <option value="">Aucun produit (prospection/newsletter)</option>
          {produits.map(produit => (
            <option key={produit.id} value={produit.id}>
              {produit.name} {produit.isin ? `(${produit.isin})` : ''} - {produit.type}
            </option>
          ))}
        </Select>
      </div>

      {/* Sélection du template email (optionnel) */}
      <div className="space-y-spacing-sm">
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-medium text-text-primary">
            Template d'email (optionnel)
          </label>
          <HelpTooltip
            content="Le template définit le design et la structure de l'email. Choisissez un template existant, ou laissez vide pour auto-génération depuis les infos du produit (si sélectionné)."
            learnMoreLink="/dashboard/help/guides/marketing#templates"
            size="sm"
          />
        </div>
        <p className="text-xs text-text-secondary mb-2">
          Sélectionnez un template existant ou laissez vide pour génération automatique (si produit sélectionné).
        </p>

        <Select
          value={template_id?.toString() || ''}
          onChange={e => onChange({ template_id: e.target.value ? Number(e.target.value) : null })}
          disabled={isLoadingTemplates}
        >
          <option value="">
            {produit_id ? 'Auto-génération depuis le produit' : 'Sélectionner un template'}
          </option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>

        {templates.length === 0 && !isLoadingTemplates && (
          <Alert
            type="info"
            message="Aucun template disponible. Si un produit est sélectionné, le template sera généré automatiquement."
          />
        )}
      </div>

      {/* Informations sur le produit sélectionné */}
      {selectedProduit && (
        <div className="rounded-radius-md border border-border bg-primary/5 p-spacing-md space-y-spacing-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {selectedProduit.name}
              </p>
              <div className="flex gap-4 mt-1">
                {selectedProduit.isin && (
                  <p className="text-xs text-text-secondary">
                    ISIN : {selectedProduit.isin}
                  </p>
                )}
                <p className="text-xs text-text-secondary">
                  Type : {selectedProduit.type}
                </p>
              </div>
            </div>
          </div>

          {selectedProduit.notes && (
            <div className="border-t border-border pt-spacing-sm">
              <p className="text-xs font-medium text-text-secondary mb-1">Description :</p>
              <p className="text-xs text-text-primary whitespace-pre-wrap">
                {selectedProduit.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Aperçu du template sélectionné */}
      {selectedTemplate && (
        <div className="rounded-radius-md border border-border bg-muted/10 p-spacing-md space-y-spacing-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {selectedTemplate.name}
              </p>
              <p className="text-xs text-text-secondary">
                Sujet : {selectedTemplate.subject}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aide */}
      <Alert
        type="info"
        title="Types de campagnes"
        message="Avec produit : Campagne marketing + tracking KPI • Sans produit : Prospection/Newsletter • Template : Manuel ou auto-généré"
      />
    </div>
  )
}

export default Step1BasicInfo
