/**
 * Feedback - Sound effects and haptic feedback
 * Apple-style subtle feedback for user actions
 */

import confetti from 'canvas-confetti'
import { storage, PREFERENCES_STORAGE_KEYS } from '@/lib/constants'

// Sound effects (base64 encoded) - lazy loaded to avoid SSR issues
const SOUND_DATA = {
  open: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA==',
  select: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA==',
  execute: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA==',
  close: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA==',
}

// Lazy-loaded Audio objects (initialized on first use)
const SOUNDS: Record<keyof typeof SOUND_DATA, HTMLAudioElement | null> = {
  open: null,
  select: null,
  execute: null,
  close: null,
}

// Haptic patterns
const HAPTIC_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  error: [20, 100, 20, 100, 20],
}

let soundEnabled = true
let hapticEnabled = true

/**
 * Initialize feedback system with user preferences
 */
export function initFeedback() {
  if (typeof window === 'undefined') return

  // Load preferences
  const storedSound = storage.get(PREFERENCES_STORAGE_KEYS.COMMAND_PALETTE_SOUND)
  const storedHaptic = storage.get(PREFERENCES_STORAGE_KEYS.COMMAND_PALETTE_HAPTIC)

  soundEnabled = storedSound !== 'false'
  hapticEnabled = storedHaptic !== 'false'

  // Preload sounds - create Audio objects lazily
  Object.keys(SOUND_DATA).forEach((key) => {
    const soundKey = key as keyof typeof SOUND_DATA
    if (typeof Audio !== 'undefined') {
      SOUNDS[soundKey] = new Audio(SOUND_DATA[soundKey])
      if (SOUNDS[soundKey]) {
        SOUNDS[soundKey]!.volume = 0.3 // Subtle volume
        SOUNDS[soundKey]!.load()
      }
    }
  })
}

/**
 * Play sound effect
 */
export function playSound(type: keyof typeof SOUNDS) {
  if (!soundEnabled || typeof window === 'undefined') return

  try {
    const audio = SOUNDS[type]
    if (!audio) return // Not initialized yet

    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore errors (user interaction required)
    })
  } catch (_error) {
    // Ignore
  }
}

/**
 * Trigger haptic feedback
 */
export function haptic(pattern: keyof typeof HAPTIC_PATTERNS = 'light') {
  if (!hapticEnabled || typeof window === 'undefined' || !navigator.vibrate) return

  try {
    const vibration = HAPTIC_PATTERNS[pattern]
    navigator.vibrate(vibration)
  } catch (_error) {
    // Ignore
  }
}

/**
 * Show success confetti
 */
export function showConfetti() {
  if (typeof window === 'undefined') return

  const count = 50
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 99999,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  })

  fire(0.2, {
    spread: 60,
  })

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  })
}

/**
 * Toggle sound on/off
 */
export function toggleSound(): boolean {
  soundEnabled = !soundEnabled
  if (typeof window !== 'undefined') {
    storage.set(PREFERENCES_STORAGE_KEYS.COMMAND_PALETTE_SOUND, soundEnabled.toString())
  }
  return soundEnabled
}

/**
 * Toggle haptic on/off
 */
export function toggleHaptic(): boolean {
  hapticEnabled = !hapticEnabled
  if (typeof window !== 'undefined') {
    storage.set(PREFERENCES_STORAGE_KEYS.COMMAND_PALETTE_HAPTIC, hapticEnabled.toString())
  }
  return hapticEnabled
}

/**
 * Get current settings
 */
export function getFeedbackSettings() {
  return {
    soundEnabled,
    hapticEnabled,
  }
}

/**
 * Shake animation (for errors)
 */
export function shakeElement(element: HTMLElement) {
  element.classList.add('animate-shake')
  setTimeout(() => {
    element.classList.remove('animate-shake')
  }, 500)
}
