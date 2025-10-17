
// ============================
// 2) app/api/search/route.ts
// ============================
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SearchItem } from '@/lib/search'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json({ results: [], q })

  // En production, utiliser l'URL complète du domaine, sinon localhost
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, '').replace(/\/$/, '') || 'http://localhost:8000'

  // Récupérer le token d'authentification
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value

  const resources = [
    {
      key: 'fournisseurs',
      url: `${API}/api/v1/fournisseurs/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: (rows: any[]): SearchItem[] => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'fournisseur' as const,
        title: r.name || 'Fournisseur',
        subtitle: [r.activity, r.main_phone, r.email].filter(Boolean).join(' • '),
        href: `/dashboard/fournisseurs/${r.id ?? ''}`,
      })),
    },
    {
      key: 'investisseurs',
      url: `${API}/api/v1/investors/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: (rows: any[]): SearchItem[] => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'investisseur' as const,
        title: r.name || 'Investisseur',
        subtitle: [r.company, r.main_phone, r.email].filter(Boolean).join(' • '),
        href: `/dashboard/investors/${r.id ?? ''}`,
      })),
    },
    {
      key: 'people',
      url: `${API}/api/v1/people?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: (rows: any[]): SearchItem[] => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'person' as const,
        title: [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Personne',
        subtitle: [r.role, r.personal_email, r.personal_phone].filter(Boolean).join(' • '),
        href: `/dashboard/people/${r.id ?? ''}`,
      })),
    },
    {
      key: 'interactions',
      url: `${API}/api/v1/interactions/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: (rows: any[]): SearchItem[] => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'contact' as const,
        title: r.contact_name || 'Interaction',
        subtitle: [r.subject, r.type, r.date ? new Date(r.date).toLocaleDateString('fr-FR') : ''].filter(Boolean).join(' • '),
        href: `/dashboard/interactions/${r.id ?? ''}`,
      })),
    },
    {
      key: 'kpis',
      url: `${API}/api/v1/kpis/search?q=${encodeURIComponent(q)}&skip=0&limit=20`,
      toItems: (rows: any[]): SearchItem[] => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'kpi' as const,
        title: `KPI ${r.year}-${String(r.month).padStart(2, '0')}`,
        subtitle: [
          r.investor_name,
          r.rdv_count && `${r.rdv_count} RDV`,
          r.revenue && `${r.revenue}€`
        ].filter(Boolean).join(' • '),
        href: `/dashboard/kpis?investor_id=${r.investor_id ?? ''}&year=${r.year}&month=${r.month}`,
      })),
    },
  ]

  async function safeFetch(r: (typeof resources)[number]) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(r.url, {
        next: { revalidate: 0 },
        headers
      })

      if (!res.ok) {
        // Si erreur d'authentification, on retourne un tableau vide au lieu d'une erreur
        if (res.status === 401 || res.status === 403) {
          return []
        }
        throw new Error(`${r.key}: ${res.status}`)
      }

      const data = await res.json()
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      return r.toItems(rows)
    } catch (e) {
      // En cas d'erreur, on retourne un tableau vide pour ne pas casser l'UX
      console.error(`Search error for ${r.key}:`, e)
      return []
    }
  }

  const settled = await Promise.all(resources.map(safeFetch))
  const results = settled.flat()

  return NextResponse.json({ results, q })
}
