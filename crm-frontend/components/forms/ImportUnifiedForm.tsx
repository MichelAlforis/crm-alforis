'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/Toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  total: number;
  created: number[];
  failed: number;
  errors: Array<{
    index: number;
    row: number;
    error: string;
  }>;
}

interface UnifiedImportResult {
  organisations: ImportResult;
  people: ImportResult;
  links: ImportResult;
  summary: {
    total_organisations: number;
    created_organisations: number;
    total_people: number;
    created_people: number;
    total_links: number;
    created_links: number;
    total_errors: number;
  };
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map(h => h.trim().toLowerCase());

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: CSVRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
}

export default function ImportUnifiedForm() {
  const [organisationsCSV, setOrganisationsCSV] = useState<string>('');
  const [peopleCSV, setPeopleCSV] = useState<string>('');
  const [orgType, setOrgType] = useState<string>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UnifiedImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { showToast } = useToast();

  const handleFileRead = (file: File, setter: (content: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setter(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!organisationsCSV.trim() || !peopleCSV.trim()) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez charger les deux fichiers CSV'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Parse CSVs
      const orgsData = parseCSV(organisationsCSV);
      const peopleData = parseCSV(peopleCSV);

      if (orgsData.length === 0 || peopleData.length === 0) {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Les fichiers CSV doivent contenir au moins une ligne de données'
        });
        return;
      }

      // Transform organisations
      const organisations = orgsData.map(row => ({
        name: row.name || row['organisation name'] || '',
        email: row.email || '',
        phone: row.phone || '',
        address: row.address || '',
        city: row.city || '',
        country: row.country || '',
      }));

      // Transform people
      const people = peopleData.map(row => ({
        first_name: row['first name'] || row['prenom'] || '',
        last_name: row['last name'] || row['nom'] || '',
        personal_email: row['personal email'] || row['email personnel'] || '',
        email: row.email || row['email professionnel'] || '',
        personal_phone: row['personal phone'] || row['téléphone personnel'] || '',
        phone: row.phone || row['téléphone'] || '',
        country_code: row['country code'] || row['pays'] || '',
        language: row.language || row['langue'] || 'fr',
      }));

      // Step 1: Import organisations
      const orgRes = await fetch('/api/v1/imports/organisations/bulk?type_org=' + orgType, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organisations)
      });

      if (!orgRes.ok) throw new Error('Erreur import organisations');
      const orgResult = await orgRes.json();

      // Step 2: Import people
      const peopleRes = await fetch('/api/v1/imports/people/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(people)
      });

      if (!peopleRes.ok) throw new Error('Erreur import personnes');
      const peopleResult = await peopleRes.json();

      // Step 3: Create links based on organisation and person names
      // For now, links creation is skipped - needs API enhancement
      const linkResult = {
        total: 0,
        created: [],
        failed: 0,
        errors: []
      };

      const finalResult: UnifiedImportResult = {
        organisations: orgResult,
        people: peopleResult,
        links: linkResult,
        summary: {
          total_organisations: orgResult.total,
          created_organisations: orgResult.created.length,
          total_people: peopleResult.total,
          created_people: peopleResult.created.length,
          total_links: 0,
          created_links: 0,
          total_errors: orgResult.failed + peopleResult.failed + linkResult.failed
        }
      };

      setResult(finalResult);
      setShowResult(true);

      showToast({
        type: 'success',
        title: 'Succès',
        message: `Import complété: ${finalResult.summary.created_organisations} organisations, ${finalResult.summary.created_people} personnes`
      });

    } catch (error) {
      console.error('Erreur:', error);
      showToast({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organisations */}
        <div className="space-y-3">
          <h3 className="font-semibold">📦 Organisations</h3>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files && handleFileRead(e.target.files[0], setOrganisationsCSV)}
            className="block w-full text-sm border border-gray-300 rounded-lg p-2"
          />
          {organisationsCSV && (
            <p className="text-sm text-green-600">✓ {parseCSV(organisationsCSV).length} organisations</p>
          )}
        </div>

        {/* People */}
        <div className="space-y-3">
          <h3 className="font-semibold">👥 Personnes</h3>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files && handleFileRead(e.target.files[0], setPeopleCSV)}
            className="block w-full text-sm border border-gray-300 rounded-lg p-2"
          />
          {peopleCSV && (
            <p className="text-sm text-green-600">✓ {parseCSV(peopleCSV).length} personnes</p>
          )}
        </div>
      </div>

      {/* Type organisation */}
      <div>
        <label className="block text-sm font-medium mb-2">Type d'organisation</label>
        <Select value={orgType} onValueChange={setOrgType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="fournisseur">Fournisseur</SelectItem>
            <SelectItem value="distributeur">Distributeur</SelectItem>
            <SelectItem value="emetteur">Émetteur</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Boutons */}
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
          {isLoading ? '⏳ En cours...' : '🚀 Importer'}
        </Button>
      </div>

      {/* Résultats */}
      {showResult && result && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-bold text-lg">📊 Résultats</h3>

          <Alert className={result.summary.total_errors === 0 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Organisations: <span className="text-green-600">{result.summary.created_organisations}</span>/{result.summary.total_organisations}</p>
                <p className="font-semibold">Personnes: <span className="text-green-600">{result.summary.created_people}</span>/{result.summary.total_people}</p>
                {result.summary.total_errors > 0 && (
                  <p className="font-semibold text-red-600">Erreurs: {result.summary.total_errors}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Erreurs organisations */}
          {result.organisations.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">❌ Erreurs Organisations</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {result.organisations.errors.map((err, i) => (
                  <li key={i}>Ligne {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Erreurs personnes */}
          {result.people.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">❌ Erreurs Personnes</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {result.people.errors.map((err, i) => (
                  <li key={i}>Ligne {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold mb-2">📋 Format CSV attendu</h4>
        <div className="space-y-2 text-xs">
          <p><strong>Organisations:</strong> name, email, phone, address, city, country</p>
          <p><strong>Personnes:</strong> first name, last name, personal email, email, personal phone, phone, country code, language</p>
        </div>
      </div>
    </div>
  );
}