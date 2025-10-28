#!/usr/bin/env python3
"""
Script standalone pour créer les tables + admin (sans dépendances du projet)
"""
import psycopg2
from psycopg2 import sql
import sys

# Configuration DB
DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "database": "crm_db",
    "user": "crm_user",
    "password": "crm_password"
}

def create_tables_and_admin():
    """Créer toutes les tables et l'utilisateur admin"""

    try:
        print("🔌 Connexion à PostgreSQL...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()

        print("🏗️  Création des tables...")

        # Table users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                full_name VARCHAR(255),
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_superuser BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("  ✅ users")

        # Table organisations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organisations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50),
                category VARCHAR(100),
                email VARCHAR(255),
                main_phone VARCHAR(20),
                website VARCHAR(255),
                country_code VARCHAR(2),
                language VARCHAR(10) DEFAULT 'FR',
                pipeline_stage VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("  ✅ organisations")

        # Table people
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS people (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                personal_email VARCHAR(255) UNIQUE,
                personal_phone VARCHAR(20),
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("  ✅ people")

        # Table person_organization_links
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS person_organization_links (
                id SERIAL PRIMARY KEY,
                person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
                organization_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
                organization_type VARCHAR(50),
                job_title VARCHAR(255),
                work_email VARCHAR(255),
                work_phone VARCHAR(20),
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("  ✅ person_organization_links")

        # Table tasks
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(50) DEFAULT 'medium',
                due_date TIMESTAMP WITH TIME ZONE,
                organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
                assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        print("  ✅ tasks")

        # Créer l'utilisateur admin
        print("\n👤 Création utilisateur admin...")

        # Hash du mot de passe "admin123" avec bcrypt
        # Pour simplifier, on utilise un hash fixe (généré avec bcrypt.hashpw(b"admin123", bcrypt.gensalt()))
        admin_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIj.vQfK4e"  # admin123

        cursor.execute("""
            INSERT INTO users (username, email, full_name, hashed_password, is_active, is_superuser)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING
            RETURNING id;
        """, ("admin", "admin@alforis.com", "Administrateur", admin_hash, True, True))

        result = cursor.fetchone()
        if result:
            print(f"  ✅ Admin créé (ID: {result[0]})")
        else:
            print("  ⚠️  Admin existe déjà")

        print("\n📊 Résumé :")

        # Compter les tables
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE';
        """)
        table_count = cursor.fetchone()[0]
        print(f"  Tables créées : {table_count}")

        # Compter les utilisateurs
        cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = cursor.fetchone()[0]
        print(f"  Utilisateurs  : {user_count}")

        print("\n✅ SUCCÈS !")
        print("\n🔐 Identifiants admin :")
        print("   Username : admin")
        print("   Password : admin123")
        print("   Email    : admin@alforis.com")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n❌ ERREUR : {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_tables_and_admin()
    sys.exit(0 if success else 1)
