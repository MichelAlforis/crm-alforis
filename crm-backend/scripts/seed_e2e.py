#!/usr/bin/env python3
"""
Script de seed idempotent pour les tests E2E Playwright
Crée les données minimales requises : user, organisation, team, roles

Usage: python scripts/seed_e2e.py
"""
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text  # noqa: E402

from core.security import hash_password  # noqa: E402


def seed_e2e_data():
    """Crée les données E2E de manière idempotente"""

    # Get DB URL from environment
    database_url = os.getenv(
        "DATABASE_URL", "postgresql://crm_user:crm_test_password@localhost:5432/crm_test"
    )

    print("📊 Connecting to database...")
    engine = create_engine(database_url)

    with engine.connect() as conn:
        # ============================================================
        # 1. Créer un rôle par défaut (si inexistant)
        # ============================================================
        print("🎭 Creating default role...")
        result = conn.execute(
            text("SELECT id FROM roles WHERE name = :name"), {"name": "User"}
        )
        role = result.fetchone()

        if not role:
            conn.execute(
                text(
                    """
                    INSERT INTO roles (name, description, is_active, created_at, updated_at)
                    VALUES (:name, :description, :is_active, :created_at, :updated_at)
                """
                ),
                {
                    "name": "User",
                    "description": "Standard user role",
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                },
            )
            conn.commit()
            print("✅ Role 'User' created")
        else:
            print(f"✅ Role 'User' already exists (ID: {role[0]})")

        # ============================================================
        # 2. Créer une équipe par défaut (si inexistante)
        # ============================================================
        print("👥 Creating default team...")
        result = conn.execute(
            text("SELECT id FROM teams WHERE name = :name"), {"name": "E2E Test Team"}
        )
        team = result.fetchone()

        if not team:
            conn.execute(
                text(
                    """
                    INSERT INTO teams (name, description, is_active, created_at, updated_at)
                    VALUES (:name, :description, :is_active, :created_at, :updated_at)
                """
                ),
                {
                    "name": "E2E Test Team",
                    "description": "Default team for E2E tests",
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                },
            )
            conn.commit()
            # Récupérer l'ID
            result = conn.execute(
                text("SELECT id FROM teams WHERE name = :name"), {"name": "E2E Test Team"}
            )
            team = result.fetchone()
            print(f"✅ Team 'E2E Test Team' created (ID: {team[0]})")
        else:
            print(f"✅ Team 'E2E Test Team' already exists (ID: {team[0]})")

        team_id = team[0]

        # ============================================================
        # 3. Créer le test user (si inexistant)
        # ============================================================
        print("👤 Creating test user...")
        hashed_password = hash_password("test123")

        result = conn.execute(
            text("SELECT id FROM users WHERE email = :email"), {"email": "test@alforis.fr"}
        )
        existing_user = result.fetchone()

        if existing_user:
            print(f"✅ Test user already exists (ID: {existing_user[0]})")
        else:
            # Récupérer le role_id
            result = conn.execute(
                text("SELECT id FROM roles WHERE name = :name"), {"name": "User"}
            )
            role = result.fetchone()
            role_id = role[0] if role else None

            conn.execute(
                text(
                    """
                    INSERT INTO users (
                        email, hashed_password, full_name, is_active, is_superuser,
                        role_id, team_id, created_at, updated_at
                    )
                    VALUES (
                        :email, :hashed_password, :full_name, :is_active, :is_superuser,
                        :role_id, :team_id, :created_at, :updated_at
                    )
                """
                ),
                {
                    "email": "test@alforis.fr",
                    "hashed_password": hashed_password,
                    "full_name": "Test User",
                    "is_active": True,
                    "is_superuser": False,
                    "role_id": role_id,
                    "team_id": team_id,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                },
            )
            conn.commit()
            print("✅ Test user created successfully!")

        # ============================================================
        # 4. Créer une organisation de test (si inexistante)
        # ============================================================
        print("🏢 Creating test organisation...")
        result = conn.execute(
            text("SELECT id FROM organisations WHERE name = :name"),
            {"name": "Alforis E2E Test Org"},
        )
        existing_org = result.fetchone()

        if existing_org:
            print(f"✅ Test organisation already exists (ID: {existing_org[0]})")
        else:
            # Récupérer l'user_id pour owner_id
            result = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": "test@alforis.fr"},
            )
            user = result.fetchone()
            user_id = user[0] if user else None

            conn.execute(
                text(
                    """
                    INSERT INTO organisations (
                        name, type, industry, email, phone, website,
                        description, owner_id, created_by, is_active,
                        created_at, updated_at
                    )
                    VALUES (
                        :name, :type, :industry, :email, :phone, :website,
                        :description, :owner_id, :created_by, :is_active,
                        :created_at, :updated_at
                    )
                """
                ),
                {
                    "name": "Alforis E2E Test Org",
                    "type": "Client",
                    "industry": "Finance",
                    "email": "contact@alforis-test.fr",
                    "phone": "+33 1 23 45 67 89",
                    "website": "https://alforis-test.fr",
                    "description": "Organisation de test pour les tests E2E",
                    "owner_id": user_id,
                    "created_by": user_id,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                },
            )
            conn.commit()
            print("✅ Test organisation created successfully!")

        print("\n" + "=" * 60)
        print("🎉 E2E Seed completed successfully!")
        print("=" * 60)
        print("📧 Email:    test@alforis.fr")
        print("🔑 Password: test123")
        print("👥 Team:     E2E Test Team")
        print("🏢 Org:      Alforis E2E Test Org")
        print("=" * 60)


if __name__ == "__main__":
    try:
        seed_e2e_data()
    except Exception as e:
        print(f"❌ Error seeding E2E data: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
