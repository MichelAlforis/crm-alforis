/**
 * Root Layout Component
 *
 * Top-level layout for the entire application
 * Includes global styles, metadata, and accessibility features
 */
import type { Metadata, Viewport } from 'next'
import '@/styles/global.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: {
    default: 'Alforis CRM',
    template: '%s | Alforis CRM',
  },
  description: 'Plateforme CRM intelligente pour la gestion de patrimoine',
  keywords: ['CRM', 'Alforis Finance', 'Gestion de Patrimoine', 'Investisseurs', 'Finance'],
  authors: [{ name: 'Alforis Finance' }],
  creator: 'Alforis Finance',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alforis',
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'Alforis CRM',
    description: 'Plateforme CRM intelligente pour la gestion de patrimoine',
    siteName: 'Alforis CRM',
  },
  twitter: {
    card: 'summary',
    title: 'Alforis CRM',
    description: 'Gestion de patrimoine intelligente',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FEFBF7' },
    { media: '(prefers-color-scheme: dark)', color: '#1D1D1D' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="antialiased" suppressHydrationWarning>
      <head>
        {/* P2 Optimization: Preconnect to speed up external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* P2 Optimization: Preconnect to API (reduces connection time for LCP) */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Alforis" />
        <meta name="application-name" content="Alforis CRM" />
        <meta name="msapplication-TileColor" content="#E39F70" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="bg-background text-text-primary min-h-screen transition-colors duration-300">
        {/* Skip to main content - Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 btn-primary btn-md"
        >
          Aller au contenu principal
        </a>

        {/* Main Application */}
        <Providers>
          <div id="root">{children}</div>
        </Providers>

        {/* Portal for modals, toasts, etc. */}
        <div id="portal-root" />
      </body>
    </html>
  )
}
