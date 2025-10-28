#!/usr/bin/env python3
"""
Script d'import des 677 SDG clients dans le CRM

Usage:
    python scripts/import_sdg_clients.py

Étapes:
1. Importer les 677 organisations SDG (type=client)
2. Importer les contacts disponibles (8 personnes)
3. Créer les liens organisation-personne

Fichiers requis:
- SDG_677_IMPORT_FINAL.csv
- sdg_people_import.csv (si disponible)
"""

import csv
import requests
import sys
import time
from pathlib import Path
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None  # À renseigner si authentification requise

# Chemins fichiers
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT
SDG_FILE = DATA_DIR / "SDG_677_IMPORT_FINAL.csv"
PEOPLE_FILE = DATA_DIR / "SDG_CONTACTS_8_PERSONNES.csv"

# Headers HTTP
def get_headers():
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    return headers


def load_sdg_organisations(filepath: Path) -> List[Dict[str, Any]]:
    """Charge les 677 organisations SDG depuis le CSV"""
    print(f"\n📥 Chargement des organisations depuis {filepath}...")

    organisations = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convertir AUM en float (si présent)
            aum_value = None
            aum_date = None
            if row.get('aum') and row['aum'].strip():
                try:
                    aum_value = float(row['aum'])
                    aum_date = row.get('aum_date', '2024-12-31')
                except ValueError:
                    pass

            # Créer payload organisation
            org = {
                "name": row['name'],
                "type": "client",  # SDG = clients d'Alforis
                "category": row.get('category', 'SDG'),
                "email": row.get('email') or None,
                "phone": row.get('phone') or None,
                "website": row.get('website') or None,
                "address": row.get('address') or None,
                "city": row.get('city') or None,
                "postal_code": row.get('postal_code') or None,
                "country": row.get('country', 'France'),
                "country_code": row.get('country_code', 'FR'),
                "notes": row.get('notes') or None,
                "aum": aum_value,
                "aum_date": aum_date,
                "pipeline_stage": row.get('pipeline_stage', 'prospect'),
                "is_active": True,
            }

            # Filtrer None values
            org = {k: v for k, v in org.items() if v is not None}
            organisations.append(org)

    print(f"✅ {len(organisations)} organisations chargées")
    return organisations


def load_people(filepath: Path) -> List[Dict[str, Any]]:
    """Charge les contacts depuis le CSV"""
    if not filepath.exists():
        print(f"⚠️  Fichier contacts introuvable: {filepath}")
        return []

    print(f"\n📥 Chargement des contacts depuis {filepath}...")

    people = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            person = {
                "first_name": row['first_name'],
                "last_name": row['last_name'],
                "personal_email": row.get('personal_email') or None,
                "phone": row.get('phone') or None,
                "country_code": row.get('country_code', 'FR'),
                "language": row.get('language', 'FR'),
            }
            # Filtrer None values
            person = {k: v for k, v in person.items() if v is not None}
            people.append(person)

    print(f"✅ {len(people)} contacts chargés")
    return people


def bulk_import_organisations(organisations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Import bulk des organisations via API"""
    print(f"\n🚀 Import de {len(organisations)} organisations SDG clients...")

    url = f"{API_BASE_URL}/imports/organisations/bulk?type_org=client"

    try:
        response = requests.post(
            url,
            json=organisations,
            headers=get_headers(),
            timeout=300  # 5 min timeout
        )
        response.raise_for_status()
        result = response.json()

        print(f"✅ Résultat import organisations:")
        print(f"   Total: {result.get('total', 0)}")
        print(f"   Créés: {len(result.get('created', []))}")
        print(f"   Échecs: {result.get('failed', 0)}")

        if result.get('errors'):
            print(f"\n⚠️  {len(result['errors'])} erreurs détectées:")
            for error in result['errors'][:10]:  # Afficher 10 premières erreurs
                print(f"   - Ligne {error.get('row')}: {error.get('error')}")
            if len(result['errors']) > 10:
                print(f"   ... et {len(result['errors']) - 10} autres erreurs")

        return result

    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur lors de l'import: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Réponse serveur: {e.response.text}")
        sys.exit(1)


def bulk_import_people(people: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Import bulk des personnes via API"""
    if not people:
        print("\n⚠️  Aucun contact à importer")
        return {"total": 0, "created": [], "failed": 0, "errors": []}

    print(f"\n🚀 Import de {len(people)} contacts...")

    url = f"{API_BASE_URL}/imports/people/bulk"

    try:
        response = requests.post(
            url,
            json=people,
            headers=get_headers(),
            timeout=60
        )
        response.raise_for_status()
        result = response.json()

        print(f"✅ Résultat import contacts:")
        print(f"   Total: {result.get('total', 0)}")
        print(f"   Créés: {len(result.get('created', []))}")
        print(f"   Échecs: {result.get('failed', 0)}")

        if result.get('errors'):
            print(f"\n⚠️  {len(result['errors'])} erreurs détectées:")
            for error in result['errors']:
                print(f"   - Ligne {error.get('row')}: {error.get('error')}")

        return result

    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur lors de l'import: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Réponse serveur: {e.response.text}")
        sys.exit(1)


def create_org_person_links():
    """
    Créer les liens entre organisations et personnes

    Note: Nécessite de connaître les IDs créés ou d'utiliser un endpoint
    de création de liens par nom/email
    """
    print("\n⚠️  Création des liens organisation-personne à implémenter manuellement")
    print("   Utiliser l'endpoint: POST /api/v1/org-links/bulk")
    print("   Ou créer les liens depuis l'interface CRM")


def main():
    print("="*70)
    print("🚀 IMPORT SDG CLIENTS DANS LE CRM")
    print("="*70)

    # Vérifier que les fichiers existent
    if not SDG_FILE.exists():
        print(f"❌ Fichier SDG introuvable: {SDG_FILE}")
        print(f"   Assurez-vous d'être dans le bon répertoire")
        sys.exit(1)

    # 1. Charger les données
    organisations = load_sdg_organisations(SDG_FILE)
    people = load_people(PEOPLE_FILE)

    # 2. Importer les organisations
    print(f"\n{'='*70}")
    print("ÉTAPE 1: Import des 677 organisations SDG")
    print(f"{'='*70}")
    org_result = bulk_import_organisations(organisations)

    # Pause pour laisser le serveur respirer
    time.sleep(2)

    # 3. Importer les personnes
    print(f"\n{'='*70}")
    print("ÉTAPE 2: Import des contacts")
    print(f"{'='*70}")
    people_result = bulk_import_people(people)

    # 4. Créer les liens (manuel pour l'instant)
    print(f"\n{'='*70}")
    print("ÉTAPE 3: Liens organisation-personne")
    print(f"{'='*70}")
    create_org_person_links()

    # Résumé final
    print(f"\n{'='*70}")
    print("📊 RÉSUMÉ FINAL")
    print(f"{'='*70}")
    print(f"Organisations créées: {len(org_result.get('created', []))} / {org_result.get('total', 0)}")
    print(f"Contacts créés: {len(people_result.get('created', []))} / {people_result.get('total', 0)}")
    print(f"\n✅ Import terminé!")

    if org_result.get('errors') or people_result.get('errors'):
        print(f"\n⚠️  Des erreurs ont été détectées. Consultez les logs ci-dessus.")
        sys.exit(1)


if __name__ == "__main__":
    # Vérifier que le serveur API est accessible
    try:
        response = requests.get(f"{API_BASE_URL.replace('/api/v1', '')}/health", timeout=5)
        if response.status_code != 200:
            print(f"⚠️  Le serveur API ne semble pas accessible sur {API_BASE_URL}")
            print(f"   Assurez-vous que le backend est démarré")
            sys.exit(1)
    except requests.exceptions.RequestException:
        print(f"❌ Impossible de contacter le serveur API sur {API_BASE_URL}")
        print(f"   Démarrez le backend avec: cd crm-backend && source .venv/bin/activate && uvicorn main:app --reload")
        sys.exit(1)

    main()
