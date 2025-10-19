import { Metadata } from 'next';
import Link from 'next/link';
import ImportUnifiedForm from '@/components/forms/ImportUnifiedForm';

export const metadata: Metadata = {
  title: 'Import Unifié | CRM',
  description: 'Importer organisations et personnes en même temps avec création automatique de liens',
};

export default function ImportUnifiedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">
              🔗 Import Unifié
            </h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Retour
            </Link>
          </div>
          <p className="text-slate-600">
            Importez organisations et personnes en même temps, avec création automatique des liens entre eux.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <ImportUnifiedForm />
        </div>

        {/* Info Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avantages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">✨ Avantages</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>✓ Import en une seule requête</li>
              <li>✓ Création automatique des liens personne ↔ organisation</li>
              <li>✓ Déduplication intégrée</li>
              <li>✓ Rapport détaillé des erreurs</li>
              <li>✓ Données immédiatement opérationnelles</li>
            </ul>
          </div>

          {/* Processus */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">🔄 Processus</h2>
            <ol className="space-y-2 text-sm text-slate-700">
              <li>1️⃣ Télécharger CSV organisations</li>
              <li>2️⃣ Télécharger CSV personnes</li>
              <li>3️⃣ Sélectionner le type d'organisation</li>
              <li>4️⃣ Cliquer sur "Importer"</li>
              <li>5️⃣ Consulter le rapport des résultats</li>
            </ol>
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📚 Documentation</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Format Organisations */}
            <div>
              <h3 className="font-medium text-slate-900 mb-3">📦 Format Organisations CSV</h3>
              <div className="bg-slate-50 p-3 rounded text-xs font-mono">
                <pre>{`name,email,phone,address,city,country
Acme Corp,contact@acme.com,+33123456789,123 Rue X,Paris,FR
Tech Corp,info@techcorp.com,+33987654321,456 Av Y,Lyon,FR`}</pre>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                <strong>Colonnes:</strong> name (requis), email, phone, address, city, country
              </p>
            </div>

            {/* Format Personnes */}
            <div>
              <h3 className="font-medium text-slate-900 mb-3">👥 Format Personnes CSV</h3>
              <div className="bg-slate-50 p-3 rounded text-xs font-mono">
                <pre>{`first name,last name,personal email,email,personal phone,phone,country code,language
Jean,Dupont,jean.dupont@gmail.com,jean.dupont@acme.com,+33612345678,+33123456789,FR,fr
Marie,Martin,marie.martin@gmail.com,marie.martin@techcorp.com,+33687654321,+33987654321,FR,fr`}</pre>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                <strong>Colonnes:</strong> first name, last name, personal email (requis), ...
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-900 mb-2">💡 Astuce</h4>
            <p className="text-sm text-blue-800">
              Les personnes seront liées aux organisations en fonction des correspondances de nom.
              Assurez-vous que les noms correspondent exactement entre les deux fichiers.
            </p>
          </div>
        </div>

        {/* Liens rapides */}
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/dashboard/organisations"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Voir organisations
          </Link>
          <Link
            href="/dashboard/people"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Voir personnes
          </Link>
        </div>
      </div>
    </div>
  );
}