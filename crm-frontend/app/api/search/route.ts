
// ============================
// 2) app/api/search/route.ts
// ============================
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json({ results: [], q })

  const API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'

  const resources = [
    {
      key: 'fournisseurs',
      url: `${API}/api/v1/fournisseurs?skip=0&limit=20&search=${encodeURIComponent(q)}`,
      toItems: (rows: any[]) => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'fournisseur' as const,
        title: r.name || 'Fournisseur',
        subtitle: [r.sector, r.country, r.email].filter(Boolean).join(' • '),
        href: `/fournisseurs/${r.id ?? ''}`,
      })),
    },
    {
      key: 'investisseurs',
      url: `${API}/api/v1/investisseurs?skip=0&limit=20&search=${encodeURIComponent(q)}`,
      toItems: (rows: any[]) => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'investisseur' as const,
        title: r.name || 'Investisseur',
        subtitle: [r.segment, r.city, r.email].filter(Boolean).join(' • '),
        href: `/investisseurs/${r.id ?? ''}`,
      })),
    },
    {
      key: 'contacts',
      url: `${API}/api/v1/contacts?skip=0&limit=20&search=${encodeURIComponent(q)}`,
      toItems: (rows: any[]) => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'contact' as const,
        title: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || 'Contact',
        subtitle: [r.company, r.role, r.email].filter(Boolean).join(' • '),
        href: `/contacts/${r.id ?? ''}`,
      })),
    },
    {
      key: 'opportunities',
      url: `${API}/api/v1/opportunities?skip=0&limit=20&search=${encodeURIComponent(q)}`,
      toItems: (rows: any[]) => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'opportunite' as const,
        title: r.title || 'Opportunité',
        subtitle: [r.pipeline, r.stage, r.owner].filter(Boolean).join(' • '),
        href: `/opportunites/${r.id ?? ''}`,
      })),
    },
    {
      key: 'kpis',
      url: `${API}/api/v1/kpis?skip=0&limit=20&search=${encodeURIComponent(q)}`,
      toItems: (rows: any[]) => rows.map((r) => ({
        id: String(r.id ?? ''),
        type: 'kpi' as const,
        title: r.label || 'KPI',
        subtitle: [r.period, r.value].filter(Boolean).join(' • '),
        href: `/kpis/${r.id ?? ''}`,
      })),
    },
  ]

  async function safeFetch(r: (typeof resources)[number]) {
    try {
      const res = await fetch(r.url, { next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`${r.key}: ${res.status}`)
      const data = await res.json()
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      return r.toItems(rows)
    } catch (e) {
      return [
        {
          id: r.key,
          type: 'info' as const,
          title: `Ressource indisponible: ${r.key}`,
          subtitle: String(e),
          href: '#',
        },
      ]
    }
  }

  const settled = await Promise.all(resources.map(safeFetch))
  const results = settled.flat()

  return NextResponse.json({ results, q })
}

export type SearchItem = {
  id: string
  type: 'fournisseur' | 'investisseur' | 'contact' | 'opportunite' | 'kpi' | 'info'
  title: string
  subtitle?: string
  href: string
}
