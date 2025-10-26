#!/usr/bin/env python3
"""
Script simplifié de génération de données de test pour le CRM Alforis
Usage: docker exec -i v1--api-1 python3 /app/scripts/seed_local_db_simple.py
"""

import os
import random
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values

# Configuration DB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crm_user:crm_password@postgres:5432/crm_db")

# Parse URL
# Format: postgresql://user:password@host:port/database
parts = DATABASE_URL.replace("postgresql://", "").split("@")
user_pass = parts[0].split(":")
host_port_db = parts[1].split("/")
host_port = host_port_db[0].split(":")

DB_CONFIG = {
    "dbname": host_port_db[1],
    "user": user_pass[0],
    "password": user_pass[1],
    "host": host_port[0],
    "port": host_port[1] if len(host_port) > 1 else "5432"
}

print("=" * 60)
print("🌱 SEED DATABASE - CRM ALFORIS (Simple)")
print("=" * 60)

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

try:
    # 1. Obtenir/créer user admin
    print("\n👤 Récupération utilisateur admin...")
    cur.execute("SELECT id FROM users WHERE email = 'admin@alforis.fr' OR email = 'admin@alforis.com'")
    result = cur.fetchone()
    if result:
        user_id = result[0]
        print(f"✅ User trouvé avec ID: {user_id}")
    else:
        # Si vraiment aucun user, créer un nouveau avec username unique
        import random
        username = f"admin{random.randint(1000, 9999)}"
        cur.execute("""
            INSERT INTO users (email, username, full_name, hashed_password, is_active, is_superuser, created_at, updated_at)
            VALUES ('admin@alforis.fr', %s, 'Admin Alforis', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtJ3xEiWrjGu', true, true, NOW(), NOW())
            RETURNING id
        """, (username,))
        user_id = cur.fetchone()[0]
        conn.commit()
        print(f"✅ User créé: admin@alforis.fr / admin123")

    # 2. Créer organisations
    print("\n📊 Création organisations...")
    orgs_data = [
        ("BNP Paribas Wealth Management", "Wholesale", "FR", "fr", "Paris", 5000, "https://wealthmanagement.bnpparibas"),
        ("Amundi Asset Management", "Institution", "FR", "fr", "Paris", 15000, "https://www.amundi.com"),
        ("Pictet & Cie", "SDG", "CH", "fr", "Genève", 8000, "https://www.pictet.com"),
        ("UBS Wealth Management", "SDG", "CH", "en", "Zurich", 12000, "https://www.ubs.com"),
        ("Lombard Odier", "SDG", "CH", "fr", "Genève", 3500, "https://www.lombardodier.com"),
        ("Oddo BHF", "Wholesale", "FR", "fr", "Paris", 2000, "https://www.oddo-bhf.com"),
        ("Carmignac Gestion", "Institution", "FR", "fr", "Paris", 4500, "https://www.carmignac.fr"),
        ("Edmond de Rothschild", "SDG", "CH", "fr", "Genève", 6000, "https://www.edmond-de-rothschild.com"),
        ("La Française AM", "Institution", "FR", "fr", "Paris", 1500, "https://www.la-francaise.com"),
        ("Julius Baer", "SDG", "CH", "en", "Zurich", 7500, "https://www.juliusbaer.com"),
    ]

    cur.execute("DELETE FROM organisations WHERE name LIKE '%Test%' OR name LIKE '%BNP%' OR name LIKE '%Amundi%'")

    execute_values(cur, """
        INSERT INTO organisations (name, category, country_code, language, city, aum_millions, website, is_active, created_at, updated_at)
        VALUES %s
        RETURNING id
    """, [(name, cat, cc, lang, city, aum, web, True, datetime.now(), datetime.now()) for name, cat, cc, lang, city, aum, web in orgs_data])

    org_ids = [row[0] for row in cur.fetchall()]
    conn.commit()
    print(f"✅ {len(org_ids)} organisations créées")

    # 3. Créer personnes
    print("\n👥 Création personnes...")
    people_data = [
        ("Sophie", "Dubois", "Directrice Distribution", "FR", "fr"),
        ("Jean", "Martin", "Responsable Partenariats", "FR", "fr"),
        ("Marie", "Bernard", "Analyste Senior", "FR", "fr"),
        ("Pierre", "Leroy", "Directeur Clientèle", "FR", "fr"),
        ("Thomas", "Müller", "Portfolio Manager", "CH", "de"),
        ("Anna", "Schmidt", "Head of Sales", "CH", "de"),
        ("Luca", "Rossi", "Investment Director", "CH", "it"),
        ("Emma", "Johnson", "Chief Investment Officer", "CH", "en"),
        ("François", "Moreau", "Gérant de fonds", "FR", "fr"),
        ("Claire", "Lefebvre", "Directrice Commerciale", "FR", "fr"),
        ("Nicolas", "Petit", "Responsable Produits", "FR", "fr"),
        ("Julie", "Roux", "Chargée d'affaires", "FR", "fr"),
        ("Laurent", "Garcia", "Directeur Général Adjoint", "FR", "fr"),
        ("Isabelle", "Blanc", "Responsable Conformité", "FR", "fr"),
        ("David", "Meyer", "Senior Relationship Manager", "CH", "en"),
    ]

    cur.execute("DELETE FROM people WHERE personal_email LIKE '%@example.com'")

    execute_values(cur, """
        INSERT INTO people (prenom, nom, role, country_code, language, personal_email, personal_phone, is_active, created_at, updated_at)
        VALUES %s
        RETURNING id
    """, [(fn, ln, role, cc, lang, f"{fn.lower()}.{ln.lower()}@example.com", f"+33 6 {random.randint(10,99)} {random.randint(10,99)} {random.randint(10,99)} {random.randint(10,99)}", True, datetime.now(), datetime.now())
          for fn, ln, role, cc, lang in people_data])

    people_ids = [row[0] for row in cur.fetchall()]
    conn.commit()
    print(f"✅ {len(people_ids)} personnes créées")

    # 4. Créer rattachements personnes-organisations
    print("\n🔗 Création rattachements...")
    links_count = 0
    for person_id in people_ids:
        # 1-2 organisations aléatoires par personne
        num_orgs = random.randint(1, 2)
        selected_orgs = random.sample(org_ids, num_orgs)

        for idx, org_id in enumerate(selected_orgs):
            cur.execute("""
                INSERT INTO person_organization_links
                (person_id, organisation_id, organization_type, role, is_primary, job_title, created_at, updated_at)
                VALUES (%s, %s, 'client', 'contact_principal', %s, 'Manager', NOW(), NOW())
            """, (person_id, org_id, idx == 0))
            links_count += 1

    conn.commit()
    print(f"✅ {links_count} rattachements créés")

    # 5. Créer tâches
    print("\n📋 Création tâches...")
    tasks_data = [
        ("Relancer BNP Paribas", "Envoyer relance pour présentation fonds", "relance", "haute", "todo", 2),
        ("Préparer pitch Amundi", "Créer présentation personnalisée", "pitch", "haute", "doing", 5),
        ("Appel suivi Pictet", "Point sur la due diligence", "due_diligence", "moyenne", "todo", 3),
        ("Documentation UBS", "Transmettre KIID et prospectus", "admin", "haute", "todo", 1),
        ("RDV Lombard Odier", "Présentation trimestrielle Q1", "rdv", "haute", "todo", 7),
    ]

    cur.execute("DELETE FROM tasks WHERE title LIKE '%BNP%' OR title LIKE '%Amundi%'")

    for i, (title, desc, cat, priority, status, days_offset) in enumerate(tasks_data):
        due_date = datetime.now() + timedelta(days=days_offset)
        org_id = org_ids[i % len(org_ids)]
        person_id = people_ids[i % len(people_ids)] if i % 2 == 1 else None

        cur.execute("""
            INSERT INTO tasks
            (title, description, category, priority, status, due_date, assigned_to_id, organisation_id, person_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (title, desc, cat, priority, status, due_date, user_id, org_id, person_id))

    conn.commit()
    print(f"✅ {len(tasks_data)} tâches créées")

    print("\n" + "=" * 60)
    print("✅ BASE DE DONNÉES PEUPLÉE AVEC SUCCÈS !")
    print("=" * 60)
    print(f"\n📊 Résumé:")
    print(f"   - Organisations: {len(org_ids)}")
    print(f"   - Personnes: {len(people_ids)}")
    print(f"   - Rattachements: {links_count}")
    print(f"   - Tâches: {len(tasks_data)}")
    print(f"   - User: admin@alforis.fr / admin123")
    print("\n🚀 Vous pouvez maintenant tester l'application:")
    print(f"   - Frontend: http://localhost:3010")
    print(f"   - API: http://localhost:8000/docs")

except Exception as e:
    print(f"\n❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
    exit(1)
finally:
    cur.close()
    conn.close()
