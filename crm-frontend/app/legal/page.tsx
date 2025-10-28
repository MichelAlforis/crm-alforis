import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Documents Légaux | CRM Alforis',
  description: 'Documents légaux et mentions obligatoires - CRM Alforis Finance',
}

export default function LegalIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Documents Légaux
          </h1>
          <p className="text-lg text-gray-600">
            CRM Alforis Finance - Conformité et transparence
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* CGU */}
          <Link href="/legal/cgu">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📜</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Conditions Générales d'Utilisation (CGU)
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Conditions d'accès et d'utilisation du CRM Alforis Finance. Obligations utilisateurs,
                    propriété intellectuelle, RGPD, sécurité.
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    Lire les CGU →
                  </p>
                </div>
              </div>
            </div>
          </Link>

          {/* CGV */}
          <Link href="/legal/cgv">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Conditions Générales de Vente (CGV)
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Conditions commerciales SaaS B2B : tarification, SLA, support, résiliation, propriété intellectuelle.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                      ✓ Publié
                    </span>
                    <p className="text-xs text-blue-600 font-medium">
                      Lire les CGV →
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* DPA */}
          <Link href="/legal/dpa">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔒</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Data Processing Agreement (DPA)
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Convention de sous-traitance RGPD (Article 28). Avec 5 annexes techniques complètes.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                      ✓ Publié
                    </span>
                    <p className="text-xs text-blue-600 font-medium">
                      Lire le DPA →
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Politique de Confidentialité */}
          <Link href="/legal/privacy">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Politique de Confidentialité
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Protection données personnelles (Articles 13/14 RGPD). Droits des utilisateurs, cookies, sécurité.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                      ✓ Publié
                    </span>
                    <p className="text-xs text-blue-600 font-medium">
                      Lire la politique →
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Mentions Légales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Mentions Légales
                </h2>
                <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                  <p><strong>Éditeur :</strong> ALFORIS FINANCE</p>
                  <p><strong>Forme juridique :</strong> SAS au capital de 5 000 €</p>
                  <p><strong>SIREN :</strong> 943 007 229</p>
                  <p><strong>Siège social :</strong> 10 rue de la Bourse – 75002 Paris</p>
                  <p><strong>Immatriculation RNE :</strong> 07/02/2025</p>
                  <p className="pt-2"><strong>Contact RGPD :</strong> <a href="mailto:rgpd@alforis.fr" className="text-blue-600 hover:underline">rgpd@alforis.fr</a></p>
                  <p><strong>Hébergement :</strong> Hetzner Online GmbH, Allemagne (UE)</p>
                </div>
              </div>
            </div>
          </div>

          {/* RC Pro */}
          <div className="bg-green-50 rounded-lg border border-green-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Assurance RC Pro
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  Responsabilité Civile Professionnelle souscrite conformément aux exigences légales.
                </p>
                <p className="text-xs text-green-700 font-semibold">
                  ✓ Souscrite et en cours de validité
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Attestation disponible sur demande
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Conformité RGPD Notice */}
        <div className="mt-8 bg-purple-50 border-l-4 border-purple-500 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            🔒 Conformité RGPD
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Le CRM Alforis Finance respecte le Règlement Général sur la Protection des Données (RGPD).
            Toutes les données personnelles sont traitées de manière sécurisée et confidentielle.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="text-sm">
              <p className="font-semibold text-gray-900 mb-1">Vos droits :</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 text-xs">
                <li>Accès à vos données</li>
                <li>Rectification</li>
                <li>Effacement</li>
                <li>Portabilité</li>
                <li>Opposition</li>
              </ul>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-gray-900 mb-1">Contact :</p>
              <p className="text-xs text-gray-700">
                Email : <a href="mailto:rgpd@alforis.fr" className="text-blue-600 hover:underline">rgpd@alforis.fr</a>
              </p>
              <p className="text-xs text-gray-700 mt-2">
                Réclamations CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.cnil.fr</a>
              </p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Retour au CRM
          </Link>
        </div>
      </div>
    </div>
  )
}
