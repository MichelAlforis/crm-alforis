#!/usr/bin/env python3
"""
Script pour créer le test user pour les tests E2E Playwright
Usage: python create_test_user.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from core.security import hash_password


def create_test_user():
    """Crée le test user test@alforis.fr avec password test123"""

    # Get DB URL from environment
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://crm_user:crm_test_password@localhost:5432/crm_test"
    )

    print(f"📊 Connecting to database...")
    engine = create_engine(database_url)

    # Hash the password using the same method as the backend
    hashed_password = hash_password("test123")
    print(f"🔐 Password hashed: {hashed_password[:20]}...")

    # Create user
    with engine.connect() as conn:
        # Check if user already exists
        result = conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": "test@alforis.fr"}
        )
        existing_user = result.fetchone()

        if existing_user:
            print(f"✅ Test user already exists (ID: {existing_user[0]})")
            return

        # Insert user
        conn.execute(
            text("""
                INSERT INTO users (email, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
                VALUES (:email, :hashed_password, :full_name, :is_active, :is_superuser, :created_at, :updated_at)
            """),
            {
                "email": "test@alforis.fr",
                "hashed_password": hashed_password,
                "full_name": "Test User",
                "is_active": True,
                "is_superuser": False,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        )
        conn.commit()

        print(f"✅ Test user created successfully!")
        print(f"   Email: test@alforis.fr")
        print(f"   Password: test123")


if __name__ == "__main__":
    try:
        create_test_user()
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        sys.exit(1)
