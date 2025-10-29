/**
 * AnimatedCounter Component
 *
 * Animated number counter with smooth transitions
 * Great for KPI cards and stats
 */
'use client'

import { useEffect, useState, useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  format?: 'number' | 'currency' | 'percent'
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  format = 'number',
  decimals = 0,
  className = ''
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Intersection Observer pour démarrer l'animation quand visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  // Animation du compteur
  useEffect(() => {
    if (!isVisible) return

    const startTime = Date.now()
    const startValue = count
    const endValue = value

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeOut

      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, isVisible])

  const formatValue = (val: number): string => {
    if (format === 'currency') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(val)
    }

    if (format === 'percent') {
      return `${val.toFixed(decimals)}%`
    }

    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val)
  }

  return (
    <span ref={ref} className={className}>
      {formatValue(count)}
    </span>
  )
}
