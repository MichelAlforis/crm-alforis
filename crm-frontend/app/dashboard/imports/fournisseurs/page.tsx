// app/dashboard/imports/fournisseurs/page.tsx
// ============= IMPORT FOURNISSEURS PAGE =============

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Button, Alert } from '@/components/shared'
import { ImportFournisseursForm } from '@/components/forms/ImportFournisseursForm'

export default function ImportFournisseursPage() {
  const router = useRouter()
  const [successCount, setSuccessCount] = useState(0)

  const handleSuccess = (count: number) => {
    setSuccessCount(count)
    // Redirect après 2 secondes
    setTimeout(() => {
      router.push('/dashboard/fournisseurs')
    }, 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/fournisseurs" className="text-bleu hover:underline text-sm mb-2 block">
          ← Retour aux fournisseurs
        </Link>
        <h1 className="text-3xl font-bold text-ardoise">Importer des fournisseurs</h1>
        <p className="text-gray-600 mt-1">
          Créez plusieurs fournisseurs en une seule importation
        </p>
      </div>

      {/* Tutoriel */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">📖 Guide rapide</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="font-bold text-bleu">1.</span>
            <span>Préparez votre fichier Excel avec les colonnes: Nom, Email, Téléphone, etc.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-bleu">2.</span>
            <span>Téléchargez le fichier (Excel .xlsx ou CSV)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-bleu">3.</span>
            <span>Vérifiez les données dans l'aperçu</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-bleu">4.</span>
            <span>Cliquez "Importer" pour créer les fournisseurs</span>
          </li>
        </ol>
      </Card>

      {/* Template Excel */}
      <Card className="bg-amber-50 border border-amber-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold mb-2">📥 Télécharger un modèle</h3>
            <p className="text-sm text-gray-700 mb-3">
              Utilisez ce modèle Excel pour avoir la bonne structure
            </p>
          </div>
          <DownloadTemplateButton />
        </div>
      </Card>

      {/* Success Message */}
      {successCount > 0 && (
        <Alert
          type="success"
          message={`✅ ${successCount} fournisseur(s) créé(s) avec succès! Redirection...`}
        />
      )}

      {/* Import Form */}
      <Card padding="lg">
        <ImportFournisseursForm onSuccess={handleSuccess} />
      </Card>

      {/* Format Details */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">📋 Détails du format</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-2">Colonnes obligatoires:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li><strong>Nom</strong> - Nom complet du fournisseur / contact</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-700 mb-2">Colonnes recommandées:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li><strong>Email</strong> - Adresse email</li>
              <li><strong>Téléphone</strong> - Numéro de téléphone</li>
              <li><strong>Secteur</strong> - Secteur d'activité</li>
              <li><strong>Société</strong> - Nom de la société</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-700 mb-2">Colonnes optionnelles:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>
                <strong>Pipeline</strong> - prospect_froid, prospect_tiede, prospect_chaud, en_negociation, actif, inactif
                <br />(Par défaut: prospect_froid)
              </li>
              <li>
                <strong>Type Fournisseur</strong> - societe_de_gestion, legal, it, marketing, autre
              </li>
              <li><strong>Pays</strong> - Code ou libellé pays</li>
              <li><strong>Notes</strong> - Notes supplémentaires</li>
            </ul>
          </div>

          <div className="bg-gray-50 p-3 rounded mt-4">
            <p className="text-xs text-gray-700">
              ℹ️ Les colonnes peuvent être dans n'importe quel ordre. Les noms de colonnes ne sont pas sensibles à la casse.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Bouton pour télécharger le template Excel (CSV)
 */
function DownloadTemplateButton() {
  const downloadTemplate = () => {
    // Créer le CSV
    const csv = `Nom,Email,Téléphone,Secteur,Société,Pipeline,Type Fournisseur,Pays,Notes
Fournisseur A,a@example.com,+33123456789,Asset Management,SG XYZ,prospect_froid,societe_de_gestion,FR,Gamme actions Europe
Fournisseur B,b@example.com,+33987654321,Juridique,Cabinet ABC,prospect_tiede,legal,LU,Contrat à valider
Fournisseur C,c@example.com,+33555555555,IT,SaaS DEF,actif,it,ES,Intégration API en cours`

    // Créer le blob + déclencher le téléchargement
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'template_fournisseurs.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="secondary" onClick={downloadTemplate}>
      📥 Télécharger template
    </Button>
  )
}
