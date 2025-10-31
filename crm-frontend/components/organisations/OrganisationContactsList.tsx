'use client'

import Link from 'next/link'
import { Card } from '@/components/shared'

interface Contact {
  id: number
  person?: {
    id: number
    first_name: string
    last_name: string
  }
  is_primary?: boolean
  job_title?: string
  work_email?: string
  work_phone?: string
}

interface OrganisationContactsListProps {
  contacts: Contact[]
}

export function OrganisationContactsList({ contacts }: OrganisationContactsListProps) {
  if (!contacts || contacts.length === 0) return null

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">
        Contacts ({contacts.length})
      </h2>
      <div className="space-y-3">
        {contacts.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/people/${link.person?.id}`}
                  className="font-medium text-bleu hover:underline"
                >
                  {link.person?.first_name} {link.person?.last_name}
                </Link>
                {link.is_primary && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-slate-400">
                {link.job_title && <span>{link.job_title}</span>}
                {link.work_email && <span>{link.work_email}</span>}
                {link.work_phone && <span>{link.work_phone}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
