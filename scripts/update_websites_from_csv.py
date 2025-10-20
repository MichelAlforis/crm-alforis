#!/usr/bin/env python3
"""
Script pour mettre à jour les websites des organisations depuis le CSV complet
"""

import csv
import sys
import os

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'crm-backend'))

from db.session import get_sync_session
from models.organisation import Organisation

CSV_FILE = "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/data/csv_archives/SDG_677_FINAL_COMPLETE_WITH_AUM.csv"

def main():
    print(f"📂 Lecture du CSV: {CSV_FILE}")

    # Lire le CSV
    updates = {}
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('name', '').strip()
            website = row.get('website', '').strip()
            if name and website:
                updates[name.upper()] = website

    print(f"✅ {len(updates)} sociétés avec website trouvées dans le CSV")

    # Mettre à jour la base
    with get_sync_session() as db:
        orgs = db.query(Organisation).all()
        print(f"📊 {len(orgs)} organisations dans la base")

        updated_count = 0
        for org in orgs:
            org_name_upper = org.nom.upper()
            if org_name_upper in updates:
                new_website = updates[org_name_upper]
                if org.website != new_website:
                    org.website = new_website
                    updated_count += 1
                    print(f"✓ {org.nom}: {new_website}")

        db.commit()
        print(f"\n✅ {updated_count} organisations mises à jour avec leur website")

if __name__ == '__main__':
    main()
