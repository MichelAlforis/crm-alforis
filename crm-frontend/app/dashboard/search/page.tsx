// ============================
// app/dashboard/search/page.tsx — version optimisée
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
  Sparkles,
  ArrowRight,
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
  const cookieHeader = headers().get('cookie') ?? ''
  const res = await fetch(buildApiUrl(q), {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })
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
      <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-500" />
        {title}
      </h2>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">{children}</div>
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
      className="group flex items-center gap-4 px-5 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 focus:bg-gradient-to-r focus:from-blue-50 focus:to-indigo-50 focus:outline-none transition-all duration-200 border-l-4 border-transparent hover:border-blue-500"
      aria-label={`${LABELS[item.type]} : ${title}`}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-200">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate font-semibold text-gray-900 group-hover:text-blue-900">{highlight(title, q)}</div>
          <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {subtitle && <div className="truncate text-sm text-gray-600 mt-0.5">{highlight(subtitle, q)}</div>}
      </div>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
        {LABELS[item.type]}
      </span>
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
      'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200',
      active
        ? 'border-blue-600 text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md'
        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400',
    ].join(' ')

  const mkHref = (type?: SearchItem['type']) => {
    const url = new URL('/dashboard/search', getBaseUrlFromHeaders())
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
      <main className="max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
            <SearchIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Recherche Globale</h1>
          <p className="text-lg text-gray-600">
            Recherchez dans vos fournisseurs, investisseurs, contacts, opportunités et KPIs
          </p>
        </header>

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50/30 p-8">
            <div className="flex items-start gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-2">Exemples de recherche</p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Nom d'entreprise : <code className="px-2 py-0.5 bg-white rounded text-sm">Mandarine Gestion</code></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Nom de contact : <code className="px-2 py-0.5 bg-white rounded text-sm">Michel</code></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Email : <code className="px-2 py-0.5 bg-white rounded text-sm">contact@example.com</code></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Mots-clés : <code className="px-2 py-0.5 bg-white rounded text-sm">Luxembourg</code>, <code className="px-2 py-0.5 bg-white rounded text-sm">CIO</code></span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-medium mb-1">💡 Astuce</p>
              <p>Utilisez la barre de recherche en haut de la page pour commencer votre recherche</p>
            </div>
          </div>
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
    <main className="max-w-6xl mx-auto px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SearchIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Résultats pour</h1>
        </div>
        <div className="flex items-center gap-2 text-3xl font-bold">
          <span className="text-gray-400">«</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{q}</span>
          <span className="text-gray-400">»</span>
        </div>
        <p className="text-gray-600 mt-2">
          {hasAny ? `${ORDER.reduce((sum, t) => sum + (counts[t] || 0), 0)} résultat${ORDER.reduce((sum, t) => sum + (counts[t] || 0), 0) > 1 ? 's' : ''} trouvé${ORDER.reduce((sum, t) => sum + (counts[t] || 0), 0) > 1 ? 's' : ''}` : 'Aucun résultat'}
        </p>
      </header>

      <Tabs counts={counts} currentType={filterType || undefined} q={q} />

      {error && (
        <div
          role="alert"
          className="mb-8 flex items-start gap-4 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900 mb-1">Impossible de charger certains résultats</p>
            <p className="text-sm text-amber-800">{error}</p>
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
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
            <SearchIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun résultat trouvé</h3>
          <p className="text-gray-600 mb-6">
            Essayez d'autres mots-clés ou vérifiez l'orthographe
          </p>
          <div className="inline-flex flex-col gap-2 text-sm text-gray-500">
            <p>Suggestions :</p>
            <ul className="text-left space-y-1">
              <li>• Utilisez des mots-clés plus généraux</li>
              <li>• Vérifiez l'orthographe</li>
              <li>• Essayez des termes alternatifs</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
