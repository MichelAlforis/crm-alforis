'use client'

import Link from 'next/link'
import { Button } from '@/components/shared'
import type { PersonDetail } from '@/lib/types'

interface PersonDetailHeaderProps {
  person: PersonDetail
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function PersonDetailHeader({ person, onEdit, onDelete, isDeleting }: PersonDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Link href="/dashboard/people" className="text-bleu hover:underline text-sm mb-2 block">
          ← Retour à l'annuaire
        </Link>
        <h1 className="text-3xl font-bold text-ardoise">
          {person.first_name} {person.last_name}
        </h1>
        {person.role && <p className="text-sm text-gray-500 mt-1">{person.role}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onEdit}>
          Éditer
        </Button>
        <Button variant="danger" onClick={onDelete} isLoading={isDeleting}>
          Supprimer
        </Button>
      </div>
    </div>
  )
}
