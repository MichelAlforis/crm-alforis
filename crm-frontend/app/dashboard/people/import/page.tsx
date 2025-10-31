'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES, withQuery } from "@/lib/constants"
import { ImportPeopleForm } from '@/components/forms/ImportPeopleForm'
import { Card, Button } from '@/components/shared'

export default function ImportPeoplePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ardoise">Importer des personnes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Importez plusieurs personnes physiques en une seule requête via un fichier CSV.
          </p>
        </div>
        <Link href="/dashboard/people">
          <Button variant="secondary">← Retour</Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Ajouter des personnes</h2>
            <ImportPeopleForm
              onSuccess={() => {
                setTimeout(() => router.push(ROUTES.CRM.PEOPLE), 1000)
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
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">first_name</code> (obligatoire)
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">last_name</code> (obligatoire)
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">personal_email</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">personal_phone</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">role</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">linkedin_url</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">notes</code>
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">country_code</code> (ex: FR, US, DE)
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">language</code> (ex: FR, EN, DE)
              </li>
            </ul>
            <p className="mt-4">
              <strong>Exemple CSV:</strong>
            </p>
            <pre className="bg-gray-100 dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto">
              {`first_name,last_name,personal_email,personal_phone,role,country_code,language
Jean,Dupont,jean@example.com,+33612345678,Directeur,FR,FR
Marie,Schmidt,marie@example.com,+49301234567,Analyste,DE,DE`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  )
}