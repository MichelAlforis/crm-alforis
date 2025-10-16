// app/layout.tsx
// ============= ROOT LAYOUT =============

import type { Metadata } from 'next'
import '../global.css'

export const metadata: Metadata = {
  title: 'TPM Finance CRM',
  description: 'CRM pour la gestion des investisseurs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-ivoire text-ardoise">
        {children}
      </body>
    </html>
  )
}
