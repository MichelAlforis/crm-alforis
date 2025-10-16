// components/forms/ImportForm.tsx
// Formulaire d'import générique pour investisseurs ou fournisseurs

import React, { useState } from 'react'

interface ImportFormProps {
  onSuccess?: () => void
}

export function ImportForm({ onSuccess }: ImportFormProps) {
  const [importType, setImportType] = useState<'investor' | 'fournisseur'>('investor')

  // Placeholder pour le contenu du formulaire selon le type
  const renderForm = () => {
    if (importType === 'investor') {
      return <div>Formulaire d'import investisseurs (à compléter)</div>
    } else {
      return <div>Formulaire d'import fournisseurs (à compléter)</div>
    }
  }

  return (
    <div>
      <div className="mb-4">
        <label className="block font-medium mb-2">Type d'import</label>
        <select
          value={importType}
          onChange={e => setImportType(e.target.value as 'investor' | 'fournisseur')}
          className="border rounded px-2 py-1"
        >
          <option value="investor">Investisseurs</option>
          <option value="fournisseur">Fournisseurs</option>
        </select>
      </div>
      {renderForm()}
    </div>
  )
}
