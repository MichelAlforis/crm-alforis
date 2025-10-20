#!/usr/bin/env python3
"""
Generate manual enrichment template for all 677 SDG
"""
import csv
from pathlib import Path
from typing import Dict, List, Optional

BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_MANUAL = BASE_DIR / "SDG_677_DIRIGEANTS_TEMPLATE_MANUEL.csv"


def extract_siren(society: Dict) -> Optional[str]:
    """Extract SIREN from notes field"""
    notes = society.get('notes', '')
    if 'SIRET:' in notes:
        siret = notes.split('SIRET:')[1].split('|')[0].strip()
        return siret[:9] if len(siret) >= 9 else None
    return None


print("🚀 Génération template manuel pour enrichissement dirigeants\n")

# Load SDG data
with open(DATA_FILE, 'r', encoding='utf-8') as f:
    societies = list(csv.DictReader(f))

print(f"📊 {len(societies)} SDG chargées")

# Generate template rows
rows = []
no_siren_count = 0

for soc in societies:
    siren = extract_siren(soc)
    if not siren:
        no_siren_count += 1

    aum = soc.get('aum', '')
    rows.append({
        'company_name': soc['name'],
        'siren': siren or 'N/A',
        'phone': soc.get('phone', ''),
        'website': soc.get('website', ''),
        'aum_mde': aum,
        'dirigeant_prenom': '',
        'dirigeant_nom': '',
        'dirigeant_email': '',
        'dirigeant_fonction': '',
        'dirigeant_telephone': '',
        'linkedin_url': '',
        'source': '',
        'notes': ''
    })

# Save template
with open(OUTPUT_MANUAL, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=[
        'company_name', 'siren', 'phone', 'website', 'aum_mde',
        'dirigeant_prenom', 'dirigeant_nom', 'dirigeant_email',
        'dirigeant_fonction', 'dirigeant_telephone',
        'linkedin_url', 'source', 'notes'
    ])
    writer.writeheader()
    writer.writerows(rows)

print(f"✅ {len(rows)} lignes générées")
print(f"📁 {OUTPUT_MANUAL}")

if no_siren_count:
    print(f"\n⚠️  {no_siren_count} SDG sans SIREN identifié")

print("\n" + "="*70)
print("📋 INSTRUCTIONS ENRICHISSEMENT MANUEL")
print("="*70)
print("""
Pour chaque ligne du fichier CSV:

1. Utiliser le SIREN pour rechercher sur:
   • https://www.pappers.fr/entreprise/[siren]
   • https://www.infogreffe.fr/ (recherche par nom ou SIREN)
   • https://www.societe.com/
   • LinkedIn (rechercher "[Nom société] dirigeant")

2. Remplir les colonnes:
   • dirigeant_prenom: Prénom du dirigeant
   • dirigeant_nom: Nom du dirigeant
   • dirigeant_fonction: Président / Directeur Général / Gérant
   • dirigeant_email: Email si disponible
   • dirigeant_telephone: Téléphone direct si disponible
   • linkedin_url: URL profil LinkedIn si trouvé
   • source: Site où l'info a été trouvée
   • notes: Informations complémentaires

3. Priorités:
   • SDG avec AUM (Assets Under Management) > 0.5 Md€
   • SDG sans email/téléphone dans les colonnes initiales
   • SDG dans votre région/secteur cible

4. Une fois complété:
   • Fusionner avec les contacts existants
   • Importer dans le CRM via scripts/import_sdg_clients.py
""")

print("💡 Pour import Pappers en masse (25€/mois):")
print("   1. Créer compte: https://www.pappers.fr/api")
print("   2. Copier token API")
print("   3. Utiliser: scripts/extract_dirigeants_pappers_only.py")
