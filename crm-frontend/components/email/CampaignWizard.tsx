'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Save, Check, Mail, Users, Settings, FileText } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Alert } from '@/components/shared/Alert'
import { RecipientFilters, TargetType } from './RecipientSelectorTable'
import { Step1BasicInfo } from './wizard/Step1BasicInfo'
import { Step2Recipients } from './wizard/Step2Recipients'
import { Step3Configuration } from './wizard/Step3Configuration'
import { Step4Summary } from './wizard/Step4Summary'
import { logger } from '@/lib/logger'

type EmailProvider = 'resend' | 'sendgrid' | 'mailgun'

export interface CampaignFormData {
  name: string
  description: string
  produit_id: number | null
  template_id: number | null
  recipient_filters: RecipientFilters
  batch_size: number
  delay_between_batches: number
  from_name: string
  from_email: string
  provider: EmailProvider
}

interface CampaignWizardProps {
  initialData?: Partial<CampaignFormData>
  onSubmit: (data: CampaignFormData) => Promise<void>
  onSaveDraft?: (data: Partial<CampaignFormData>) => Promise<void>
  isSubmitting?: boolean
}

interface WizardStep {
  id: number
  title: string
  subtitle: string
  icon: React.ReactNode
}

const STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Informations',
    subtitle: 'Nom et produit',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 2,
    title: 'Destinataires',
    subtitle: 'Sélection du public',
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 3,
    title: 'Configuration',
    subtitle: "Paramètres d'envoi",
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: 4,
    title: 'Récapitulatif',
    subtitle: 'Validation finale',
    icon: <Check className="h-5 w-5" />,
  },
]

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  initialData,
  onSubmit,
  onSaveDraft,
  isSubmitting = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CampaignFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    produit_id: initialData?.produit_id || null,
    template_id: initialData?.template_id || null,
    recipient_filters: initialData?.recipient_filters || {
      target_type: 'contacts' as TargetType,
      languages: [],
      countries: [],
      organisation_categories: [],
    },
    batch_size: initialData?.batch_size || 600,
    delay_between_batches: initialData?.delay_between_batches || 60,
    from_name: initialData?.from_name || 'ALFORIS Finance',
    from_email: initialData?.from_email || 'contact@alforis.com',
    provider: initialData?.provider || 'resend',
  })
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [recipientCount, setRecipientCount] = useState(0)

  // Mettre à jour formData quand initialData change (restauration depuis localStorage)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // S'assurer que recipient_filters a une structure valide
        recipient_filters: initialData.recipient_filters || prev.recipient_filters,
      }))
      logger.log('✅ FormData mis à jour depuis initialData:', initialData)
    }
  }, [initialData])

  // Sauvegarde automatique toutes les 30 secondes
  useEffect(() => {
    if (!onSaveDraft) return

    const interval = setInterval(async () => {
      setIsSaving(true)
      try {
        await onSaveDraft(formData)
        setLastSaved(new Date())
      } catch (error) {
        logger.error('Auto-save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }, 30000) // 30 secondes

    return () => clearInterval(interval)
  }, [formData, onSaveDraft])

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    await onSubmit(formData)
  }

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        // Nom requis, produit et template optionnels
        return formData.name.trim() !== ''
      case 2:
        // Au moins 1 destinataire requis
        return recipientCount > 0
      case 3:
        return formData.from_name.trim() !== '' && formData.from_email.trim() !== ''
      default:
        return true
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            name={formData.name}
            description={formData.description}
            produit_id={formData.produit_id}
            template_id={formData.template_id}
            onChange={updateFormData}
          />
        )
      case 2:
        return (
          <Step2Recipients
            recipient_filters={formData.recipient_filters}
            onChange={(recipient_filters) => updateFormData({ recipient_filters })}
            onCountChange={setRecipientCount}
          />
        )
      case 3:
        return (
          <Step3Configuration
            provider={formData.provider}
            from_name={formData.from_name}
            from_email={formData.from_email}
            batch_size={formData.batch_size}
            delay_between_batches={formData.delay_between_batches}
            onChange={updateFormData}
          />
        )
      case 4:
        return (
          <Step4Summary
            name={formData.name}
            description={formData.description}
            produit_id={formData.produit_id}
            template_id={formData.template_id}
            recipient_filters={formData.recipient_filters}
            provider={formData.provider}
            from_name={formData.from_name}
            from_email={formData.from_email}
            batch_size={formData.batch_size}
            delay_between_batches={formData.delay_between_batches}
            recipientCount={recipientCount}
          />
        )
      default:
        return null
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="space-y-spacing-lg">
      {/* Barre de progression */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${
                      currentStep === step.id
                        ? 'bg-primary text-white shadow-lg scale-110'
                        : currentStep > step.id
                        ? 'bg-success text-white'
                        : 'bg-muted text-text-tertiary'
                    }
                  `}
                >
                  {currentStep > step.id ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-semibold ${
                      currentStep === step.id ? 'text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-text-tertiary hidden sm:block">{step.subtitle}</p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 mt-[-40px]">
                  <div
                    className={`h-full transition-all ${
                      currentStep > step.id ? 'bg-success' : 'bg-border'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Barre de progression simple en dessous */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Indicateur de sauvegarde */}
      {onSaveDraft && (
        <div className="flex items-center justify-end gap-2 text-xs text-text-tertiary">
          <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
          {isSaving ? (
            <span>Sauvegarde en cours...</span>
          ) : lastSaved ? (
            <span>Dernière sauvegarde : {lastSaved.toLocaleTimeString()}</span>
          ) : (
            <span>Sauvegarde automatique activée</span>
          )}
        </div>
      )}

      {/* Contenu de l'étape actuelle */}
      <Card>
        <CardHeader
          title={STEPS[currentStep - 1].title}
          subtitle={STEPS[currentStep - 1].subtitle}
          icon={STEPS[currentStep - 1].icon}
        />
        <CardBody>{renderStepContent()}</CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Précédent
        </Button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button
              variant="secondary"
              onClick={async () => {
                setIsSaving(true)
                try {
                  await onSaveDraft(formData)
                  setLastSaved(new Date())
                } catch (error) {
                  logger.error('Manual save failed:', error)
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}
            </Button>
          )}

          {currentStep < STEPS.length ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canGoNext()}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              leftIcon={<Mail className="h-4 w-4" />}
            >
              Créer la campagne
            </Button>
          )}
        </div>
      </div>

      {/* Message d'aide */}
      {!canGoNext() && currentStep < STEPS.length && (
        <Alert
          type="warning"
          message={
            currentStep === 1
              ? 'Veuillez renseigner le nom de la campagne pour continuer.'
              : currentStep === 2
              ? 'Veuillez sélectionner au moins 1 destinataire pour continuer.'
              : 'Veuillez remplir tous les champs requis pour continuer.'
          }
        />
      )}
    </div>
  )
}

export default CampaignWizard
