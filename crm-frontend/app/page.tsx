// app/page.tsx
// ============= HOME PAGE - REDIRECT =============

import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect vers dashboard
  redirect('/dashboard')
}
