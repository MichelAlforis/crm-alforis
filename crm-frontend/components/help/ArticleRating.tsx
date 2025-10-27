// components/help/ArticleRating.tsx
// Système de notation des articles d'aide

'use client'

import React, { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { useHelpAnalytics } from '@/hooks/useHelpAnalytics'
import { useToast } from '@/components/ui/Toast'

interface ArticleRatingProps {
  articleId: string
  articleTitle?: string
}

export function ArticleRating({ articleId, articleTitle }: ArticleRatingProps) {
  const [hasRated, setHasRated] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const analytics = useHelpAnalytics()
  const { showToast } = useToast()

  const handleRate = async (ratingValue: 'positive' | 'negative') => {
    setRating(ratingValue)

    if (ratingValue === 'positive') {
      // Rating positif : direct sans feedback
      try {
        await analytics.trackArticleRating(articleId, 'positive')
        setHasRated(true)
        showToast({
          type: 'success',
          title: 'Merci !',
          message: 'Votre avis nous aide à améliorer la documentation.',
        })
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible d\'enregistrer votre avis.',
        })
      }
    } else {
      // Rating négatif : proposer feedback
      setShowFeedback(true)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!rating) return

    setIsSubmitting(true)
    try {
      await analytics.trackArticleRating(articleId, rating, feedback || undefined)
      setHasRated(true)
      setShowFeedback(false)
      showToast({
        type: 'success',
        title: 'Merci pour votre retour !',
        message: 'Nous allons améliorer cet article.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d\'enregistrer votre avis.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (hasRated) {
    return (
      <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm font-medium text-green-800 flex items-center gap-2">
          ✓ Merci pour votre retour !
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
      {!showFeedback ? (
        <>
          <p className="text-sm font-medium text-gray-900 mb-4">
            Cet article vous a-t-il aidé ?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleRate('positive')}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium text-sm"
            >
              <ThumbsUp className="h-4 w-4" />
              Oui, merci !
            </button>
            <button
              onClick={() => handleRate('negative')}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium text-sm"
            >
              <ThumbsDown className="h-4 w-4" />
              Non, besoin d'aide
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Comment pouvons-nous améliorer cet article ?
              <span className="text-gray-500 font-normal ml-1">(optionnel)</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              placeholder="Ex: L'article manque d'exemples concrets, les captures d'écran ne sont pas à jour..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmitFeedback}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer le feedback'}
            </button>
            <button
              onClick={() => {
                setShowFeedback(false)
                setRating(null)
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
