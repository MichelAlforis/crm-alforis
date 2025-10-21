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
    default: 'TPM Finance CRM',
    template: '%s | TPM Finance CRM',
  },
  description: 'Plateforme CRM professionnelle pour la gestion des investisseurs, fournisseurs et interactions',
  keywords: ['CRM', 'TPM Finance', 'Gestion', 'Investisseurs', 'Fournisseurs'],
  authors: [{ name: 'TPM Finance' }],
  creator: 'TPM Finance',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TPM CRM',
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'TPM Finance CRM',
    description: 'Plateforme CRM professionnelle pour la gestion des investisseurs',
    siteName: 'TPM Finance CRM',
  },
  twitter: {
    card: 'summary',
    title: 'TPM Finance CRM',
    description: 'Plateforme CRM professionnelle',
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
        {/* Preconnect to speed up external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#E39F70" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TPM CRM" />
        <meta name="application-name" content="TPM CRM" />
        <meta name="msapplication-TileColor" content="#E39F70" />
        <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
        <meta name="theme-color" content="#E39F70" />
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
