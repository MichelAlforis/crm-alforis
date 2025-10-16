// app/imports/page.tsx
import { redirect } from 'next/navigation'
import Layout from './layout'

export default function ImportsIndexPage() {
  <Layout>{redirect('/dashboard/imports/investors')}</Layout>
}
