import {
  Activity as ActivityIcon,
  PhoneCall,
  RefreshCcw,
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  StickyNote,
  FileText,
  Layers,
  Flag,
  Edit3,
  Landmark,
  Send,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { OrganisationActivity, OrganisationActivityType } from '@/lib/types'
import { humanizeKey } from '@/lib/utils'

export interface ActivityVisual {
  icon: LucideIcon
  bg: string
  text: string
  label: string
}

const visuals: Record<OrganisationActivityType, ActivityVisual> = {
  interaction_created: { icon: PhoneCall, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Interaction' },
  interaction_updated: { icon: RefreshCcw, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Interaction' },
  task_created: { icon: ClipboardList, bg: 'bg-amber-100', text: 'text-amber-600', label: 'Tâche' },
  task_completed: { icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Tâche' },
  task_updated: { icon: ClipboardCheck, bg: 'bg-amber-100', text: 'text-amber-600', label: 'Tâche' },
  note_added: { icon: StickyNote, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Note' },
  document_added: { icon: FileText, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Document' },
  mandat_created: { icon: Layers, bg: 'bg-rose-100', text: 'text-rose-600', label: 'Mandat' },
  mandat_status_changed: { icon: Flag, bg: 'bg-rose-100', text: 'text-rose-600', label: 'Mandat' },
  mandat_updated: { icon: Edit3, bg: 'bg-rose-100', text: 'text-rose-600', label: 'Mandat' },
  organisation_created: { icon: Landmark, bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'Organisation' },
  organisation_updated: { icon: Landmark, bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'Organisation' },
  email_sent: { icon: Send, bg: 'bg-sky-100', text: 'text-sky-600', label: 'Email' },
  system_event: { icon: Sparkles, bg: 'bg-slate-100', text: 'text-slate-600', label: 'Système' },
}

export const defaultVisual: ActivityVisual = {
  icon: ActivityIcon,
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  label: 'Activité',
}

export function getActivityVisual(type: OrganisationActivityType): ActivityVisual {
  return visuals[type] ?? defaultVisual
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString || dateString.trim() === '') return 'Date inconnue'

  const date = new Date(dateString)

  // Check for invalid date
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString)
    return 'Date invalide'
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const absSeconds = Math.abs(diffSeconds)

  if (absSeconds < 60) {
    return diffSeconds >= 0 ? 'il y a quelques secondes' : 'dans quelques secondes'
  }

  const diffMinutes = Math.round(absSeconds / 60)
  if (diffMinutes < 60) {
    return diffSeconds >= 0
      ? `il y a ${diffMinutes} min`
      : `dans ${diffMinutes} min`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return diffSeconds >= 0
      ? `il y a ${diffHours} h`
      : `dans ${diffHours} h`
  }

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) {
    return diffSeconds >= 0
      ? `il y a ${diffDays} j`
      : `dans ${diffDays} j`
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getOrganisationName(activity: OrganisationActivity): string | undefined {
  const metadata = activity.metadata || {}
  return (
    (metadata.organisation_name as string | undefined) ||
    (metadata.name as string | undefined)
  )
}

export interface ChangeSummary {
  label: string
  value: string
}

export function getChangeSummary(
  activity: OrganisationActivity,
  max = 3
): { items: ChangeSummary[]; remaining: number } {
  const rawChanges = Array.isArray(activity.metadata?.changes)
    ? (activity.metadata?.changes as Array<{ field: string; new: unknown }>)
    : []

  if (!rawChanges.length) {
    return { items: [], remaining: 0 }
  }

  const items = rawChanges.slice(0, max).map((change) => ({
    label: humanizeKey(change.field),
    value: String(change.new ?? '—'),
  }))

  return {
    items,
    remaining: Math.max(rawChanges.length - max, 0),
  }
}
