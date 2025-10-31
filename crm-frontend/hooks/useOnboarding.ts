// hooks/useOnboarding.ts
// Hook pour gérer le wizard d'onboarding des nouveaux utilisateurs

import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'


export interface OnboardingStep {
  target: string
  title: string
  content: string
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center'
  disableBeacon?: boolean
}

interface UseOnboardingOptions {
  steps: OnboardingStep[]
  storageKey?: string
  autoStart?: boolean
  onComplete?: () => void
  onSkip?: () => void
}

interface UseOnboardingReturn {
  isActive: boolean
  currentStep: number
  start: () => void
  stop: () => void
  skip: () => void
  next: () => void
  prev: () => void
  goToStep: (index: number) => void
  reset: () => void
  hasCompleted: boolean
}

/**
 * Hook pour gérer l'onboarding des nouveaux utilisateurs
 *
 * @example
 * ```tsx
 * const onboarding = useOnboarding({
 *   steps: ONBOARDING_STEPS,
 *   storageKey: 'dashboard-onboarding-completed',
 *   autoStart: true,
 *   onComplete: () => logger.log('Onboarding terminé!')
 * })
 *
 * <Joyride
 *   steps={onboarding.steps}
 *   run={onboarding.isActive}
 *   stepIndex={onboarding.currentStep}
 *   callback={onboarding.handleJoyrideCallback}
 * />
 * ```
 */
export function useOnboarding({
  steps,
  storageKey = 'onboarding-completed',
  autoStart = false,
  onComplete,
  onSkip,
}: UseOnboardingOptions): UseOnboardingReturn {
  const [hasCompleted, setHasCompleted] = useLocalStorage<boolean>(storageKey, false)
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Auto-start si l'utilisateur n'a jamais terminé l'onboarding
  useEffect(() => {
    if (autoStart && !hasCompleted) {
      // Delay pour laisser la page se charger
      const timer = setTimeout(() => {
        setIsActive(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoStart, hasCompleted])

  const start = useCallback(() => {
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const stop = useCallback(() => {
    setIsActive(false)
  }, [])

  const skip = useCallback(() => {
    setIsActive(false)
    setHasCompleted(true)
    onSkip?.()
  }, [onSkip, setHasCompleted])

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Dernière étape : marquer comme complété
      setIsActive(false)
      setHasCompleted(true)
      onComplete?.()
    }
  }, [currentStep, steps.length, onComplete, setHasCompleted])

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index)
    }
  }, [steps.length])

  const reset = useCallback(() => {
    setHasCompleted(false)
    setCurrentStep(0)
    setIsActive(false)
  }, [setHasCompleted])

  return {
    isActive,
    currentStep,
    start,
    stop,
    skip,
    next,
    prev,
    goToStep,
    reset,
    hasCompleted,
  }
}
