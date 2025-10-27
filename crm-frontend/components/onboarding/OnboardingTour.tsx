// components/onboarding/OnboardingTour.tsx
// Tour guidé d'onboarding pour les nouveaux utilisateurs

'use client'

import React from 'react'
import { TourProvider, useTour } from '@reactour/tour'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR_STEPS = [
  {
    selector: 'body',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">👋</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenue sur ALFORIS CRM
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Découvrons ensemble les 4 sections essentielles pour démarrer efficacement.
            </p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm text-blue-900 font-medium">
            ⏱️ 60 secondes • 4 étapes
          </p>
        </div>
      </div>
    ),
    position: 'center',
  },
  {
    selector: '[data-tour="crm-section"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">1. Module CRM</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">
          <strong className="text-gray-900">Organisations</strong> : Gérez clients, distributeurs, partenaires
        </p>
        <p className="text-gray-700 leading-relaxed">
          <strong className="text-gray-900">Contacts</strong> : Suivez les personnes clés (directeurs, gérants)
        </p>
        <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border-l-4 border-blue-500">
          <p className="text-sm text-blue-900">
            💡 <strong>Astuce</strong> : Cliquez sur "CRM" pour développer le sous-menu
          </p>
        </div>
      </div>
    ),
    position: 'right',
  },
  {
    selector: '[data-tour="automation-section"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">⚡</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">2. Automatisation</h3>
        </div>
        <p className="text-gray-700 leading-relaxed mb-3">
          Gagnez du temps avec nos outils d'automatisation :
        </p>
        <div className="space-y-2.5">
          <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
            <p className="font-semibold text-purple-900 text-sm mb-1">⚡ Workflows</p>
            <ul className="space-y-1 text-xs text-purple-800">
              <li className="flex items-start gap-1.5">
                <span className="text-purple-500 mt-0.5">✓</span>
                <span>Relances automatiques de mandats</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-purple-500 mt-0.5">✓</span>
                <span>Création de tâches sur événements</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-purple-500 mt-0.5">✓</span>
                <span>20+ templates prêts à l'emploi</span>
              </li>
            </ul>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border-l-4 border-emerald-500">
            <p className="font-semibold text-emerald-900 text-sm mb-1">🤖 Agent IA</p>
            <ul className="space-y-1 text-xs text-emerald-800">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Suggestions intelligentes d'actions</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Rédaction d'emails personnalisés</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-purple-900 font-medium">
            💡 Cliquez sur "Automatisation" pour développer le sous-menu
          </p>
        </div>
      </div>
    ),
    position: 'right',
  },
  {
    selector: '[data-tour="marketing-section"]',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">📧</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">3. Marketing Email</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Créez des campagnes professionnelles en 3 étapes :
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-2.5">
            <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span className="text-sm font-medium text-gray-700">Sélectionnez vos contacts</span>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-2.5">
            <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span className="text-sm font-medium text-gray-700">Personnalisez votre template</span>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-2.5">
            <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span className="text-sm font-medium text-gray-700">Suivez les performances en temps réel</span>
          </div>
        </div>
      </div>
    ),
    position: 'right',
  },
  {
    selector: '[data-tour="help-link"]',
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">❓</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">4. Centre d'Aide</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Tout ce dont vous avez besoin pour devenir expert :
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-xs font-semibold text-amber-900">53 FAQ</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
            <div className="text-2xl mb-1">📖</div>
            <div className="text-xs font-semibold text-orange-900">9 Guides</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
            <div className="text-2xl mb-1">💡</div>
            <div className="text-xs font-semibold text-yellow-900">16 Tooltips</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
            <div className="text-2xl mb-1">🎥</div>
            <div className="text-xs font-semibold text-red-900">Tutoriels</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-bold text-lg">Vous êtes prêt !</p>
              <p className="text-sm text-blue-100">Commencez dès maintenant</p>
            </div>
          </div>
          <p className="text-xs text-blue-100 mt-2">
            💡 Astuce : Survolez les champs avec <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">❓</span> pour des infos contextuelles
          </p>
        </div>
      </div>
    ),
    position: 'right',
  },
]

function TourController() {
  const { setIsOpen, currentStep, setCurrentStep } = useTour()
  const onboarding = useOnboarding({
    steps: TOUR_STEPS,
    storageKey: 'dashboard-onboarding-completed',
    autoStart: false, // Désactivé car géré par BannerManager
  })

  // Écouter l'événement du BannerManager
  React.useEffect(() => {
    const handleStartOnboarding = () => {
      onboarding.start()
    }

    window.addEventListener('start-onboarding', handleStartOnboarding)
    return () => window.removeEventListener('start-onboarding', handleStartOnboarding)
  }, [onboarding])

  React.useEffect(() => {
    setIsOpen(onboarding.isActive)
  }, [onboarding.isActive, setIsOpen])

  React.useEffect(() => {
    setCurrentStep(onboarding.currentStep)
  }, [onboarding.currentStep, setCurrentStep])

  // Synchro currentStep du tour avec notre hook
  React.useEffect(() => {
    if (currentStep !== onboarding.currentStep) {
      onboarding.goToStep(currentStep)
    }
  }, [currentStep])

  return null
}

interface OnboardingTourProps {
  children: React.ReactNode
}

export function OnboardingTour({ children }: OnboardingTourProps) {
  return (
    <TourProvider
      steps={TOUR_STEPS}
      showBadge={false}
      showNavigation={true}
      showCloseButton={true}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          maxWidth: '400px',
        }),
        badge: (base) => ({
          ...base,
          backgroundColor: '#3B82F6',
        }),
        controls: (base) => ({
          ...base,
          marginTop: '16px',
        }),
        close: (base) => ({
          ...base,
          right: '12px',
          top: '12px',
          width: '24px',
          height: '24px',
        }),
      }}
      prevButton={({ currentStep, setCurrentStep, steps }) => {
        const isFirst = currentStep === 0
        return (
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={isFirst}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Retour
          </button>
        )
      }}
      nextButton={({ currentStep, stepsLength, setIsOpen, setCurrentStep }) => {
        const isLast = currentStep === stepsLength - 1
        return (
          <button
            onClick={() => {
              if (isLast) {
                setIsOpen(false)
              } else {
                setCurrentStep((s) => s + 1)
              }
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {isLast ? 'Terminer' : 'Suivant'}
          </button>
        )
      }}
    >
      <TourController />
      {children}
    </TourProvider>
  )
}
