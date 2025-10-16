/**
 * Root Layout Component
 *
 * Top-level layout for the entire application
 * Includes global styles, metadata, and accessibility features
 */
import type { Metadata, Viewport } from 'next'
import '@/styles/global.css'

export const metadata: Metadata = {
  title: {
    default: 'TPM Finance CRM',
    template: '%s | TPM Finance CRM',
  },
  description: 'Plateforme CRM professionnelle pour la gestion des investisseurs, fournisseurs et interactions',
  keywords: ['CRM', 'TPM Finance', 'Gestion', 'Investisseurs', 'Fournisseurs'],
  authors: [{ name: 'TPM Finance' }],
  creator: 'TPM Finance',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'TPM Finance CRM',
    description: 'Plateforme CRM professionnelle pour la gestion des investisseurs',
    siteName: 'TPM Finance CRM',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="antialiased">
      <head>
        {/* Preconnect to speed up external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {/* Skip to main content - Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 btn-primary btn-md"
        >
          Aller au contenu principal
        </a>

        {/* Main Application */}
        <div id="root">{children}</div>

        {/* Portal for modals, toasts, etc. */}
        <div id="portal-root" />
      </body>
    </html>
  )
}
