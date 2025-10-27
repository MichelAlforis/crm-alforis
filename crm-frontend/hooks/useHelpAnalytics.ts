// hooks/useHelpAnalytics.ts
// Hook pour tracker les interactions avec le système d'aide

import { useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

export type HelpEventType =
  | 'faq_view'
  | 'faq_search'
  | 'guide_view'
  | 'guide_scroll'
  | 'tooltip_hover'
  | 'tooltip_learn_more_click'
  | 'article_rating'
  | 'support_contact'

interface HelpAnalyticsEvent {
  event_type: HelpEventType
  target_id?: string
  metadata?: Record<string, any>
  timestamp?: string
}

interface UseHelpAnalyticsReturn {
  trackFAQView: (questionId: string, category?: string) => Promise<void>
  trackFAQSearch: (searchQuery: string, resultsCount: number) => Promise<void>
  trackGuideView: (guideSlug: string, scrollDepth?: number) => Promise<void>
  trackTooltipHover: (tooltipId: string, formContext?: string) => Promise<void>
  trackTooltipLearnMore: (tooltipId: string, targetGuide: string) => Promise<void>
  trackArticleRating: (articleId: string, rating: 'positive' | 'negative', feedback?: string) => Promise<void>
  trackSupportContact: (method: 'email' | 'chat' | 'phone', reason?: string) => Promise<void>
}

/**
 * Hook pour tracker les interactions avec le système d'aide
 *
 * Envoie les événements à l'API backend pour analyse et amélioration continue
 *
 * @example
 * ```tsx
 * const analytics = useHelpAnalytics()
 *
 * // Dans un composant FAQ
 * <AccordionItem onClick={() => analytics.trackFAQView('faq-001', 'Organisations')}>
 *   Question...
 * </AccordionItem>
 *
 * // Dans un guide
 * useEffect(() => {
 *   analytics.trackGuideView('organisations')
 * }, [])
 *
 * // Dans un tooltip
 * <HelpTooltip
 *   onHover={() => analytics.trackTooltipHover('aum-field', 'organisation-form')}
 *   content="..."
 * />
 * ```
 */
export function useHelpAnalytics(): UseHelpAnalyticsReturn {

  const trackEvent = useCallback(async (event: HelpAnalyticsEvent) => {
    try {
      await apiClient.post('/help/analytics', {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      })
    } catch (error) {
      // Ne pas bloquer l'UX si le tracking échoue
      logger.error('Failed to track help analytics:', error)
    }
  }, [])

  const trackFAQView = useCallback(async (questionId: string, category?: string) => {
    await trackEvent({
      event_type: 'faq_view',
      target_id: questionId,
      metadata: { category },
    })
  }, [trackEvent])

  const trackFAQSearch = useCallback(async (searchQuery: string, resultsCount: number) => {
    // Ne tracker que les recherches avec au moins 2 caractères
    if (searchQuery.length < 2) return

    await trackEvent({
      event_type: 'faq_search',
      metadata: {
        query: searchQuery,
        results_count: resultsCount,
      },
    })
  }, [trackEvent])

  const trackGuideView = useCallback(async (guideSlug: string, scrollDepth?: number) => {
    await trackEvent({
      event_type: 'guide_view',
      target_id: guideSlug,
      metadata: {
        scroll_depth: scrollDepth,
      },
    })
  }, [trackEvent])

  const trackTooltipHover = useCallback(async (tooltipId: string, formContext?: string) => {
    await trackEvent({
      event_type: 'tooltip_hover',
      target_id: tooltipId,
      metadata: {
        form_context: formContext,
      },
    })
  }, [trackEvent])

  const trackTooltipLearnMore = useCallback(async (tooltipId: string, targetGuide: string) => {
    await trackEvent({
      event_type: 'tooltip_learn_more_click',
      target_id: tooltipId,
      metadata: {
        target_guide: targetGuide,
      },
    })
  }, [trackEvent])

  const trackArticleRating = useCallback(async (
    articleId: string,
    rating: 'positive' | 'negative',
    feedback?: string
  ) => {
    await trackEvent({
      event_type: 'article_rating',
      target_id: articleId,
      metadata: {
        rating,
        feedback,
      },
    })
  }, [trackEvent])

  const trackSupportContact = useCallback(async (
    method: 'email' | 'chat' | 'phone',
    reason?: string
  ) => {
    await trackEvent({
      event_type: 'support_contact',
      metadata: {
        method,
        reason,
      },
    })
  }, [trackEvent])

  return {
    trackFAQView,
    trackFAQSearch,
    trackGuideView,
    trackTooltipHover,
    trackTooltipLearnMore,
    trackArticleRating,
    trackSupportContact,
  }
}
