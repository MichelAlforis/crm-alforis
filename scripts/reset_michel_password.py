#!/usr/bin/env python3
"""
Script pour réinitialiser le mot de passe de michel.marques@alforis.fr
Usage: python scripts/reset_michel_password.py <nouveau_mot_de_passe>
"""
import sys
import os

# Ajouter le dossier parent au path pour importer les modules du backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'crm-backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
from passlib.context import CryptContext

# Configuration de la DB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crm_user:crm_password@localhost:5432/crm_db")

# Context pour hasher les mots de passe (même config que FastAPI)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_password(email: str, new_password: str):
    """Réinitialise le mot de passe d'un utilisateur"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"❌ Utilisateur {email} introuvable")
            return False

        # Hasher le nouveau mot de passe
        hashed_password = pwd_context.hash(new_password)

        # Mettre à jour
        user.hashed_password = hashed_password
        db.commit()

        print(f"✅ Mot de passe réinitialisé pour {email} (ID={user.id})")
        print(f"   Username: {user.username}")
        print(f"   Nouveau mot de passe: {new_password}")
        return True

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/reset_michel_password.py <nouveau_mot_de_passe>")
        print("Exemple: python scripts/reset_michel_password.py TempPass123!")
        sys.exit(1)

    new_password = sys.argv[1]

    if len(new_password) < 8:
        print("❌ Le mot de passe doit faire au moins 8 caractères")
        sys.exit(1)

    reset_password("michel.marques@alforis.fr", new_password)
