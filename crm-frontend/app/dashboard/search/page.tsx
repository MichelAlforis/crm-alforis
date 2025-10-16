// ============================
// app/search/page.tsx — version améliorée
// ============================
import React from 'react'
import { headers } from 'next/headers'
import {
  Factory,
  Building2,
  User,
  TrendingUp,
  BarChart2,
  Info,
  Search as SearchIcon,
  AlertTriangle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type SearchItem = import('../api/search/route').SearchItem

// ----- Utils -----
function getBaseUrlFromHeaders() {
  const h = headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host')!
  return `${proto}://${host}`
}

function buildApiUrl(q: string) {
  const url = new URL('/api/search', getBaseUrlFromHeaders())
  url.searchParams.set('q', q)
  return url.toString()
}

function normalize(str: string) {
  return (str || '').toString()
}

// Surlignage naïf (non sensible aux accents, volontaire pour lisibilité)
function highlight(text: string, q: string) {
  if (!text || !q) return text
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${safe})`, 'ig')
  return text.split(re).map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-amber-200/60 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  )
}

const LABELS: Record<SearchItem['type'], string> = {
  fournisseur: 'Fournisseurs',
  investisseur: 'Investisseurs',
  contact: 'Contacts',
  opportunite: 'Opportunités',
  kpi: 'KPI',
  info: 'Informations',
}

const ICONS: Record<SearchItem['type'], React.ComponentType<any>> = {
  fournisseur: Factory,
  investisseur: Building2,
  contact: User,
  opportunite: TrendingUp,
  kpi: BarChart2,
  info: Info,
}

const ORDER: SearchItem['type'][] = [
  'fournisseur',
  'investisseur',
  'contact',
  'opportunite',
  'kpi',
  'info',
]

// ----- Data fetch -----
async function getResults(q: string) {
  const res = await fetch(buildApiUrl(q), { cache: 'no-store' })
  if (!res.ok) {
    const msg = await safeText(res)
    throw new Error(`Search failed: ${res.status} ${res.statusText} — ${msg}`)
  }
  return (await res.json()) as { results: SearchItem[]; q: string }
}

async function safeText(res: Response) {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

// ----- UI atoms -----
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">{title}</h2>
      <div className="divide-y rounded-lg border border-gray-200 overflow-hidden bg-white">{children}</div>
    </section>
  )
}

function Row({ item, q }: { item: SearchItem; q: string }) {
  const Icon = ICONS[item.type] || Info
  const title = normalize(item.title)
  const subtitle = normalize(item.subtitle)

  return (
    <a
      href={item.href}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
      aria-label={`${LABELS[item.type]} : ${title}`}
    >
      <Icon className="w-5 h-5 text-gray-500 shrink-0" />
      <div className="min-w-0">
        <div className="truncate font-medium text-gray-900">{highlight(title, q)}</div>
        {subtitle && <div className="truncate text-sm text-gray-500">{highlight(subtitle, q)}</div>}
      </div>
    </a>
  )
}

function Tabs({
  counts,
  currentType,
  q,
}: {
  counts: Partial<Record<SearchItem['type'], number>>
  currentType?: SearchItem['type']
  q: string
}) {
  const allCount = ORDER.reduce((sum, k) => sum + (counts[k] || 0), 0)
  const tabClass = (active: boolean) =>
    [
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
      active
        ? 'border-gray-900 text-gray-900 bg-gray-100'
        : 'border-gray-300 text-gray-600 hover:bg-gray-50',
    ].join(' ')

  const mkHref = (type?: SearchItem['type']) => {
    const url = new URL('/search', getBaseUrlFromHeaders())
    url.searchParams.set('q', q)
    if (type && type !== 'info') url.searchParams.set('type', type)
    return url.pathname + url.search
  }

  return (
    <nav aria-label="Filtrer par type" className="mb-6 flex flex-wrap gap-2">
      <a className={tabClass(!currentType)} href={mkHref(undefined)}>
        <SearchIcon className="w-4 h-4" />
        Tous
        <span className="text-xs text-gray-500">{allCount}</span>
      </a>
      {ORDER.filter((t) => t !== 'info').map((t) => {
        const Icon = ICONS[t]
        const count = counts[t] || 0
        if (!count) return null
        return (
          <a key={t} className={tabClass(currentType === t)} href={mkHref(t)}>
            <Icon className="w-4 h-4" />
            {LABELS[t]}
            <span className="text-xs text-gray-500">{count}</span>
          </a>
        )
      })}
    </nav>
  )
}

// ----- Page -----
export default async function Page({
  searchParams,
}: {
  searchParams: { q?: string; type?: SearchItem['type'] }
}) {
  const q = (searchParams.q || '').trim()
  const filterType = (searchParams.type ?? '') as SearchItem['type'] | ''

  if (!q) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Recherche</h1>
          <p className="text-gray-600 mt-2">
            Tapez un mot-clé dans la barre de recherche ou appuyez sur{' '}
            <kbd className="px-1 py-0.5 border rounded text-xs">/</kbd> pour commencer.
          </p>
        </header>

        <div className="rounded-lg border border-dashed p-6 text-sm text-gray-600">
          <p className="mb-2 font-medium">Exemples utiles</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>« Mandarine Gestion », « Keren Finance »</li>
            <li>« prospect chaud », « Luxembourg », « CIO », « assurance vie »</li>
            <li>Emails, sociétés, contacts, pipelines…</li>
          </ul>
        </div>
      </main>
    )
  }

  let results: SearchItem[] = []
  let error: string | null = null

  try {
    const payload = await getResults(q)
    results = payload.results || []
  } catch (e: any) {
    error = e?.message || 'Une erreur est survenue.'
  }

  // Regroupement + compteurs
  const groups: Partial<Record<SearchItem['type'], SearchItem[]>> = {}
  const counts: Partial<Record<SearchItem['type'], number>> = {}
  for (const r of results) {
    groups[r.type] = groups[r.type] || []
    groups[r.type]!.push(r)
    counts[r.type] = (counts[r.type] || 0) + 1
  }

  // Filtrage par type si demandé
  const typesToRender =
    filterType && ORDER.includes(filterType) ? ([filterType] as SearchItem['type'][]) : ORDER

  const hasAny =
    ORDER.reduce((sum, t) => sum + (counts[t] || 0), 0) > 0

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Résultats pour « {q} »</h1>
      </header>

      <Tabs counts={counts} currentType={filterType || undefined} q={q} />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Impossible de charger certains résultats</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {typesToRender.map((t) => {
        const items = groups[t] || []
        if (!items.length) return null
        return (
          <Section key={t} title={LABELS[t]}>
            {items.map((item) => (
              <Row key={`${t}-${item.id}`} item={item} q={q} />
            ))}
          </Section>
        )
      })}

      {!hasAny && !error && (
        <p className="text-gray-600">
          Aucun résultat. Essayez d’autres mots-clés, ou vérifiez que les endpoints backend existent.
        </p>
      )}
    </main>
  )
}
