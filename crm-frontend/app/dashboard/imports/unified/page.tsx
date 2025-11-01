import { Metadata } from 'next';
import Link from 'next/link';
import ImportUnifiedForm from '@/components/forms/ImportUnifiedForm';
import { PageContainer, PageHeader, PageSection, PageTitle } from '@/components/shared';

export const metadata: Metadata = {
  title: 'Import Unifié | CRM',
  description: 'Importer organisations et personnes en même temps avec création automatique de liens',
};

export default function ImportUnifiedPage() {
  return (
    <PageContainer width="narrow" spacing="normal">
      {/* Header */}
      <PageHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-spacing-md">
          <PageTitle subtitle="Importez organisations et personnes en même temps, avec création automatique des liens entre eux.">
            🔗 Import Unifié
          </PageTitle>
          <Link
            href="/dashboard"
            className="text-fluid-sm text-blue-600 hover:underline"
          >
            ← Retour
          </Link>
        </div>
      </PageHeader>

      {/* Main Card */}
      <PageSection>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-spacing-2xl">
          <ImportUnifiedForm />
        </div>
      </PageSection>

      {/* Info Sections */}
      <PageSection>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-lg">
          {/* Avantages */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-spacing-lg">
            <h2 className="text-fluid-lg font-semibold mb-spacing-md">✨ Avantages</h2>
            <ul className="space-y-spacing-xs text-fluid-sm text-text-primary">
              <li>✓ Import en une seule requête</li>
              <li>✓ Création automatique des liens personne ↔ organisation</li>
              <li>✓ Déduplication intégrée</li>
              <li>✓ Rapport détaillé des erreurs</li>
              <li>✓ Données immédiatement opérationnelles</li>
            </ul>
          </div>

          {/* Processus */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-spacing-lg">
            <h2 className="text-fluid-lg font-semibold mb-spacing-md">🔄 Processus</h2>
            <ol className="space-y-spacing-xs text-fluid-sm text-text-primary">
              <li>1️⃣ Télécharger CSV organisations</li>
              <li>2️⃣ Télécharger CSV personnes</li>
              <li>3️⃣ Sélectionner le type d'organisation</li>
              <li>4️⃣ Cliquer sur "Importer"</li>
              <li>5️⃣ Consulter le rapport des résultats</li>
            </ol>
          </div>
        </div>
      </PageSection>

      {/* Documentation */}
      <PageSection>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-spacing-lg">
          <h2 className="text-fluid-lg font-semibold mb-spacing-md">📚 Documentation</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-lg">
            {/* Format Organisations */}
            <div>
              <h3 className="font-medium text-text-primary mb-spacing-sm">📦 Format Organisations CSV</h3>
              <div className="bg-slate-50 p-spacing-sm rounded text-fluid-xs font-mono">
                <pre>{`name,email,phone,address,city,country
Acme Corp,contact@acme.com,+33123456789,123 Rue X,Paris,FR
Tech Corp,info@techcorp.com,+33987654321,456 Av Y,Lyon,FR`}</pre>
              </div>
              <p className="text-fluid-xs text-text-secondary mt-spacing-xs">
                <strong>Colonnes:</strong> name (requis), email, phone, address, city, country
              </p>
            </div>

            {/* Format Personnes */}
            <div>
              <h3 className="font-medium text-text-primary mb-spacing-sm">👥 Format Personnes CSV</h3>
              <div className="bg-slate-50 p-spacing-sm rounded text-fluid-xs font-mono">
                <pre>{`first name,last name,personal email,email,personal phone,phone,country code,language
Jean,Dupont,jean.dupont@gmail.com,jean.dupont@acme.com,+33612345678,+33123456789,FR,fr
Marie,Martin,marie.martin@gmail.com,marie.martin@techcorp.com,+33687654321,+33987654321,FR,fr`}</pre>
              </div>
              <p className="text-fluid-xs text-text-secondary mt-spacing-xs">
                <strong>Colonnes:</strong> first name, last name, personal email (requis), ...
              </p>
            </div>
          </div>

          <div className="mt-spacing-md p-spacing-md bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-900 mb-spacing-xs">💡 Astuce</h4>
            <p className="text-fluid-sm text-blue-800">
              Les personnes seront liées aux organisations en fonction des correspondances de nom.
              Assurez-vous que les noms correspondent exactement entre les deux fichiers.
            </p>
          </div>
        </div>
      </PageSection>

      {/* Liens rapides */}
      <div className="flex gap-spacing-sm justify-center">
        <Link
          href="/dashboard/organisations"
          className="px-spacing-md py-spacing-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-fluid-sm"
        >
          Voir organisations
        </Link>
        <Link
          href="/dashboard/people"
          className="px-spacing-md py-spacing-sm bg-green-600 text-white rounded-lg hover:bg-green-700 text-fluid-sm"
        >
          Voir personnes
        </Link>
      </div>
    </PageContainer>
  );
}