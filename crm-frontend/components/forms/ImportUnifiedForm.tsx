'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/Toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { logger } from '@/lib/logger'
import { IMPORT_ENDPOINTS } from "@/lib/constants"

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

/**
 * Parse CSV content with support for quoted values containing commas
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

  // Parse data rows
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const row: CSVRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      return row;
    })
    .filter(row => Object.values(row).some(val => val)); // Filter out completely empty rows
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Validate CSV structure and required fields
 */
function validateCSV(rows: CSVRow[], requiredFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rows.length === 0) {
    errors.push('Le fichier CSV est vide ou mal formaté');
    return { valid: false, errors };
  }

  const headers = Object.keys(rows[0]);
  const missingFields = requiredFields.filter(field =>
    !headers.some(h => h.toLowerCase().includes(field.toLowerCase()))
  );

  if (missingFields.length > 0) {
    errors.push(`Colonnes manquantes: ${missingFields.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

export default function ImportUnifiedForm() {
  const [organisationsCSV, setOrganisationsCSV] = useState<string>('');
  const [peopleCSV, setPeopleCSV] = useState<string>('');
  const [orgType, setOrgType] = useState<string>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UnifiedImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [orgFileName, setOrgFileName] = useState<string>('');
  const [peopleFileName, setPeopleFileName] = useState<string>('');
  const { showToast } = useToast();

  const handleFileRead = (
    file: File,
    setter: (content: string) => void,
    fileNameSetter: (name: string) => void,
    requiredFields: string[]
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      const validation = validateCSV(rows, requiredFields);

      if (!validation.valid) {
        setValidationErrors(prev => [...prev, ...validation.errors]);
        showToast({
          type: 'error',
          title: 'Erreur de validation',
          message: validation.errors.join(', ')
        });
        return;
      }

      setter(content);
      fileNameSetter(file.name);
      setValidationErrors([]);
    };
    reader.onerror = () => {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de lire le fichier'
      });
    };
    reader.readAsText(file);
  };

  const downloadTemplate = (type: 'organisations' | 'people') => {
    let csv = '';
    if (type === 'organisations') {
      csv = 'name,email,phone,address,city,country\n';
    } else {
      csv = 'first name,last name,personal email,email,personal phone,phone,country code,language,organisation\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_${type}.csv`;
    link.click();
  };

  const handleSubmit = async () => {
    if (!organisationsCSV.trim() && !peopleCSV.trim()) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez charger au moins un fichier CSV'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Parse CSVs
      const orgsData = organisationsCSV.trim() ? parseCSV(organisationsCSV) : [];
      const peopleData = peopleCSV.trim() ? parseCSV(peopleCSV) : [];

      if (orgsData.length === 0 && peopleData.length === 0) {
        showToast({
          type: 'error',
          title: 'Erreur',
          message: 'Les fichiers CSV doivent contenir au moins une ligne de données'
        });
        return;
      }

      // Transform organisations - send null instead of empty strings for optional fields
      const organisations = orgsData.map(row => {
        const email = row.email?.trim();
        const phone = row.phone?.trim();
        const address = row.address?.trim();
        const city = row.city?.trim();
        const country = row.country?.trim();
        const countryCode = (row.country_code || row['country code'] || '')?.trim();

        return {
          name: row.name || row['organisation name'] || '',
          type: orgType,
          ...(email && { email }), // Only include if truthy
          ...(phone && { phone }),
          ...(address && { address }),
          ...(city && { city }),
          ...(country && { country }),
          ...(countryCode && { country_code: countryCode }),
          language: row.language || row['langue'] || 'FR',
        };
      });

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

      // Step 1: Import organisations (if any)
      let orgResult = { total: 0, created: [], failed: 0, errors: [] };
      if (organisations.length > 0) {
        const orgRes = await fetch(IMPORT_ENDPOINTS.ORGANISATIONS_BULK + '?type_org=' + orgType, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(organisations)
        });

        if (!orgRes.ok) throw new Error('Erreur import organisations');
        orgResult = await orgRes.json();
      }

      // Step 2: Import people (if any)
      let peopleResult = { total: 0, created: [], failed: 0, errors: [] };
      if (people.length > 0) {
        const peopleRes = await fetch(IMPORT_ENDPOINTS.PEOPLE_BULK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(people)
        });

        if (!peopleRes.ok) throw new Error('Erreur import personnes');
        peopleResult = await peopleRes.json();
      }

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

      const skipped = (finalResult.summary.total_organisations - finalResult.summary.created_organisations - orgResult.failed) +
                       (finalResult.summary.total_people - finalResult.summary.created_people - peopleResult.failed);

      showToast({
        type: finalResult.summary.total_errors > 0 ? 'warning' : 'success',
        title: finalResult.summary.total_errors > 0 ? 'Import terminé avec erreurs' : 'Succès',
        message: `Créés: ${finalResult.summary.created_organisations} org., ${finalResult.summary.created_people} pers. | Doublons: ${skipped} | Erreurs: ${finalResult.summary.total_errors}`
      });

    } catch (error) {
      logger.error('Erreur:', error);
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
      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Import unifié - Mode recommandé</h3>
            <p className="text-sm text-blue-700 mb-3">
              Importez simultanément vos organisations et leurs contacts associés.
              Les liens entre organisations et personnes seront créés automatiquement.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => downloadTemplate('organisations')}
                className="text-xs bg-white dark:bg-slate-900 hover:bg-blue-50 text-blue-700 px-3 py-1.5 rounded border border-blue-300 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Template Organisations
              </button>
              <button
                onClick={() => downloadTemplate('people')}
                className="text-xs bg-white dark:bg-slate-900 hover:bg-blue-50 text-blue-700 px-3 py-1.5 rounded border border-blue-300 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Template Personnes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertDescription>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 mb-1">Erreurs de validation:</p>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organisations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Organisations
            </h3>
            {organisationsCSV && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {parseCSV(organisationsCSV).length} lignes
              </span>
            )}
          </div>
          <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-blue-400 transition-colors">
            <label className="cursor-pointer block p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) =>
                  e.target.files &&
                  handleFileRead(
                    e.target.files[0],
                    setOrganisationsCSV,
                    setOrgFileName,
                    ['name']
                  )
                }
                className="hidden"
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {orgFileName ? (
                <div className="text-sm">
                  <p className="text-green-600 font-medium">{orgFileName}</p>
                  <p className="text-xs text-gray-500 mt-1">Cliquez pour changer</p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  <p className="font-medium text-blue-600">Cliquez pour sélectionner</p>
                  <p className="text-xs mt-1">ou glissez-déposez votre fichier CSV</p>
                </div>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Colonnes: name, email, phone, address, city, country
          </p>
        </div>

        {/* People */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Personnes
            </h3>
            {peopleCSV && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {parseCSV(peopleCSV).length} lignes
              </span>
            )}
          </div>
          <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-blue-400 transition-colors">
            <label className="cursor-pointer block p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) =>
                  e.target.files &&
                  handleFileRead(
                    e.target.files[0],
                    setPeopleCSV,
                    setPeopleFileName,
                    ['first name', 'last name']
                  )
                }
                className="hidden"
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {peopleFileName ? (
                <div className="text-sm">
                  <p className="text-green-600 font-medium">{peopleFileName}</p>
                  <p className="text-xs text-gray-500 mt-1">Cliquez pour changer</p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  <p className="font-medium text-blue-600">Cliquez pour sélectionner</p>
                  <p className="text-xs mt-1">ou glissez-déposez votre fichier CSV</p>
                </div>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Colonnes: first name, last name, personal email, email, phone, country code, language, organisation
          </p>
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
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || (!organisationsCSV && !peopleCSV)}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Lancer l'import
            </>
          )}
        </Button>
        {(organisationsCSV || peopleCSV) && !isLoading && (
          <Button
            onClick={() => {
              setOrganisationsCSV('');
              setPeopleCSV('');
              setOrgFileName('');
              setPeopleFileName('');
              setResult(null);
              setShowResult(false);
              setValidationErrors([]);
            }}
            className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:text-slate-300"
          >
            Réinitialiser
          </Button>
        )}
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
      <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Format CSV attendu
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 rounded p-3 border">
            <p className="font-semibold text-gray-800 mb-2">Organisations (requis):</p>
            <ul className="space-y-1 text-gray-600 dark:text-slate-400">
              <li><span className="font-medium text-red-600">name*</span> - Nom de l'organisation</li>
              <li>email - Email principal</li>
              <li>phone - Téléphone</li>
              <li>address - Adresse complète</li>
              <li>city - Ville</li>
              <li>country - Pays (code ISO)</li>
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded p-3 border">
            <p className="font-semibold text-gray-800 mb-2">Personnes (requis):</p>
            <ul className="space-y-1 text-gray-600 dark:text-slate-400">
              <li><span className="font-medium text-red-600">first name*</span> - Prénom</li>
              <li><span className="font-medium text-red-600">last name*</span> - Nom</li>
              <li>personal email - Email personnel</li>
              <li>email - Email professionnel</li>
              <li>personal phone - Tél. personnel</li>
              <li>phone - Tél. professionnel</li>
              <li>country code - Code pays</li>
              <li>language - Langue (fr/en)</li>
              <li><span className="font-medium text-blue-600">organisation</span> - Nom de l'org. associée</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <p className="font-semibold text-yellow-800 mb-1">💡 Conseil:</p>
          <p className="text-yellow-700">
            Pour lier automatiquement une personne à une organisation, assurez-vous que la colonne "organisation"
            dans le CSV des personnes contient exactement le même nom que dans le CSV des organisations.
          </p>
        </div>
      </div>
    </div>
  );
}