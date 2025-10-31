
// ============================
// 2) app/api/search/route.ts
// ============================
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SearchItem } from '@/lib/search'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json({ results: [], q })

  // En production, utiliser l'URL complète du domaine, sinon localhost
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, '').replace(/\/$/, '') || 'http://localhost:8000'

  // Récupérer le token d'authentification
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

  type SearchResource = {
    key: string
    url: string
    toItems: (rows: unknown[]) => SearchItem[]
  }

  const toOrganisationItems = (rows: unknown[]): SearchItem[] =>
    rows
      .filter(isRecord)
      .map((row) => {
        const id = 'id' in row ? row.id : ''
        const name = 'name' in row ? row.name : undefined
        const activity = 'activity' in row ? row.activity : undefined
        const mainPhone = 'main_phone' in row ? row.main_phone : undefined
        const email = 'email' in row ? row.email : undefined

        return {
          id: String(id ?? ''),
          type: 'organisation' as const,
          title: typeof name === 'string' && name.trim() ? name : 'Organisation',
          subtitle: [activity, mainPhone, email].filter(Boolean).join(' • '),
          href: `/dashboard/organisations/${id ?? ''}`,
        }
      })

  const toPeopleItems = (rows: unknown[]): SearchItem[] =>
    rows
      .filter(isRecord)
      .map((row) => {
        const id = 'id' in row ? row.id : ''
        const firstName = 'first_name' in row ? row.first_name : undefined
        const lastName = 'last_name' in row ? row.last_name : undefined
        const role = 'role' in row ? row.role : undefined
        const personalEmail = 'personal_email' in row ? row.personal_email : undefined
        const personalPhone = 'personal_phone' in row ? row.personal_phone : undefined

        const title = [firstName, lastName]
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
          .join(' ')

        return {
          id: String(id ?? ''),
          type: 'person' as const,
          title: title || 'Personne',
          subtitle: [role, personalEmail, personalPhone].filter(Boolean).join(' • '),
          href: `/dashboard/people/${id ?? ''}`,
        }
      })

  const toInteractionItems = (rows: unknown[]): SearchItem[] =>
    rows
      .filter(isRecord)
      .map((row) => {
        const id = 'id' in row ? row.id : ''
        const contactName = 'contact_name' in row ? row.contact_name : undefined
        const subject = 'subject' in row ? row.subject : undefined
        const type = 'type' in row ? row.type : undefined
        const date = 'date' in row ? row.date : undefined

        const formattedDate =
          typeof date === 'string' && date ? new Date(date).toLocaleDateString('fr-FR') : ''

        return {
          id: String(id ?? ''),
          type: 'contact' as const,
          title: typeof contactName === 'string' && contactName.trim() ? contactName : 'Interaction',
          subtitle: [subject, type, formattedDate].filter(Boolean).join(' • '),
          href: `/dashboard/interactions/${id ?? ''}`,
        }
      })

  const toKpiItems = (rows: unknown[]): SearchItem[] =>
    rows
      .filter(isRecord)
      .map((row) => {
        const id = 'id' in row ? row.id : ''
        const year = 'year' in row ? row.year : undefined
        const month = 'month' in row ? row.month : undefined
        const investorName = 'investor_name' in row ? row.investor_name : undefined
        const rdvCount = 'rdv_count' in row ? row.rdv_count : undefined
        const revenue = 'revenue' in row ? row.revenue : undefined
        const investorId = 'investor_id' in row ? row.investor_id : undefined

        const formattedTitle =
          typeof year === 'number' && typeof month === 'number'
            ? `KPI ${year}-${String(month).padStart(2, '0')}`
            : 'KPI'

        const subtitleParts: string[] = []
        if (typeof investorName === 'string') subtitleParts.push(investorName)
        if (typeof rdvCount === 'number') subtitleParts.push(`${rdvCount} RDV`)
        if (typeof revenue === 'number') subtitleParts.push(`${revenue}€`)

        const query = new URLSearchParams()
        if (investorId !== undefined) query.append('investor_id', String(investorId))
        if (year !== undefined) query.append('year', String(year))
        if (month !== undefined) query.append('month', String(month))

        return {
          id: String(id ?? ''),
          type: 'kpi' as const,
          title: formattedTitle,
          subtitle: subtitleParts.join(' • '),
          href: `/dashboard/kpis?${query.toString()}`,
        }
      })

  const resources: SearchResource[] = [
    {
      key: 'organisations',
      url: `${API}/api/v1/organisations/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: toOrganisationItems,
    },
    {
      key: 'people',
      url: `${API}/api/v1/people?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: toPeopleItems,
    },
    {
      key: 'interactions',
      url: `${API}/api/v1/interactions/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: toInteractionItems,
    },
    {
      key: 'kpis',
      url: `${API}/api/v1/kpis/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: toKpiItems,
    },
  ]

  async function safeFetch(resource: SearchResource): Promise<SearchItem[]> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(resource.url, {
        next: { revalidate: 0 },
        headers
      })

      if (!res.ok) {
        // Si erreur d'authentification, on retourne un tableau vide au lieu d'une erreur
        if (res.status === 401 || res.status === 403) {
          return []
        }
        throw new Error(`${resource.key}: ${res.status}`)
      }

      const data = await res.json()
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      return resource.toItems(rows)
    } catch (e) {
      // En cas d'erreur, on retourne un tableau vide pour ne pas casser l'UX
      logger.error(`Search error for ${resource.key}:`, e)
      return []
    }
  }

  const settled = await Promise.all(resources.map(safeFetch))
  const results = settled.flat()

  return NextResponse.json({ results, q })
}
