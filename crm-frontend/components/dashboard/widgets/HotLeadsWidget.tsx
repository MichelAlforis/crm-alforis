'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/shared'
import { useHotLeads } from '@/hooks/useEmailMarketing'
import type { LeadScore } from '@/types/email-marketing'

interface HotLeadsWidgetProps {
  limit?: number
  threshold?: number
}

export function HotLeadsWidget({ limit = 5, threshold = 15 }: HotLeadsWidgetProps) {
  const { data, isLoading, error } = useHotLeads({ limit, threshold })

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Leads chauds</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Leads chauds</h2>
        </div>
        <div className="text-sm text-red-600">
          Erreur lors du chargement des leads
        </div>
      </Card>
    )
  }

  const leads = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
          Leads chauds
        </h2>
        {leads.length > 0 && (
          <Link
            href="/dashboard/people"
            className="text-sm text-bleu hover:underline"
          >
            Voir tout ({total})
          </Link>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm">Aucun lead chaud pour le moment</p>
          <p className="text-xs mt-1 text-gray-400">
            Seuil: score ≥ {threshold}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadRow key={lead.person_id} lead={lead} />
          ))}
        </div>
      )}
    </Card>
  )
}

function LeadRow({ lead }: { lead: LeadScore }) {
  // Calculate heat level based on score
  const getHeatInfo = (score: number) => {
    if (score >= 30) {
      return {
        emoji: '🔥🔥🔥',
        color: 'text-red-600 bg-red-50',
        label: 'Très chaud',
      }
    } else if (score >= 20) {
      return {
        emoji: '🔥🔥',
        color: 'text-orange-600 bg-orange-50',
        label: 'Chaud',
      }
    } else {
      return {
        emoji: '🔥',
        color: 'text-yellow-600 bg-yellow-50',
        label: 'Tiède',
      }
    }
  }

  const heatInfo = getHeatInfo(lead.score)
  const displayName = lead.person_name || `Contact #${lead.person_id}`
  const displayEmail = lead.person_email || 'Email non renseigné'

  return (
    <Link
      href={`/dashboard/people/${lead.person_id}`}
      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:bg-slate-800 transition-colors group"
    >
      <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-lg">{heatInfo.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${heatInfo.color}`}>
              {lead.score}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 truncate">{displayEmail}</span>
        </div>
        <div className="mt-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${heatInfo.color}`}>
            {heatInfo.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
