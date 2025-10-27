// components/performance/WebVitalsReporter.tsx
// ============= P2 OPTIMIZATION: Web Vitals Reporter =============

'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'

interface WebVitalsReporterProps {
  /**
   * Enable console logging (dev mode)
   */
  debug?: boolean

  /**
   * Send metrics to analytics endpoint
   */
  analyticsEndpoint?: string
}

/**
 * Web Vitals Reporter Component
 *
 * Measures Core Web Vitals and optionally reports to analytics
 * Add to app/layout.tsx for global monitoring
 *
 * Usage:
 *   <WebVitalsReporter debug={process.env.NODE_ENV === 'development'} />
 *
 * Core Web Vitals measured:
 * - LCP (Largest Contentful Paint): Target <2.5s
 * - FCP (First Contentful Paint): Target <1.8s
 * - CLS (Cumulative Layout Shift): Target <0.1
 * - TTFB (Time to First Byte): Target <600ms
 * - INP (Interaction to Next Paint): Target <200ms
 */
export function WebVitalsReporter({ debug = false, analyticsEndpoint }: WebVitalsReporterProps = {}) {
  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      // Get threshold status
      const { name, value, rating } = metric
      const status = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'

      // Console log in debug mode
      if (debug) {
        console.log(
          `[Web Vitals] ${status} ${name}: ${Math.round(value)}${name === 'CLS' ? '' : 'ms'} (${rating})`
        )
      }

      // Send to analytics endpoint if configured
      if (analyticsEndpoint) {
        sendToAnalytics(analyticsEndpoint, metric)
      }

      // Store in localStorage for dev inspection
      if (typeof window !== 'undefined' && debug) {
        const vitals = JSON.parse(localStorage.getItem('web-vitals') || '{}')
        vitals[name] = {
          value: Math.round(value),
          rating,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem('web-vitals', JSON.stringify(vitals))
      }
    }

    // Register all Core Web Vitals
    onCLS(handleMetric)
    onFCP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)
    onINP(handleMetric)
  }, [debug, analyticsEndpoint])

  // No UI, just measuring
  return null
}

/**
 * Send metric to analytics endpoint
 */
function sendToAnalytics(endpoint: string, metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
  })

  // Use sendBeacon if available (non-blocking)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body)
  } else {
    // Fallback to fetch
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WebVitals] Failed to send metric:', error)
      }
    })
  }
}

/**
 * Hook to get current Web Vitals
 * Use in dev tools console: window.getWebVitals()
 */
if (typeof window !== 'undefined') {
  (window as any).getWebVitals = () => {
    const vitals = localStorage.getItem('web-vitals')
    if (vitals) {
      const parsed = JSON.parse(vitals)
      console.table(parsed)
      return parsed
    }
    console.log('No Web Vitals data yet. Refresh the page and try again.')
    return null
  }
}
