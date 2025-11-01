'use client'

import React from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from "@/lib/constants"
import { ImportOrganisationsForm } from '@/components/forms/ImportOrganisationsForm'
import { Card, Button } from '@/components/shared'

export default function ImportOrganisationsPage() {
  const router = useRouter()

  return (
    <PageContainer width="default">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Importer des organisations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Importez plusieurs organisations en une seule requête via un fichier CSV.
          </p>
        </div>
        <Link href="/dashboard/organisations">
          <Button variant="secondary">← Retour</Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Ajouter des organisations</h2>
            <ImportOrganisationsForm
              onSuccess={() => {
                setTimeout(() => router.push(ROUTES.CRM.ORGANISATIONS), 1000)
              }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Format CSV requis</h3>
          <div className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
            <p>
              <strong>En-têtes attendus (case-insensitive):</strong>
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">name</code> (obligatoire)
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">email</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">website</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">country_code</code> (ex: FR, US, DE)
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">language</code> (ex: FR, EN, DE)
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">phone</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">description</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">category</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">is_active</code> (true/false)
              </li>
            </ul>
            <p className="mt-4">
              <strong>Exemple CSV:</strong>
            </p>
            <pre className="bg-gray-100 dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto">
              {`name,email,website,country_code,language,phone
Acme Corp,contact@acme.com,https://acme.com,FR,FR,+33612345678
Tech Solutions,info@tech.com,https://tech.com,DE,DE,+49301234567`}
            </pre>
          </div>
        </div>
      </Card>
    </PageContainer>
  )
}
